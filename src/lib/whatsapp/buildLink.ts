import { formatSoles } from "@/lib/orders/pricing";
import type { DeliveryMethod } from "@/db/schema";

export interface WhatsAppOrderItem {
  productName: string;
  variantName: string | null;
  quantity: number;
  customizationNotes: string | null;
}

export interface WhatsAppOrderDetails {
  publicId: string;
  customerName: string;
  desiredDate: Date;
  isUrgent: boolean;
  deliveryMethod: DeliveryMethod | null;
  deliveryPointName: string | null;
  initialPaymentCents: number;
  finalPaymentCents: number;
  items: WhatsAppOrderItem[];
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-PE", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: "America/Lima",
});

function formatItemLine(item: WhatsAppOrderItem): string {
  const name = item.variantName ? `${item.productName} (${item.variantName})` : item.productName;
  const line = `- ${item.quantity}x ${name}`;
  return item.customizationNotes ? `${line} — ${item.customizationNotes}` : line;
}

function formatDeliveryLine(order: WhatsAppOrderDetails): string {
  if (order.deliveryMethod === "contraentrega") {
    return `Entrega: contraentrega en ${order.deliveryPointName ?? "punto por confirmar"}`;
  }
  if (order.deliveryMethod === "delivery_propio") {
    return "Entrega: delivery propio del cliente";
  }
  return "Entrega: por definir";
}

export function buildOrderWhatsAppMessage(order: WhatsAppOrderDetails): string {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  const lines = [
    `Hola! Soy ${order.customerName}, quisiera confirmar mi pedido *${order.publicId}*.`,
    "",
    "Detalle:",
    ...order.items.map(formatItemLine),
    "",
    `Fecha deseada: ${DATE_FORMATTER.format(order.desiredDate)}${order.isUrgent ? " (urgente)" : ""}`,
    formatDeliveryLine(order),
    "",
    `Pago inicial confirmado: ${formatSoles(order.initialPaymentCents)}`,
  ];

  if (order.finalPaymentCents > 0) {
    lines.push(`Saldo pendiente (contraentrega): ${formatSoles(order.finalPaymentCents)}`);
  }

  if (siteUrl) {
    lines.push("", `Detalle completo: ${siteUrl}/pedido/estado/${order.publicId}`);
  }

  return lines.join("\n");
}

export function buildOrderWhatsAppLink(order: WhatsAppOrderDetails): string {
  const number = import.meta.env.WHATSAPP_BUSINESS_NUMBER;
  const message = buildOrderWhatsAppMessage(order);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
