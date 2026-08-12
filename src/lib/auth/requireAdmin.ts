import { jsonError } from "@/lib/http/json";
import { isAdminEmail } from "./admin";
import { getSessionUser, type SessionUser } from "./session";

type AdminAuthResult = { session: SessionUser; response?: undefined } | { session?: undefined; response: Response };

// No confía en el `role` guardado en la cookie: re-verifica el email contra
// ADMIN_EMAILS en cada request.
export function requireAdmin(request: Request): AdminAuthResult {
  const session = getSessionUser(request);
  if (!session) return { response: jsonError(401, "No autenticado") };
  if (!isAdminEmail(session.email)) return { response: jsonError(403, "No autorizado") };
  return { session };
}
