import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, payments } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, parseOptionalJsonBody } from "@/lib/http/json";
import { orderErrorToResponse } from "@/lib/orders/errors";
import { noteOnlySchema } from "@/lib/orders/schemas";
import { transitionOrder } from "@/lib/orders/stateMachine";

const DEFAULT_NOTE = "Confirmado manualmente (solo pruebas)";

// Override manual de QA: salta el webhook real de Mercado Pago para poder
// avanzar pedidos de prueba a "pagado" mientras el sandbox de MP falla. NO
// es parte del flujo real de cobro (eso sigue siendo exclusivamente
// pagos/webhook.ts, actor "sistema") — ver stateMachine.ts para las reglas
// de transición que esto habilita.
//
// Gate de entorno: import.meta.env.DEV NO sirve acá. Se comprobó
// arrancando el build de producción real (`npm run build` + `node
// dist/server/entry.mjs`, sin nada de dev) que devuelve DEV:true igual —
// Vite congela el snapshot de las env vars del .env usado en `npm run
// build` dentro del bundle; ni process.env ni import.meta.env reflejan el
// entorno real en runtime después de eso (se probó overrideando DB_HOST por
// shell y por archivo sin rebuildear: el server siguió sirviendo el valor
// viejo del build). Por eso este chequeo tiene que ser una var propia
// (ALLOW_MANUAL_PAYMENT_CONFIRM) que sencillamente nunca debe estar en el
// .env que se usa para construir el build que se despliega — así, aunque
// alguien la setee en el panel de variables de entorno de cPanel en
// runtime, no tiene ningún efecto (mismo congelamiento, jugando a favor acá).
export const POST: APIRoute = async ({ params, request }) => {
  if (!import.meta.env.ALLOW_MANUAL_PAYMENT_CONFIRM) {
    return jsonError(404, "No encontrado");
  }

  const auth = requireAdmin(request);
  if (auth.response) return auth.response;

  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, params.publicId!) });
  if (!order) return jsonError(404, "Pedido no encontrado");

  const parsed = await parseOptionalJsonBody(request, noteOnlySchema);
  if (!parsed.success) return parsed.response;
  const note = parsed.data.note ?? DEFAULT_NOTE;

  try {
    const updated = await transitionOrder({
      orderId: order.id,
      to: "pago_inicial_confirmado",
      actor: "admin",
      changedByUserId: auth.session.userId,
      note,
    });

    // Deja un registro en payments para que PaymentSummary/el historial no
    // queden con datos faltantes al mostrar un pedido "pagado" sin ningún
    // pago real detrás — mismo patrón idempotente que pagos/webhook.ts.
    const pendingPayment = await db.query.payments.findFirst({
      where: and(eq(payments.orderId, order.id), eq(payments.type, "inicial"), eq(payments.status, "pendiente")),
    });

    const rawPayload = JSON.stringify({ manual: true, note, confirmedBy: auth.session.userId });

    if (pendingPayment) {
      await db.update(payments).set({ status: "aprobado", rawPayload }).where(eq(payments.id, pendingPayment.id));
    } else {
      await db.insert(payments).values({
        orderId: order.id,
        type: "inicial",
        // Si el salto fue directo desde "tomado" (sin pasar por elegir
        // entrega), initialPaymentCents todavía puede estar en 0 — es un
        // atajo aceptado a propósito para pruebas, no un bug.
        amountCents: order.initialPaymentCents,
        method: "otro",
        status: "aprobado",
        rawPayload,
      });
    }

    return jsonOk({ order: updated });
  } catch (error) {
    return orderErrorToResponse(error) ?? jsonError(500, "No se pudo confirmar el pago manualmente");
  }
};
