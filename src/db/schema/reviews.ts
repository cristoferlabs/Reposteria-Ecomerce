import { mysqlTable, int, text, boolean, timestamp } from "drizzle-orm/mysql-core";
import { users } from "./users.js";
import { products } from "./catalog.js";
import { orders } from "./orders.js";

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id")
    .notNull()
    .references(() => products.id),
  customerId: int("customer_id")
    .notNull()
    .references(() => users.id),
  // Si viene de un pedido en estado "entregado", habilita el badge de compra verificada.
  orderId: int("order_id").references(() => orders.id),
  rating: int("rating").notNull(), // 1-5, se valida con zod en la capa de API
  comment: text("comment"),
  // Moderación manual antes de publicarse en el sitio.
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});
