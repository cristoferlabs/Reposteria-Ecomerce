// Datos de prueba para desarrollo local: categorías, productos con variantes,
// y puntos de contraentrega. Idempotente: si ya hay categorías, no hace nada
// (para poder correr `npm run db:seed` más de una vez sin duplicar filas).
//
// Los productos usan las fotos reales que ya están en public/assets/products/
// (subidas por la sesión de frontend) — no placeholders. Si agregas un
// producto nuevo acá, confirma primero que exista su imagen en esa carpeta.
//
// Se ejecuta vía ts-node (fuera de Vite/Astro), así que hay que cargar el
// .env a mano para que src/db/client.ts encuentre las credenciales de MySQL.
import "dotenv/config";
import { db } from "./client.js";
import { categories, products, productVariants, deliveryPoints } from "./schema/index.js";

function productImage(filename: string): string {
  return `/assets/products/${filename}`;
}

// MySQL no soporta RETURNING: $returningId() sí devuelve los ids generados,
// en el mismo orden que las filas insertadas, así que basta con emparejarlos
// por índice para saber qué id le tocó a cada fila.
async function seed() {
  const existing = await db.query.categories.findMany({ limit: 1 });
  if (existing.length > 0) {
    console.log("Ya hay datos en la base, seed omitido.");
    return;
  }

  const categoryRows = [
    { slug: "tortas", name: "Tortas y Pasteles", sortOrder: 0 },
    { slug: "postres-individuales", name: "Postres individuales", sortOrder: 1 },
  ];
  const insertedCategories = await db.insert(categories).values(categoryRows).$returningId();
  const categoryIdBySlug = new Map(categoryRows.map((c, i) => [c.slug, insertedCategories[i].id]));

  const tortas = categoryIdBySlug.get("tortas")!;
  const postres = categoryIdBySlug.get("postres-individuales")!;

  const productRows = [
    {
      categoryId: tortas,
      slug: "torta-chocolate",
      name: "Torta de Chocolate",
      description:
        "Bizcocho húmedo de cacao, ganache brillante y fresas frescas. Pensada para celebrar: llega lista para servir el día que elegís.",
      basePriceCents: 8000,
      imageUrl: productImage("torta-chocolate.webp"),
      leadTimeDays: 2,
      allowsUrgent: true,
      featured: true,
    },
    {
      categoryId: tortas,
      slug: "cheesecake-ciruela",
      name: "Cheesecake de Ciruela",
      description:
        "La misma base cremosa del cheesecake, coronada con compota artesanal de ciruela. Contraste dulce-ácido; se pide con anticipación.",
      basePriceCents: 7500,
      imageUrl: productImage("cheesecake-ciruela.webp"),
      leadTimeDays: 3,
      // Lleva compota de ciruela preparada aparte, no admite pedidos urgentes.
      allowsUrgent: false,
    },
    {
      categoryId: tortas,
      slug: "pie-moras",
      name: "Pie de Moras",
      description:
        "Masa quebrada dorada y relleno abundante de moras. Corte limpio, borde crocante y sabor a fruta real.",
      basePriceCents: 6500,
      imageUrl: productImage("pie-moras.webp"),
      leadTimeDays: 2,
      allowsUrgent: true,
      featured: true,
    },
    {
      categoryId: tortas,
      slug: "pionono-oreo",
      name: "Pionono de Oreo",
      description:
        "Bizcocho de cacao enrollado con crema suave y trozos de Oreo. Fácil de porcionar; ideal para meriendas o pedidos express.",
      basePriceCents: 4500,
      imageUrl: productImage("pionono-oreo.webp"),
      leadTimeDays: 1,
      allowsUrgent: true,
    },
    {
      categoryId: postres,
      slug: "quesillo",
      name: "Quesillo",
      description:
        "Clásico casero: leche, huevos y caramelo propio. Porción individual, textura firme y brillo de caramelo.",
      basePriceCents: 1200,
      imageUrl: productImage("quesillo.webp"),
      leadTimeDays: 1,
      allowsUrgent: true,
    },
  ];
  const insertedProducts = await db.insert(products).values(productRows).$returningId();
  const productIdBySlug = new Map(productRows.map((p, i) => [p.slug, insertedProducts[i].id]));

  await db.insert(productVariants).values([
    { productId: productIdBySlug.get("torta-chocolate")!, name: "1 kg", size: "1kg", priceDeltaCents: 0, sortOrder: 0 },
    {
      productId: productIdBySlug.get("torta-chocolate")!,
      name: "1.5 kg",
      size: "1.5kg",
      priceDeltaCents: 3500,
      sortOrder: 1,
    },
  ]);

  await db.insert(deliveryPoints).values([
    { name: "Estación Gamarra", zone: "Línea 1", costCents: 0, sortOrder: 0 },
    { name: "Estación Grau", zone: "Línea 1", costCents: 0, sortOrder: 1 },
    { name: "Estación Angamos", zone: "Línea 1", costCents: 500, sortOrder: 2 },
    { name: "Estación San Borja Sur", zone: "Línea 1", costCents: 500, sortOrder: 3 },
    { name: "Estación Matellini", zone: "Línea 1", costCents: 800, sortOrder: 4 },
    { name: "Estación Bayóvar", zone: "Línea 1", costCents: 800, sortOrder: 5 },
  ]);

  console.log("Seed completo: categorías, productos, variantes y puntos de entrega insertados.");
}

seed()
  .catch((error) => {
    console.error("Seed falló:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
