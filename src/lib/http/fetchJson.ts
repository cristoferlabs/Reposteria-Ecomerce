import type { ApiResponse } from "../../types/api";

// Contraparte cliente de jsonOk/jsonError (src/lib/http/json.ts): todo
// endpoint responde envuelto en ApiResponse<T> ({ok:true,data} |
// {ok:false,error}), así que cualquier fetch a /api/** debe desenvolverlo
// igual. Sirve tanto en <script> de cliente como en fetch server-to-server
// desde el frontmatter de una página .astro.
export async function fetchJson<T>(input: string | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);

  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    // Un endpoint que revienta sin manejar el error (excepción no capturada)
    // responde con una página de error HTML, no JSON — no dejar que eso
    // reviente el .json() del cliente con un mensaje ilegible.
    throw new Error(`El servidor respondió con un error inesperado (${res.status}).`);
  }

  if (!body.ok) {
    throw new Error(body.error);
  }
  return body.data;
}

// Para fetch server-to-server desde el frontmatter de una página .astro hacia
// una API propia: NO usar `new URL(path, Astro.url)` — Astro.url refleja el
// Host que mandó el navegador, así que detrás de un túnel (ngrok, etc.) ese
// fetch sale por la URL pública y vuelve a entrar por el túnel en vez de ir
// directo al mismo proceso. Esto es más lento, y si el túnel tiene cualquier
// problema (interstitial, timeout, límite de conexiones) la página entera se
// cae sin necesidad — el propio servidor siempre puede hablarse a sí mismo
// por localhost, sin salir a internet.
export function internalApiUrl(path: string): string {
  const port = process.env.PORT || 4321;
  return `http://localhost:${port}${path}`;
}
