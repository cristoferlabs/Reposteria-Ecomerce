import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/schemas";
import { setSessionCookie } from "@/lib/auth/session";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/http/json";

// Mensaje genérico para no/existe vs contraseña incorrecta: sitio chico y
// confiable, no hace falta ser paranoico con enumeración de usuarios — pero
// sí distinguimos el caso "esta cuenta es solo de Google" porque ahí el
// mensaje genérico confundiría a alguien que nunca puso una contraseña.
const INVALID_CREDENTIALS = "Email o contraseña incorrectos";

export const POST: APIRoute = async ({ request, cookies }) => {
  const parsed = await parseJsonBody(request, loginSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const email = body.email.trim().toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (!user) return jsonError(401, INVALID_CREDENTIALS);

  if (!user.passwordHash) {
    return jsonError(401, "Esta cuenta usa Google, inicia sesión con Google");
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) return jsonError(401, INVALID_CREDENTIALS);

  setSessionCookie(cookies, {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  });

  return jsonOk({ user: { userId: user.id, email: user.email, name: user.name, role: user.role } });
};
