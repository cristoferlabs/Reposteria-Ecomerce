import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { hydrateOrderForAdmin } from "@/db/queries";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http/json";

export const GET: APIRoute = async ({ params, request }) => {
  const auth = requireAdmin(request);
  if (auth.response) return auth.response;

  const [orderRow] = await db.select().from(orders).where(eq(orders.publicId, params.publicId!)).limit(1);
  if (!orderRow) return jsonError(404, "Pedido no encontrado");

  const order = await hydrateOrderForAdmin(orderRow);

  return jsonOk({ order });
};
