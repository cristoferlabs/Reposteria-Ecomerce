import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { orders, payments } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/http/json";
import { createInitialPaymentPreference } from "@/lib/mercadopago";

const bodySchema = z.object({ publicId: z.string().min(1) });

export const POST: APIRoute = async ({ request }) => {
  const session = getSessionUser(request);
  if (!session) return jsonError(401, "No autenticado");

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.success) return parsed.response;

  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, parsed.data.publicId) });
  if (!order || order.customerId !== session.userId) {
    return jsonError(404, "Pedido no encontrado");
  }
  if (order.status !== "pago_inicial_pendiente") {
    return jsonError(409, "El pedido no está listo para generar un pago");
  }

  const preference = await createInitialPaymentPreference({
    publicId: order.publicId,
    initialPaymentCents: order.initialPaymentCents,
    isFullPayment: order.deliveryMethod === "delivery_propio",
  });

  await db.insert(payments).values({
    orderId: order.id,
    type: "inicial",
    amountCents: order.initialPaymentCents,
    method: "mercado_pago",
    status: "pendiente",
    mpPreferenceId: preference.id ?? null,
  });

  return jsonOk({ initPoint: preference.init_point, preferenceId: preference.id });
};
