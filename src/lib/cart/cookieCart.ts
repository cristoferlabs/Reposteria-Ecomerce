// Carrito pre-checkout: vive en una cookie NO firmada, legible por JS del
// cliente (httpOnly: false) porque solo contiene product/variant ids y
// cantidades — sin precios ni datos sensibles. El precio real siempre se
// recalcula server-side en POST /api/pedidos a partir de la base de datos,
// así que un usuario "editando" esta cookie a mano no logra nada.
//
// Nota de alcance: este archivo vive en src/lib/ (normalmente terreno de la
// sesión de backend) porque el carrito es estado de UI pre-pedido, no lógica
// de negocio del saga — ver README.md.

export interface CartItem {
  productId: number;
  variantId: number | null;
  quantity: number;
  customizationNotes: string | null;
}

export const CART_COOKIE_NAME = "da_cart";
export const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 días

export function parseCart(raw: string | undefined | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof item.productId === "number" &&
        typeof item.quantity === "number" &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function serializeCart(items: CartItem[]): string {
  return JSON.stringify(items);
}

export function readCartFromDocument(): CartItem[] {
  if (typeof document === "undefined") return [];
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${CART_COOKIE_NAME}=`));
  if (!match) return [];
  const raw = decodeURIComponent(match.slice(CART_COOKIE_NAME.length + 1));
  return parseCart(raw);
}

export function writeCartToDocument(items: CartItem[]): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(serializeCart(items));
  document.cookie = `${CART_COOKIE_NAME}=${value}; path=/; max-age=${CART_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearCartInDocument(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CART_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
