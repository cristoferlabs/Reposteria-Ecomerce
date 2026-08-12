import type { OrderStatus } from "../../db/schema";

// El saga no es una línea recta (ajustes_propuestos es un desvío,
// rechazado/cancelado son salidas de excepción desde varios puntos). Este
// módulo traduce los 10 OrderStatus reales a un "camino feliz" de pasos
// visuales para el stepper — es la única fuente de verdad de esa
// agrupación, para que el componente y cualquier página que lo use no
// tengan que reinventarla cada vez.

export interface StepDefinition {
  key: string;
  label: string;
  statuses: OrderStatus[];
}

export const HAPPY_PATH_STEPS: StepDefinition[] = [
  { key: "solicitado", label: "Solicitado", statuses: ["solicitado", "ajustes_propuestos"] },
  { key: "aceptado", label: "Aceptado", statuses: ["tomado"] },
  { key: "pago", label: "Pago", statuses: ["pago_inicial_pendiente", "pago_inicial_confirmado"] },
  { key: "preparacion", label: "Preparando", statuses: ["en_preparacion"] },
  { key: "listo", label: "Listo", statuses: ["listo"] },
  { key: "entregado", label: "Entregado", statuses: ["entregado"] },
];

export const EXCEPTION_STATUSES: OrderStatus[] = ["rechazado", "cancelado"];

export function isExceptionStatus(status: OrderStatus): boolean {
  return EXCEPTION_STATUSES.includes(status);
}

// Índice del paso (0-based) al que pertenece un estado del camino feliz.
// Devuelve -1 si el estado es una excepción (no pertenece a ningún paso).
export function getStepIndex(status: OrderStatus): number {
  return HAPPY_PATH_STEPS.findIndex((step) => step.statuses.includes(status));
}

interface StatusHistoryEntry {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
}

// Para un pedido rechazado/cancelado: hasta qué paso había avanzado antes de
// truncarse, buscando hacia atrás en el historial el último estado que sí
// pertenecía al camino feliz.
export function getStepIndexFromHistory(history: StatusHistoryEntry[]): number {
  for (let i = history.length - 1; i >= 0; i--) {
    const index = getStepIndex(history[i].toStatus);
    if (index !== -1) return index;
  }
  return 0;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  solicitado: "Solicitado",
  ajustes_propuestos: "Ajustes propuestos",
  tomado: "Aceptado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
  pago_inicial_pendiente: "Pago pendiente",
  pago_inicial_confirmado: "Pago confirmado",
  en_preparacion: "En preparación",
  listo: "Listo",
  entregado: "Entregado",
};

// Color de acento por estado, usado tanto por el badge como por el stepper.
export type StatusTone = "neutral" | "warning" | "success" | "danger";

export const STATUS_TONES: Record<OrderStatus, StatusTone> = {
  solicitado: "neutral",
  ajustes_propuestos: "warning",
  tomado: "neutral",
  rechazado: "danger",
  cancelado: "danger",
  pago_inicial_pendiente: "warning",
  pago_inicial_confirmado: "success",
  en_preparacion: "neutral",
  listo: "neutral",
  entregado: "success",
};
