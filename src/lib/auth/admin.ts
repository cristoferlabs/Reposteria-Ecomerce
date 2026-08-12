// Se recalcula contra ADMIN_EMAILS en cada request (no se confía en el rol
// guardado en la cookie de sesión), para que quitar un email de la whitelist
// revoque el acceso de admin sin esperar a que expire su cookie.
export function isAdminEmail(email: string): boolean {
  const raw = import.meta.env.ADMIN_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
