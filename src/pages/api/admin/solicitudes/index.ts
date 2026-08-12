import type { APIRoute } from "astro";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http/json";

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export const GET: APIRoute = async ({ request, url }) => {
  const auth = requireAdmin(request);
  if (auth.response) return auth.response;

  const rawStatus = url.searchParams.get("status");
  if (rawStatus && !isOrderStatus(rawStatus)) {
    return jsonError(400, `Estado inválido: ${rawStatus}`);
  }
  const statusFilter: OrderStatus | null = rawStatus && isOrderStatus(rawStatus) ? rawStatus : null;

  const list = await db.query.orders.findMany({
    where: statusFilter ? eq(orders.status, statusFilter) : undefined,
    orderBy: [desc(orders.createdAt)],
    with: {
      customer: true,
      items: { with: { product: true, variant: true } },
      deliveryPoint: true,
    },
  });

  return jsonOk({ orders: list });
};
