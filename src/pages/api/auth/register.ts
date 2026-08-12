import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, type UserRole } from "@/db/schema";
import { isAdminEmail } from "@/lib/auth/admin";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/auth/schemas";
import { setSessionCookie } from "@/lib/auth/session";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/http/json";

export const POST: APIRoute = async ({ request, cookies }) => {
  const parsed = await parseJsonBody(request, registerSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const email = body.email.trim().toLowerCase();

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return jsonError(409, "Ya existe una cuenta con ese email");
  }

  const role: UserRole = isAdminEmail(email) ? "admin" : "cliente";
  const passwordHash = await hashPassword(body.password);

  const [inserted] = await db
    .insert(users)
    .values({
      googleId: null,
      email,
      name: body.name,
      avatarUrl: null,
      passwordHash,
      role,
    })
    .$returningId();

  const created = await db.query.users.findFirst({ where: eq(users.id, inserted.id) });
  if (!created) return jsonError(500, "No se pudo crear la cuenta");

  setSessionCookie(cookies, {
    userId: created.id,
    email: created.email,
    name: created.name,
    avatarUrl: created.avatarUrl,
    role: created.role,
  });

  return jsonOk({ user: { userId: created.id, email: created.email, name: created.name, role: created.role } }, 201);
};
