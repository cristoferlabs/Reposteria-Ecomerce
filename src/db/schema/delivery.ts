import { mysqlTable, int, varchar, boolean } from "drizzle-orm/mysql-core";

// Puntos de contraentrega (estaciones de tren de Lima). Editable por el admin
// desde /admin/puntos-entrega sin tocar código ni redesplegar.
export const deliveryPoints = mysqlTable("delivery_points", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // ej. "Estación San Borja"
  zone: varchar("zone", { length: 255 }), // ej. "Línea 1"
  costCents: int("cost_cents").notNull().default(0), // 0 = sin costo
  active: boolean("active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
});
