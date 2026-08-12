import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { deliveryPoints } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/http/json";

const updateDeliveryPointSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  zone: z.string().max(200).nullable().optional(),
  costCents: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

function parseId(raw: string | undefined): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const PATCH: APIRoute = async ({ params, request }) => {
  const auth = requireAdmin(request);
  if (auth.response) return auth.response;

  const id = parseId(params.id);
  if (!id) return jsonError(400, "Id inválido");

  const parsed = await parseJsonBody(request, updateDeliveryPointSchema);
  if (!parsed.success) return parsed.response;
  if (Object.keys(parsed.data).length === 0) return jsonError(400, "No hay campos para actualizar");

  const [result] = await db.update(deliveryPoints).set(parsed.data).where(eq(deliveryPoints.id, id));
  if (result.affectedRows === 0) return jsonError(404, "Punto de entrega no encontrado");

  const updated = await db.query.deliveryPoints.findFirst({ where: eq(deliveryPoints.id, id) });
  return jsonOk({ deliveryPoint: updated });
};

// Baja lógica (active=false) en vez de DELETE real: pedidos pasados pueden
// seguir referenciando este punto y no queremos romper esa integridad/historial.
export const DELETE: APIRoute = async ({ params, request }) => {
  const auth = requireAdmin(request);
  if (auth.response) return auth.response;

  const id = parseId(params.id);
  if (!id) return jsonError(400, "Id inválido");

  const [result] = await db.update(deliveryPoints).set({ active: false }).where(eq(deliveryPoints.id, id));
  if (result.affectedRows === 0) return jsonError(404, "Punto de entrega no encontrado");

  const updated = await db.query.deliveryPoints.findFirst({ where: eq(deliveryPoints.id, id) });
  return jsonOk({ deliveryPoint: updated });
};
