import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { db } from "@/db/client";
import { orders, payments } from "@/db/schema";
import { fetchMpPayment } from "@/lib/mercadopago";
import { transitionOrder } from "@/lib/orders/stateMachine";

// No usa jsonError/jsonOk a propósito: Mercado Pago solo le importa el
// status code de la respuesta, no el cuerpo.
export const POST: APIRoute = async ({ request, url }) => {
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret: import.meta.env.MP_WEBHOOK_SECRET,
      toleranceSeconds: 300,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.warn("Webhook de Mercado Pago rechazado:", error.reason);
      return new Response(null, { status: 401 });
    }
    throw error;
  }

  if (!dataId) return new Response(null, { status: 200 });

  const payment = await fetchMpPayment(dataId);
  const publicId = payment.external_reference;
  if (!publicId || payment.status !== "approved") {
    return new Response(null, { status: 200 });
  }

  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, publicId) });
  // Idempotencia: si ya no está pendiente de pago inicial (webhook duplicado,
  // reintento de MP), no hay nada más que hacer.
  if (!order || order.status !== "pago_inicial_pendiente") {
    return new Response(null, { status: 200 });
  }

  const pendingPayment = await db.query.payments.findFirst({
    where: and(eq(payments.orderId, order.id), eq(payments.type, "inicial"), eq(payments.status, "pendiente")),
  });

  if (pendingPayment) {
    await db
      .update(payments)
      .set({ status: "aprobado", mpPaymentId: String(payment.id), rawPayload: JSON.stringify(payment) })
      .where(eq(payments.id, pendingPayment.id));
  } else {
    await db.insert(payments).values({
      orderId: order.id,
      type: "inicial",
      amountCents: order.initialPaymentCents,
      method: "mercado_pago",
      status: "aprobado",
      mpPaymentId: String(payment.id),
      rawPayload: JSON.stringify(payment),
    });
  }

  await transitionOrder({
    orderId: order.id,
    to: "pago_inicial_confirmado",
    actor: "sistema",
    changedByUserId: null,
    note: "Pago inicial confirmado vía webhook de Mercado Pago",
  });

  return new Response(null, { status: 200 });
};
