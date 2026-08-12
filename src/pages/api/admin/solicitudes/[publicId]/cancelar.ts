import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, parseOptionalJsonBody } from "@/lib/http/json";
import { orderErrorToResponse } from "@/lib/orders/errors";
import { noteOnlySchema } from "@/lib/orders/schemas";
import { transitionOrder } from "@/lib/orders/stateMachine";

export const POST: APIRoute = async ({ params, request }) => {
  const auth = requireAdmin(request);
  if (auth.response) return auth.response;

  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, params.publicId!) });
  if (!order) return jsonError(404, "Pedido no encontrado");

  const parsed = await parseOptionalJsonBody(request, noteOnlySchema);
  if (!parsed.success) return parsed.response;

  try {
    const updated = await transitionOrder({
      orderId: order.id,
      to: "cancelado",
      actor: "admin",
      changedByUserId: auth.session.userId,
      note: parsed.data.note,
    });
    return jsonOk({ order: updated });
  } catch (error) {
    return orderErrorToResponse(error) ?? jsonError(500, "No se pudo cancelar el pedido");
  }
};
