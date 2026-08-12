import { mysqlTable, int, varchar, text, boolean, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { users } from "./users.js";
import { products, productVariants } from "./catalog.js";
import { deliveryPoints } from "./delivery.js";

// Estados del saga. Las transiciones válidas entre estos valores viven en
// src/lib/orders/stateMachine.ts — esta tabla solo declara el conjunto posible.
export const ORDER_STATUSES = [
  "solicitado", // el cliente envió la solicitud, esperando revisión del repostero
  "ajustes_propuestos", // el repostero respondió con condiciones/precio distinto
  "tomado", // ambas partes de acuerdo, falta elegir entrega y pagar
  "rechazado", // terminal: el repostero no puede tomar el pedido
  "cancelado", // terminal: cualquiera de las partes desistió
  "pago_inicial_pendiente", // modalidad de entrega elegida, esperando pago inicial
  "pago_inicial_confirmado", // webhook de Mercado Pago confirmó el pago
  "en_preparacion",
  "listo", // alistado, listo para entrega/recojo
  "entregado", // terminal: entregado y pago final cobrado (o N/A si fue 100% adelantado)
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DELIVERY_METHODS = ["contraentrega", "delivery_propio"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  // ID no secuencial usado en URLs públicas (/pedido/estado/[publicId]) para
  // que un cliente no pueda enumerar o adivinar pedidos de otros.
  publicId: varchar("public_id", { length: 64 }).notNull().unique(),
  customerId: int("customer_id")
    .notNull()
    .references(() => users.id),
  status: mysqlEnum("status", ORDER_STATUSES).notNull().default("solicitado"),
  // Teléfono de contacto de ESTE pedido (no de la cuenta): para que el
  // repostero pueda escribir primero por WhatsApp sin depender de que el
  // cliente inicie la conversación. Nullable en DB para no romper pedidos
  // creados antes de este campo; zod lo exige en pedidos nuevos.
  customerPhone: varchar("customer_phone", { length: 20 }),

  desiredDate: timestamp("desired_date").notNull(),
  isUrgent: boolean("is_urgent").notNull().default(false),
  urgencySurchargeCents: int("urgency_surcharge_cents").notNull().default(0),

  deliveryMethod: mysqlEnum("delivery_method", DELIVERY_METHODS),
  deliveryPointId: int("delivery_point_id").references(() => deliveryPoints.id),
  // Snapshot del costo al momento de elegir el punto: si el admin cambia
  // precios después, no altera pedidos ya en curso.
  deliveryCostCents: int("delivery_cost_cents").notNull().default(0),

  subtotalCents: int("subtotal_cents").notNull(),
  totalCents: int("total_cents").notNull(),
  // 50% si es contraentrega, 100% si es delivery_propio.
  initialPaymentCents: int("initial_payment_cents").notNull().default(0),
  // 0 si delivery_propio (ya se cobró el 100% por adelantado).
  finalPaymentCents: int("final_payment_cents").notNull().default(0),
  finalPaymentCollected: boolean("final_payment_collected").notNull().default(false),

  customerNotes: text("customer_notes"),
  adminNotes: text("admin_notes"),
  rejectedReason: text("rejected_reason"),

  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id")
    .notNull()
    .references(() => orders.id),
  productId: int("product_id")
    .notNull()
    .references(() => products.id),
  variantId: int("variant_id").references(() => productVariants.id),
  quantity: int("quantity").notNull().default(1),
  // Snapshot del precio unitario al momento del pedido (independiente de
  // cambios futuros de precio del producto).
  unitPriceCents: int("unit_price_cents").notNull(),
  customizationNotes: text("customization_notes"),
});

export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id")
    .notNull()
    .references(() => orders.id),
  fromStatus: mysqlEnum("from_status", ORDER_STATUSES),
  toStatus: mysqlEnum("to_status", ORDER_STATUSES).notNull(),
  changedByUserId: int("changed_by_user_id").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const PAYMENT_TYPES = ["inicial", "final"] as const;
export const PAYMENT_METHODS = ["mercado_pago", "efectivo", "yape", "plin", "otro"] as const;
export const PAYMENT_STATUSES = ["pendiente", "aprobado", "rechazado"] as const;

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id")
    .notNull()
    .references(() => orders.id),
  type: mysqlEnum("type", PAYMENT_TYPES).notNull(),
  amountCents: int("amount_cents").notNull(),
  method: mysqlEnum("method", PAYMENT_METHODS).notNull(),
  status: mysqlEnum("status", PAYMENT_STATUSES).notNull().default("pendiente"),
  mpPreferenceId: varchar("mp_preference_id", { length: 255 }),
  mpPaymentId: varchar("mp_payment_id", { length: 255 }),
  // JSON crudo de la respuesta/notificación de Mercado Pago, para auditoría.
  rawPayload: text("raw_payload"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});
