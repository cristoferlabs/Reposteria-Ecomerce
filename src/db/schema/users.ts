import { mysqlTable, int, varchar, text, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

export const USER_ROLES = ["cliente", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  // Nullable: una cuenta creada por registro con email+contraseña no tiene
  // Google ID. MySQL permite múltiples NULL en un índice único, así que esto
  // no rompe la unicidad para las cuentas que sí entran por Google.
  googleId: varchar("google_id", { length: 255 }).unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  // Nullable: las cuentas que solo entran por Google no tienen contraseña.
  passwordHash: varchar("password_hash", { length: 255 }),
  // Se recalcula en cada login contra ADMIN_EMAILS, no es editable por el usuario.
  role: mysqlEnum("role", USER_ROLES).notNull().default("cliente"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});
