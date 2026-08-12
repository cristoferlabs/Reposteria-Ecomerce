import type { APIRoute } from "astro";
import { getSessionUser } from "@/lib/auth";
import { jsonOk } from "@/lib/http/json";

// Usado por el frontend (Navbar, etc.) para saber si hay sesión activa sin
// tocar la cookie httpOnly directamente.
export const GET: APIRoute = async ({ request }) => {
  const session = getSessionUser(request);
  return jsonOk({ user: session });
};
