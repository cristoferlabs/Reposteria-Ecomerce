import type { APIRoute } from "astro";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { deliveryPoints } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/http/json";

const createDeliveryPointSchema = z.object({
  name: z.string().min(1).max(200),
  zone: z.string().max(200).optional(),
  costCents: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

// Incluye inactivos (a diferencia de GET /api/puntos-entrega, público).
export const GET: APIRoute = async ({ request }) => {
  const auth = requireAdmin(request);
  if (auth.response) return auth.response;

  const points = await db.query.deliveryPoints.findMany({ orderBy: [asc(deliveryPoints.sortOrder)] });
  return jsonOk({ deliveryPoints: points });
};

export const POST: APIRoute = async ({ request }) => {
  const auth = requireAdmin(request);
  if (auth.response) return auth.response;

  const parsed = await parseJsonBody(request, createDeliveryPointSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const [inserted] = await db
    .insert(deliveryPoints)
    .values({
      name: body.name,
      zone: body.zone ?? null,
      costCents: body.costCents,
      active: body.active,
      sortOrder: body.sortOrder,
    })
    .$returningId();

  const point = await db.query.deliveryPoints.findFirst({ where: eq(deliveryPoints.id, inserted.id) });
  if (!point) return jsonError(500, "No se pudo crear el punto de entrega");

  return jsonOk({ deliveryPoint: point }, 201);
};
