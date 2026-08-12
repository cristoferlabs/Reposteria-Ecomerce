import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, type UserRole } from "@/db/schema";
import { isAdminEmail } from "./admin";

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

// MySQL no soporta RETURNING: para el update no hace falta releer (ya
// conocemos los valores que acabamos de fijar), y para el insert se usa
// $returningId() + una lectura de vuelta para traer la fila completa.
export async function upsertGoogleUser(profile: GoogleProfile) {
  const role: UserRole = isAdminEmail(profile.email) ? "admin" : "cliente";

  const existingByGoogleId = await db.query.users.findFirst({
    where: eq(users.googleId, profile.googleId),
  });

  if (existingByGoogleId) {
    await db
      .update(users)
      .set({ email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl, role })
      .where(eq(users.id, existingByGoogleId.id));
    return { ...existingByGoogleId, email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl, role };
  }

  // Cuenta creada primero por registro con email+contraseña: vincula el
  // googleId a esa misma fila en vez de intentar insertar un duplicado, que
  // chocaría contra el índice único de email.
  const existingByEmail = await db.query.users.findFirst({
    where: eq(users.email, profile.email),
  });

  if (existingByEmail) {
    await db
      .update(users)
      .set({ googleId: profile.googleId, name: profile.name, avatarUrl: profile.avatarUrl, role })
      .where(eq(users.id, existingByEmail.id));
    return {
      ...existingByEmail,
      googleId: profile.googleId,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      role,
    };
  }

  const [inserted] = await db
    .insert(users)
    .values({
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      role,
    })
    .$returningId();

  const created = await db.query.users.findFirst({ where: eq(users.id, inserted.id) });
  if (!created) throw new Error("No se pudo leer el usuario recién creado");
  return created;
}
