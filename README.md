# Dulce Aroma — Tienda de repostería

Astro en modo SSR (`output: "server"`) con adaptador `@astrojs/node` standalone: **un solo proceso Node sirve páginas, assets y API** — no hay backend separado ni carpetas `frontend/`/`backend/` en la raíz. La división es por responsabilidad dentro de `src/`, no por carpeta de nivel superior. Este documento existe para que esa división sea fácil de ubicar de un vistazo.

## Dos sesiones de trabajo, dos mitades del árbol

Este proyecto se construye con dos sesiones de Claude Code en paralelo: una en **backend** (datos, lógica de negocio, pagos, auth) y otra en **frontend** (layout, catálogo, home). Cada una tiene su mitad de `src/` claramente delimitada:

```
src/
├── db/               🔧 BACKEND — schema de Drizzle + cliente de conexión
│   ├── schema/          tablas: users, catalog, delivery, orders, reviews, relations
│   ├── client.ts         conexión a la base de datos (Drizzle + driver)
│   └── seed.ts           datos de prueba
│
├── lib/              🔧 BACKEND — lógica de negocio pura, sin UI
│   ├── auth/             OAuth de Google, sesión por cookie firmada, whitelist admin
│   ├── mercadopago/       Checkout Pro: preferencias, webhook
│   ├── orders/            stateMachine.ts (saga), pricing.ts, validaciones zod
│   └── whatsapp/          generador de link wa.me
│
├── pages/api/        🔧 BACKEND — endpoints HTTP (.ts, no .astro)
│   ├── auth/             login/callback/logout de Google
│   ├── pedidos/           crear solicitud, ver estado, aceptar ajustes
│   ├── admin/             revisar/tomar/rechazar solicitudes, puntos de entrega
│   └── pagos/             crear preferencia, webhook de Mercado Pago
│
├── types/            🔧 BACKEND — tipos compartidos (api.ts, env.d.ts)
│
├── components/       🎨 FRONTEND — piezas de UI reutilizables (.astro)
│   ├── layout/           Navbar, AnnouncementBar, Footer
│   ├── home/              Hero, FeaturedGrid
│   └── catalog/            ProductCard
│
├── layouts/          🎨 FRONTEND — BaseLayout.astro (envuelve todas las páginas)
│
├── pages/*.astro      🎨 FRONTEND — páginas visibles (todo lo que NO está en pages/api/)
│   ├── index.astro        home
│   ├── catalogo/[categoria].astro
│   ├── producto/[slug].astro
│   └── 404.astro
│
├── config/            🎨 FRONTEND — site.ts (marca, navegación, textos)
├── utils/              🎨 FRONTEND — helpers de presentación (ej. formateo de precio)
└── styles/             🎨 FRONTEND — global.css (tokens de Tailwind)
```

**Regla simple para saber en qué mitad estás parado:** si el archivo tiene `.astro` y no está dentro de `pages/api/`, es frontend. Si es `.ts` dentro de `db/`, `lib/`, `pages/api/` o `types/`, es backend. `astro.config.mjs`, `package.json`, `.env` y `drizzle.config.ts` son compartidos (cualquiera puede tocarlos, con cuidado).

Las páginas de frontend (`catalogo/[categoria].astro`, `producto/[slug].astro`) sí **consultan** la base de datos directamente (`import { db } from "../../db/client"`) — eso es normal en Astro SSR, no rompe la separación: frontend *lee* de `db/`, pero no *modifica* su schema ni su cliente.

## Stack

- **Framework**: Astro 7 SSR, adaptador `@astrojs/node` (standalone).
- **Estilos**: Tailwind CSS 4 (`@tailwindcss/vite`), tokens de marca en `src/styles/global.css`.
- **Base de datos**: Drizzle ORM. En migración de Turso/libSQL → **MySQL** (el hosting de Namecheap ya lo incluye vía cPanel). Ver `drizzle.config.ts` para el dialecto activo en cada momento.
- **Pagos**: Mercado Pago Checkout Pro.
- **Auth**: OAuth de Google implementado a mano (sin librerías de terceros abandonadas), sesión en cookie firmada.
- **Notificación de pedidos**: link `wa.me` pre-armado (no API de WhatsApp Business).
- **Hosting**: cPanel/Passenger en Namecheap ("Setup Node.js App"), Node 18–24.

## Comandos

```
npm run dev          # servidor de desarrollo
npm run build         # build de producción (dist/)
npm run check          # type-check de todo el proyecto (Astro + TS)
npm run db:generate     # genera migración a partir del schema
npm run db:migrate       # aplica migraciones a la base configurada en .env
npm run db:seed           # siembra datos de prueba (NO correr sin confirmar la base primero)
```
