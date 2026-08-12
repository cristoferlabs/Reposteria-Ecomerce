import type { APIRoute } from "astro";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { deliveryPoints } from "@/db/schema";
import { jsonOk } from "@/lib/http/json";

// Público (sin login): el cliente necesita ver los puntos de contraentrega
// disponibles y su costo antes de elegir modalidad de entrega.
export const GET: APIRoute = async () => {
  const points = await db.query.deliveryPoints.findMany({
    where: eq(deliveryPoints.active, true),
    orderBy: [asc(deliveryPoints.sortOrder)],
  });
  return jsonOk({ deliveryPoints: points });
};
