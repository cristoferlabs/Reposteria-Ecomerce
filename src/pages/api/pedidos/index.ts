import type { APIRoute } from "astro";
import { desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { orders, orderItems, orderStatusHistory, products } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/http/json";
import { calculateSubtotalCents, resolveUnitPriceCents } from "@/lib/orders/pricing";
import { isDesiredDateAllowed } from "@/lib/orders/schedule";
import { createOrderSchema } from "@/lib/orders/schemas";

export const GET: APIRoute = async ({ request }) => {
  const session = getSessionUser(request);
  if (!session) return jsonError(401, "No autenticado");

  const mine = await db.query.orders.findMany({
    where: eq(orders.customerId, session.userId),
    orderBy: [desc(orders.createdAt)],
    with: {
      items: { with: { product: true, variant: true } },
      deliveryPoint: true,
    },
  });

  return jsonOk({ orders: mine });
};

export const POST: APIRoute = async ({ request }) => {
  const session = getSessionUser(request);
  if (!session) return jsonError(401, "Debes iniciar sesión con Google para enviar una solicitud");

  const parsed = await parseJsonBody(request, createOrderSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const productIds = [...new Set(body.items.map((item) => item.productId))];
  const productRows = await db.query.products.findMany({
    where: inArray(products.id, productIds),
    with: { variants: true },
  });
  const productById = new Map(productRows.map((p) => [p.id, p]));

  const pricedItems: Array<{
    productId: number;
    variantId: number | null;
    quantity: number;
    unitPriceCents: number;
    customizationNotes: string | null;
  }> = [];

  for (const item of body.items) {
    const product = productById.get(item.productId);
    if (!product || !product.active) {
      return jsonError(400, `El producto ${item.productId} no existe o no está disponible`);
    }

    let variant = null;
    if (item.variantId !== undefined) {
      variant = product.variants.find((v) => v.id === item.variantId && v.active) ?? null;
      if (!variant) {
        return jsonError(400, `La variante ${item.variantId} no es válida para el producto ${product.name}`);
      }
    }

    if (body.isUrgent && !product.allowsUrgent) {
      return jsonError(400, `El producto "${product.name}" no admite pedidos urgentes`);
    }

    pricedItems.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      quantity: item.quantity,
      unitPriceCents: resolveUnitPriceCents(product, variant),
      customizationNotes: item.customizationNotes ?? null,
    });
  }

  const maxLeadTimeDays = Math.max(...productIds.map((id) => productById.get(id)!.leadTimeDays));
  if (!isDesiredDateAllowed(body.desiredDate, maxLeadTimeDays, body.isUrgent)) {
    return jsonError(
      400,
      `La fecha deseada requiere al menos ${maxLeadTimeDays} día(s) de anticipación, o marcar el pedido como urgente`,
    );
  }

  const subtotalCents = calculateSubtotalCents(pricedItems);
  const publicId = nanoid(10);

  const [insertedOrder] = await db
    .insert(orders)
    .values({
      publicId,
      customerId: session.userId,
      status: "solicitado",
      desiredDate: body.desiredDate,
      isUrgent: body.isUrgent,
      urgencySurchargeCents: 0,
      subtotalCents,
      totalCents: subtotalCents,
      customerNotes: body.customerNotes ?? null,
      customerPhone: body.customerPhone,
    })
    .$returningId();

  const order = await db.query.orders.findFirst({ where: eq(orders.id, insertedOrder.id) });
  if (!order) return jsonError(500, "No se pudo crear el pedido");

  await db.insert(orderItems).values(
    pricedItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      customizationNotes: item.customizationNotes,
    })),
  );

  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    fromStatus: null,
    toStatus: "solicitado",
    changedByUserId: session.userId,
  });

  return jsonOk({ order }, 201);
};
