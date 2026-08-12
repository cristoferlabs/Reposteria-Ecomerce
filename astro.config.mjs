// Carga .env en process.env ANTES que nada más — sin esto, arrancar con
// `npm run dev` / iniciar.bat (en vez de exportar las variables a mano en la
// terminal) deja process.env.DB_* vacío y el driver de MySQL falla con
// "Access denied for user ''@'localhost'" aunque el .env exista y esté bien.
import "dotenv/config";
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// Monolito: SSR con adaptador Node en modo standalone (un solo proceso sirve
// páginas, assets y rutas API). Pensado para desplegarse en cPanel/Passenger
// (Namecheap) vía "Setup Node.js App", que ejecuta directamente el server
// generado en dist/server/entry.mjs.
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  site: process.env.PUBLIC_SITE_URL || "https://example.com",
  vite: {
    plugins: [tailwindcss()],
    // Vite bloquea por defecto cualquier Host header que no sea localhost
    // (protección contra DNS rebinding). Al probar con un túnel (ngrok, etc.)
    // el navegador pega con un dominio distinto y Vite lo rechaza con
    // "Blocked request". Esto solo afecta al dev server (astro dev) — el
    // build de producción no pasa por acá, así que no hay riesgo real en
    // relajarlo para desarrollo.
    server: {
      allowedHosts: true,
    },
  },
});
