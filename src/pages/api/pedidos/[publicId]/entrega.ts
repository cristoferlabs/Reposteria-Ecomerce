import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, deliveryPoints } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/http/json";
import { orderErrorToResponse } from "@/lib/orders/errors";
import {
  calculateFinalPaymentCents,
  calculateInitialPaymentCents,
  calculateTotalCents,
} from "@/lib/orders/pricing";
import { chooseDeliverySchema } from "@/lib/orders/schemas";
import { transitionOrder } from "@/lib/orders/stateMachine";

export const POST: APIRoute = async ({ params, request }) => {
  const session = getSessionUser(request);
  if (!session) return jsonError(401, "No autenticado");

  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, params.publicId!) });
  if (!order || order.customerId !== session.userId) {
    return jsonError(404, "Pedido no encontrado");
  }

  const parsed = await parseJsonBody(request, chooseDeliverySchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  let deliveryPointId: number | null = null;
  let deliveryCostCents = 0;

  if (body.deliveryMethod === "contraentrega") {
    const point = await db.query.deliveryPoints.findFirst({
      where: eq(deliveryPoints.id, body.deliveryPointId),
    });
    if (!point || !point.active) {
      return jsonError(400, "El punto de entrega elegido no está disponible");
    }
    deliveryPointId = point.id;
    deliveryCostCents = point.costCents;
  }

  const totalCents = calculateTotalCents({
    subtotalCents: order.subtotalCents,
    urgencySurchargeCents: order.urgencySurchargeCents,
    deliveryCostCents,
  });
  const initialPaymentCents = calculateInitialPaymentCents(totalCents, body.deliveryMethod);
  const finalPaymentCents = calculateFinalPaymentCents(totalCents, initialPaymentCents, body.deliveryMethod);

  try {
    const updated = await transitionOrder({
      orderId: order.id,
      to: "pago_inicial_pendiente",
      actor: "cliente",
      changedByUserId: session.userId,
      patch: {
        deliveryMethod: body.deliveryMethod,
        deliveryPointId,
        deliveryCostCents,
        totalCents,
        initialPaymentCents,
        finalPaymentCents,
      },
    });
    return jsonOk({ order: updated });
  } catch (error) {
    return orderErrorToResponse(error) ?? jsonError(500, "No se pudo registrar la modalidad de entrega");
  }
};
