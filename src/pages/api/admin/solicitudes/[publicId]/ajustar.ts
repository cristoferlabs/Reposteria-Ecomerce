import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/http/json";
import { orderErrorToResponse } from "@/lib/orders/errors";
import { calculateTotalCents } from "@/lib/orders/pricing";
import { proposeAdjustmentsSchema } from "@/lib/orders/schemas";
import { transitionOrder } from "@/lib/orders/stateMachine";

// El admin propone condiciones distintas (típicamente un recargo por
// urgencia). El cliente debe aceptarlas explícitamente para pasar a "tomado".
export const POST: APIRoute = async ({ params, request }) => {
  const auth = requireAdmin(request);
  if (auth.response) return auth.response;

  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, params.publicId!) });
  if (!order) return jsonError(404, "Pedido no encontrado");

  const parsed = await parseJsonBody(request, proposeAdjustmentsSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  // Aún no se eligió modalidad de entrega en este punto del flujo.
  const totalCents = calculateTotalCents({
    subtotalCents: order.subtotalCents,
    urgencySurchargeCents: body.urgencySurchargeCents,
    deliveryCostCents: 0,
  });

  try {
    const updated = await transitionOrder({
      orderId: order.id,
      to: "ajustes_propuestos",
      actor: "admin",
      changedByUserId: auth.session.userId,
      note: body.adminNotes,
      patch: {
        urgencySurchargeCents: body.urgencySurchargeCents,
        adminNotes: body.adminNotes,
        totalCents,
      },
    });
    return jsonOk({ order: updated });
  } catch (error) {
    return orderErrorToResponse(error) ?? jsonError(500, "No se pudo proponer los ajustes");
  }
};
