import { jsonError } from "@/lib/http/json";

export class OrderNotFoundError extends Error {
  constructor(id: number | string) {
    super(`Pedido no encontrado: ${id}`);
    this.name = "OrderNotFoundError";
  }
}

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string, actor: string) {
    super(`Transición inválida de "${from}" a "${to}" para actor "${actor}"`);
    this.name = "InvalidTransitionError";
  }
}

// El estado del pedido cambió entre que se leyó y se intentó actualizar
// (dos requests concurrentes). El caller debe responder 409 y pedir refrescar.
export class ConcurrentModificationError extends Error {
  constructor(id: number | string) {
    super(`El pedido ${id} fue modificado por otra solicitud, refresca e intenta de nuevo`);
    this.name = "ConcurrentModificationError";
  }
}

// Traduce los errores de dominio de pedidos a una respuesta HTTP consistente,
// para no repetir este mapeo en cada endpoint.
export function orderErrorToResponse(error: unknown): Response | null {
  if (error instanceof OrderNotFoundError) return jsonError(404, error.message);
  if (error instanceof InvalidTransitionError) return jsonError(409, error.message);
  if (error instanceof ConcurrentModificationError) return jsonError(409, error.message);
  return null;
}
