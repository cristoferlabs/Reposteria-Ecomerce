import type { DeliveryMethod } from "@/db/schema";

export interface PricedItemInput {
  unitPriceCents: number;
  quantity: number;
}

// Precio unitario de una combinación producto+variante en céntimos.
export function resolveUnitPriceCents(
  product: { basePriceCents: number },
  variant?: { priceDeltaCents: number } | null,
): number {
  return product.basePriceCents + (variant?.priceDeltaCents ?? 0);
}

export function calculateSubtotalCents(items: PricedItemInput[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

export function calculateTotalCents(params: {
  subtotalCents: number;
  urgencySurchargeCents: number;
  deliveryCostCents: number;
}): number {
  return params.subtotalCents + params.urgencySurchargeCents + params.deliveryCostCents;
}

// contraentrega: 50% ahora, 50% contraentrega. delivery_propio: 100% ahora
// (el repostero no participa en la entrega, así que no queda saldo pendiente
// que cobrar después). Redondeo hacia arriba en el pago inicial para que el
// saldo final nunca quede por encima del total.
export function calculateInitialPaymentCents(totalCents: number, deliveryMethod: DeliveryMethod): number {
  if (deliveryMethod === "delivery_propio") return totalCents;
  return Math.ceil(totalCents / 2);
}

export function calculateFinalPaymentCents(
  totalCents: number,
  initialPaymentCents: number,
  deliveryMethod: DeliveryMethod,
): number {
  if (deliveryMethod === "delivery_propio") return 0;
  return totalCents - initialPaymentCents;
}

export function formatSoles(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}
