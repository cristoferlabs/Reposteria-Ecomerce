import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { hydrateOrderForCustomer } from "@/db/queries";
import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http/json";
import { buildOrderWhatsAppLink } from "@/lib/whatsapp/buildLink";

const WHATSAPP_ELIGIBLE_STATUSES = new Set([
  "pago_inicial_confirmado",
  "en_preparacion",
  "listo",
  "entregado",
]);

export const GET: APIRoute = async ({ params, request }) => {
  const session = getSessionUser(request);
  if (!session) return jsonError(401, "No autenticado");

  const publicId = params.publicId!;
  const [orderRow] = await db.select().from(orders).where(eq(orders.publicId, publicId)).limit(1);

  // 404 en vez de 403 para no revelar la existencia de pedidos ajenos.
  if (!orderRow || (orderRow.customerId !== session.userId && session.role !== "admin")) {
    return jsonError(404, "Pedido no encontrado");
  }

  const order = await hydrateOrderForCustomer(orderRow);

  const payments = order.payments.map(({ rawPayload, ...rest }) => rest);

  let whatsappLink: string | null = null;
  if (WHATSAPP_ELIGIBLE_STATUSES.has(order.status)) {
    whatsappLink = buildOrderWhatsAppLink({
      publicId: order.publicId,
      customerName: order.customer.name,
      desiredDate: order.desiredDate,
      isUrgent: order.isUrgent,
      deliveryMethod: order.deliveryMethod,
      deliveryPointName: order.deliveryPoint?.name ?? null,
      initialPaymentCents: order.initialPaymentCents,
      finalPaymentCents: order.finalPaymentCents,
      items: order.items.map((item) => ({
        productName: item.product.name,
        variantName: item.variant?.name ?? null,
        quantity: item.quantity,
        customizationNotes: item.customizationNotes,
      })),
    });
  }

  return jsonOk({ order: { ...order, payments }, whatsappLink });
};
