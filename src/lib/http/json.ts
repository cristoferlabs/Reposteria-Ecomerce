import { z } from "zod";
import type { ApiResponse } from "@/types/api";

export function jsonOk<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = { ok: true, data };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function jsonError(status: number, error: string, issues?: unknown): Response {
  const body: ApiResponse<never> = { ok: false, error, issues };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type ParseBodyResult<T> = { success: true; data: T } | { success: false; response: Response };

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<ParseBodyResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { success: false, response: jsonError(400, "El cuerpo de la solicitud no es JSON válido") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { success: false, response: jsonError(400, "Datos inválidos", z.flattenError(result.error)) };
  }
  return { success: true, data: result.data };
}

// Igual que parseJsonBody, pero un cuerpo vacío se trata como `{}` en vez de
// error — para endpoints cuyo payload es enteramente opcional (ej. cancelar
// con una nota opcional).
export async function parseOptionalJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<ParseBodyResult<T>> {
  const text = await request.text();
  let raw: unknown = {};
  if (text.trim().length > 0) {
    try {
      raw = JSON.parse(text);
    } catch {
      return { success: false, response: jsonError(400, "El cuerpo de la solicitud no es JSON válido") };
    }
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { success: false, response: jsonError(400, "Datos inválidos", z.flattenError(result.error)) };
  }
  return { success: true, data: result.data };
}
