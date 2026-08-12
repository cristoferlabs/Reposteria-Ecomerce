import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http/json";

export const GET: APIRoute = async ({ params, request }) => {
  const auth = requireAdmin(request);
  if (auth.response) return auth.response;

  const order = await db.query.orders.findFirst({
    where: eq(orders.publicId, params.publicId!),
    with: {
      customer: true,
      items: { with: { product: true, variant: true } },
      statusHistory: {
        orderBy: (h, { asc }) => [asc(h.createdAt)],
        with: { changedBy: true },
      },
      payments: true,
      deliveryPoint: true,
    },
  });

  if (!order) return jsonError(404, "Pedido no encontrado");

  return jsonOk({ order });
};
