import type { APIRoute } from "astro";
import crypto from "node:crypto";
import { buildGoogleAuthorizeUrl } from "@/lib/auth";

const STATE_COOKIE = "oauth_state";
const REDIRECT_COOKIE = "oauth_redirect";
const STATE_TTL_SECONDS = 60 * 10;

// Solo se permiten rutas relativas propias del sitio como destino post-login,
// para evitar que ?redirect= se use como open redirect.
function sanitizeRedirect(target: string | null): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return "/";
  return target;
}

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const state = crypto.randomBytes(16).toString("base64url");
  const redirectTarget = sanitizeRedirect(url.searchParams.get("redirect"));

  cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
  cookies.set(REDIRECT_COOKIE, redirectTarget, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });

  return redirect(buildGoogleAuthorizeUrl(state), 302);
};
