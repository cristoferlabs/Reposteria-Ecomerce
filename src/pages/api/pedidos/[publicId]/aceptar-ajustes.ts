import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http/json";
import { orderErrorToResponse } from "@/lib/orders/errors";
import { transitionOrder } from "@/lib/orders/stateMachine";

export const POST: APIRoute = async ({ params, request }) => {
  const session = getSessionUser(request);
  if (!session) return jsonError(401, "No autenticado");

  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, params.publicId!) });
  if (!order || order.customerId !== session.userId) {
    return jsonError(404, "Pedido no encontrado");
  }

  try {
    const updated = await transitionOrder({
      orderId: order.id,
      to: "tomado",
      actor: "cliente",
      changedByUserId: session.userId,
      note: "El cliente aceptó los ajustes propuestos",
    });
    return jsonOk({ order: updated });
  } catch (error) {
    return orderErrorToResponse(error) ?? jsonError(500, "No se pudo aceptar los ajustes");
  }
};
