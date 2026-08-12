import crypto from "node:crypto";
import type { AstroCookies } from "astro";
import type { UserRole } from "@/db/schema";

const COOKIE_NAME = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

export interface SessionUser {
  userId: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
}

interface SessionPayload extends SessionUser {
  iat: number;
  exp: number;
}

function getSecret(): string {
  const secret = import.meta.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está configurado");
  return secret;
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

function createSessionToken(user: SessionUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { ...user, iat: now, exp: now + SESSION_TTL_SECONDS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  const { userId, email, name, avatarUrl, role } = payload;
  return { userId, email, name, avatarUrl, role };
}

// Parseo manual: la cookie es un token base64url + firma, sin caracteres que
// requieran des-escapar, así que basta con partir por "; " y "=".
function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

export function getSessionUser(request: Request): SessionUser | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return verifySessionToken(cookies[COOKIE_NAME]);
}

export function setSessionCookie(cookies: AstroCookies, user: SessionUser): void {
  cookies.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: "/" });
}
