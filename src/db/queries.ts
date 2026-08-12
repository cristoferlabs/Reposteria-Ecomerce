// MariaDB (a diferencia de MySQL 8) no soporta el patrón LEFT JOIN LATERAL +
// JSON_ARRAYAGG que genera el API relacional de Drizzle (`db.query.x.findMany
// ({ with: {...} })`) para relaciones "many" — truena con ER_PARSE_ERROR en
// producción (hosting cPanel/Namecheap corre MariaDB, no MySQL). Este módulo
// reemplaza esas consultas por selects planos + joins simples, agrupados en
// JS, compatibles con ambos motores.
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "./client.js";
import { categories, products, productVariants } from "./schema/catalog.js";
import { orders, orderItems, orderStatusHistory, payments } from "./schema/orders.js";
import { deliveryPoints } from "./schema/delivery.js";
import { users } from "./schema/users.js";

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;
type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;
type StatusHistoryRow = typeof orderStatusHistory.$inferSelect;
type PaymentRow = typeof payments.$inferSelect;
type DeliveryPointRow = typeof deliveryPoints.$inferSelect;
type UserRow = typeof users.$inferSelect;

export async function attachVariants<T extends ProductRow>(
  productRows: T[],
): Promise<(T & { variants: VariantRow[] })[]> {
  if (productRows.length === 0) return [];
  const ids = productRows.map((p) => p.id);
  const variantRows = await db.select().from(productVariants).where(inArray(productVariants.productId, ids));
  const byProduct = new Map<number, VariantRow[]>();
  for (const v of variantRows) {
    const list = byProduct.get(v.productId) ?? [];
    list.push(v);
    byProduct.set(v.productId, list);
  }
  return productRows.map((p) => ({ ...p, variants: byProduct.get(p.id) ?? [] }));
}

// Categorías + sus productos activos (ordenados por destacado primero) —
// usado por CategoryTiles.astro y Navbar.astro para las fotos/listas del
// mega-menu. El schema no tiene una imagen propia por categoría todavía.
export async function loadCategoriesWithActiveProducts(): Promise<(CategoryRow & { products: ProductRow[] })[]> {
  const categoryRows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  if (categoryRows.length === 0) return [];
  const ids = categoryRows.map((c) => c.id);
  const productRows = await db
    .select()
    .from(products)
    .where(and(inArray(products.categoryId, ids), eq(products.active, true)))
    .orderBy(desc(products.featured));
  const byCategory = new Map<number, ProductRow[]>();
  for (const p of productRows) {
    const list = byCategory.get(p.categoryId) ?? [];
    list.push(p);
    byCategory.set(p.categoryId, list);
  }
  return categoryRows.map((c) => ({ ...c, products: byCategory.get(c.id) ?? [] }));
}

type ItemWithProduct = OrderItemRow & { product: ProductRow; variant: VariantRow | null };

async function loadItemsByOrder(orderIds: number[]): Promise<Map<number, ItemWithProduct[]>> {
  const byOrder = new Map<number, ItemWithProduct[]>();
  if (orderIds.length === 0) return byOrder;
  const rows = await db
    .select({ item: orderItems, product: products, variant: productVariants })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .where(inArray(orderItems.orderId, orderIds));
  for (const { item, product, variant } of rows) {
    const list = byOrder.get(item.orderId) ?? [];
    list.push({ ...item, product: product!, variant });
    byOrder.set(item.orderId, list);
  }
  return byOrder;
}

async function loadDeliveryPointsById(ids: number[]): Promise<Map<number, DeliveryPointRow>> {
  const map = new Map<number, DeliveryPointRow>();
  if (ids.length === 0) return map;
  const rows = await db.select().from(deliveryPoints).where(inArray(deliveryPoints.id, ids));
  for (const row of rows) map.set(row.id, row);
  return map;
}

async function loadCustomersById(ids: number[]): Promise<Map<number, UserRow>> {
  const map = new Map<number, UserRow>();
  if (ids.length === 0) return map;
  const rows = await db.select().from(users).where(inArray(users.id, ids));
  for (const row of rows) map.set(row.id, row);
  return map;
}

async function loadPaymentsByOrder(orderIds: number[]): Promise<Map<number, PaymentRow[]>> {
  const byOrder = new Map<number, PaymentRow[]>();
  if (orderIds.length === 0) return byOrder;
  const rows = await db.select().from(payments).where(inArray(payments.orderId, orderIds));
  for (const row of rows) {
    const list = byOrder.get(row.orderId) ?? [];
    list.push(row);
    byOrder.set(row.orderId, list);
  }
  return byOrder;
}

type StatusHistoryWithChangedBy = StatusHistoryRow & { changedBy: UserRow | null };

async function loadStatusHistoryByOrder(
  orderIds: number[],
  withChangedBy: boolean,
): Promise<Map<number, StatusHistoryWithChangedBy[]>> {
  const byOrder = new Map<number, StatusHistoryWithChangedBy[]>();
  if (orderIds.length === 0) return byOrder;

  if (!withChangedBy) {
    const rows = await db
      .select()
      .from(orderStatusHistory)
      .where(inArray(orderStatusHistory.orderId, orderIds))
      .orderBy(asc(orderStatusHistory.createdAt));
    for (const row of rows) {
      const list = byOrder.get(row.orderId) ?? [];
      list.push({ ...row, changedBy: null });
      byOrder.set(row.orderId, list);
    }
    return byOrder;
  }

  const rows = await db
    .select({ history: orderStatusHistory, changedBy: users })
    .from(orderStatusHistory)
    .leftJoin(users, eq(orderStatusHistory.changedByUserId, users.id))
    .where(inArray(orderStatusHistory.orderId, orderIds))
    .orderBy(asc(orderStatusHistory.createdAt));
  for (const { history, changedBy } of rows) {
    const list = byOrder.get(history.orderId) ?? [];
    list.push({ ...history, changedBy });
    byOrder.set(history.orderId, list);
  }
  return byOrder;
}

/** Lista de pedidos con cliente, ítems (con producto/variante) y punto de entrega — sin historial ni pagos. */
export async function hydrateOrdersList<T extends OrderRow>(orderRows: T[]) {
  if (orderRows.length === 0) return [];
  const orderIds = orderRows.map((o) => o.id);
  const customerIds = [...new Set(orderRows.map((o) => o.customerId))];
  const deliveryPointIds = [
    ...new Set(orderRows.map((o) => o.deliveryPointId).filter((id): id is number => id !== null)),
  ];

  const [itemsByOrder, customerById, deliveryPointById] = await Promise.all([
    loadItemsByOrder(orderIds),
    loadCustomersById(customerIds),
    loadDeliveryPointsById(deliveryPointIds),
  ]);

  return orderRows.map((order) => ({
    ...order,
    customer: customerById.get(order.customerId)!,
    deliveryPoint: order.deliveryPointId ? (deliveryPointById.get(order.deliveryPointId) ?? null) : null,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}

async function hydrateOrderDetail<T extends OrderRow>(orderRow: T, statusHistoryWithChangedBy: boolean) {
  const [hydratedOrder] = await hydrateOrdersList([orderRow]);
  const [statusHistoryByOrder, paymentsByOrder] = await Promise.all([
    loadStatusHistoryByOrder([orderRow.id], statusHistoryWithChangedBy),
    loadPaymentsByOrder([orderRow.id]),
  ]);
  return {
    ...hydratedOrder,
    statusHistory: statusHistoryByOrder.get(orderRow.id) ?? [],
    payments: paymentsByOrder.get(orderRow.id) ?? [],
  };
}

/** Un pedido completo para el cliente dueño: cliente, ítems, historial (sin quién lo cambió), pagos, punto de entrega. */
export function hydrateOrderForCustomer<T extends OrderRow>(orderRow: T) {
  return hydrateOrderDetail(orderRow, false);
}

/** Un pedido completo para el admin: igual que el anterior, pero el historial sí incluye quién hizo cada cambio. */
export function hydrateOrderForAdmin<T extends OrderRow>(orderRow: T) {
  return hydrateOrderDetail(orderRow, true);
}
