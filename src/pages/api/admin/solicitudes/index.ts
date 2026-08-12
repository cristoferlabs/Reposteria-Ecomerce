import type { APIRoute } from "astro";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { hydrateOrdersList } from "@/db/queries";
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

  const orderRows = await db
    .select()
    .from(orders)
    .where(statusFilter ? eq(orders.status, statusFilter) : undefined)
    .orderBy(desc(orders.createdAt));
  const list = await hydrateOrdersList(orderRows);

  return jsonOk({ orders: list });
};
