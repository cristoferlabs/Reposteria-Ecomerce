import { mysqlTable, int, varchar, text, boolean, timestamp } from "drizzle-orm/mysql-core";

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("category_id")
    .notNull()
    .references(() => categories.id),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  // Precios en céntimos (soles) para evitar errores de punto flotante con dinero.
  basePriceCents: int("base_price_cents").notNull(),
  imageUrl: text("image_url").notNull(),
  // Días de anticipación normales para preparar este producto (sin urgencia).
  leadTimeDays: int("lead_time_days").notNull().default(2),
  allowsUrgent: boolean("allows_urgent").notNull().default(true),
  // Impulsa las secciones "destacados" / "más vendidos" del home sin tabla aparte.
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id")
    .notNull()
    .references(() => products.id),
  name: varchar("name", { length: 255 }).notNull(), // ej. "1 kg - Chocolate"
  size: varchar("size", { length: 100 }),
  flavor: varchar("flavor", { length: 100 }),
  priceDeltaCents: int("price_delta_cents").notNull().default(0),
  active: boolean("active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
});
