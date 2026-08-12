import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        variantId: z.number().int().positive().optional(),
        quantity: z.number().int().positive().max(50),
        customizationNotes: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(30),
  desiredDate: z.coerce.date(),
  isUrgent: z.boolean().default(false),
  customerNotes: z.string().max(2000).optional(),
  // Teléfono de contacto de este pedido puntual (no de la cuenta), para que
  // el repostero pueda escribir primero por WhatsApp.
  customerPhone: z.string().min(6).max(20),
});

export const chooseDeliverySchema = z.discriminatedUnion("deliveryMethod", [
  z.object({
    deliveryMethod: z.literal("contraentrega"),
    deliveryPointId: z.number().int().positive(),
  }),
  z.object({
    deliveryMethod: z.literal("delivery_propio"),
  }),
]);

export const noteOnlySchema = z.object({
  note: z.string().max(1000).optional(),
});

// El recargo por urgencia/condiciones es siempre un monto que el admin
// escribe a mano caso por caso: no hay fórmula automática.
export const proposeAdjustmentsSchema = z.object({
  urgencySurchargeCents: z.number().int().min(0).default(0),
  adminNotes: z.string().min(1).max(2000),
});

export const rejectOrderSchema = z.object({
  rejectedReason: z.string().min(1).max(1000),
});

export const advanceProductionSchema = z.object({
  to: z.enum(["en_preparacion", "listo", "entregado"]),
  note: z.string().max(1000).optional(),
});

export const registerFinalPaymentSchema = z.object({
  method: z.enum(["efectivo", "yape", "plin", "otro"]),
  amountCents: z.number().int().positive().optional(),
});
