import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, payments } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/http/json";
import { registerFinalPaymentSchema } from "@/lib/orders/schemas";

// No es una transición de estado (el pedido puede seguir en "listo" o ya
// estar "entregado"): solo registra que el saldo de contraentrega se cobró
// en efectivo/Yape/Plin, algo que el admin marca a mano tras recibirlo.
export const POST: APIRoute = async ({ params, request }) => {
  const auth = requireAdmin(request);
  if (auth.response) return auth.response;

  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, params.publicId!) });
  if (!order) return jsonError(404, "Pedido no encontrado");

  if (order.deliveryMethod !== "contraentrega") {
    return jsonError(409, "Este pedido no tiene saldo pendiente de contraentrega");
  }
  if (order.finalPaymentCollected) {
    return jsonError(409, "El pago final ya fue registrado");
  }

  const parsed = await parseJsonBody(request, registerFinalPaymentSchema);
  if (!parsed.success) return parsed.response;
  const amountCents = parsed.data.amountCents ?? order.finalPaymentCents;

  const [insertedPayment] = await db
    .insert(payments)
    .values({
      orderId: order.id,
      type: "final",
      amountCents,
      method: parsed.data.method,
      status: "aprobado",
    })
    .$returningId();
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, insertedPayment.id) });

  await db.update(orders).set({ finalPaymentCollected: true, updatedAt: new Date() }).where(eq(orders.id, order.id));
  const updated = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });

  return jsonOk({ order: updated, payment });
};
