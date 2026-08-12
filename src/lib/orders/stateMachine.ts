import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderStatusHistory, type OrderStatus } from "@/db/schema";
import { ConcurrentModificationError, InvalidTransitionError, OrderNotFoundError } from "./errors";

// Quién puede disparar una transición. "sistema" = automatizado (ej. webhook
// de Mercado Pago), nunca viene de un request de usuario directamente.
export type Actor = "cliente" | "admin" | "sistema";

interface TransitionRule {
  to: OrderStatus;
  allowedActors: Actor[];
}

// Única fuente de verdad de qué transiciones son válidas. Ningún endpoint
// debe decidir esto por su cuenta.
const TRANSITIONS: Record<OrderStatus, TransitionRule[]> = {
  solicitado: [
    { to: "tomado", allowedActors: ["admin"] },
    { to: "ajustes_propuestos", allowedActors: ["admin"] },
    { to: "rechazado", allowedActors: ["admin"] },
    { to: "cancelado", allowedActors: ["cliente", "admin"] },
  ],
  ajustes_propuestos: [
    { to: "tomado", allowedActors: ["cliente"] },
    { to: "cancelado", allowedActors: ["cliente", "admin"] },
  ],
  // La "negociación" termina aquí: una vez elegida la modalidad de entrega y
  // generada la preferencia de pago, ya no se permite cancelar por API
  // (requeriría lógica de reembolso que no está definida).
  tomado: [
    { to: "pago_inicial_pendiente", allowedActors: ["cliente"] },
    { to: "cancelado", allowedActors: ["cliente", "admin"] },
  ],
  rechazado: [],
  cancelado: [],
  pago_inicial_pendiente: [{ to: "pago_inicial_confirmado", allowedActors: ["sistema"] }],
  pago_inicial_confirmado: [{ to: "en_preparacion", allowedActors: ["admin"] }],
  en_preparacion: [{ to: "listo", allowedActors: ["admin"] }],
  listo: [{ to: "entregado", allowedActors: ["admin"] }],
  entregado: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor): boolean {
  return TRANSITIONS[from].some((rule) => rule.to === to && rule.allowedActors.includes(actor));
}

export function assertTransition(from: OrderStatus, to: OrderStatus, actor: Actor): void {
  if (!canTransition(from, to, actor)) {
    throw new InvalidTransitionError(from, to, actor);
  }
}

type OrderPatch = Partial<typeof orders.$inferInsert>;

export interface TransitionOrderParams {
  orderId: number;
  to: OrderStatus;
  actor: Actor;
  changedByUserId: number | null;
  note?: string;
  /** Campos adicionales del pedido a persistir junto con el cambio de estado. */
  patch?: OrderPatch;
}

/**
 * Aplica una transición de estado de forma atómica-por-optimistic-lock: relee
 * el pedido, valida la transición, actualiza con un WHERE que exige que el
 * status siga siendo el que se leyó (evita carreras entre dos requests) y
 * registra el cambio en order_status_history.
 */
export async function transitionOrder(params: TransitionOrderParams) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, params.orderId) });
  if (!order) throw new OrderNotFoundError(params.orderId);

  assertTransition(order.status, params.to, params.actor);

  // MySQL no soporta RETURNING: el WHERE con el status leído sigue haciendo
  // de optimistic lock, pero la detección de carrera se hace vía
  // affectedRows en vez de una fila devuelta.
  const [result] = await db
    .update(orders)
    .set({ status: params.to, updatedAt: new Date(), ...params.patch })
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)));

  if (result.affectedRows === 0) throw new ConcurrentModificationError(params.orderId);

  const updated = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
  if (!updated) throw new OrderNotFoundError(params.orderId);

  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    fromStatus: order.status,
    toStatus: params.to,
    changedByUserId: params.changedByUserId,
    note: params.note ?? null,
  });

  return updated;
}
