// Constantes de marca y navegación. Centralizado acá para no hardcodear
// textos dentro de los componentes — cambiar el nombre/redes/anuncio es
// editar un solo archivo.

export const siteConfig = {
  name: "Arlet",
  tagline: "Repostería artesanal hecha a pedido",
  logoUrl: "/assets/brand/logo_arlet_transparente.png",
  announcement: "Envíos a todo Lima · Pedidos con 2-3 días de anticipación",
  whatsappNumber: "51999999999", // debe coincidir con WHATSAPP_BUSINESS_NUMBER
  social: {
    instagram: "#",
    facebook: "#",
    tiktok: "#",
  },
};

export type NavLink = {
  label: string;
  href: string;
};

/** Nav principal estilo Helias: pocas opciones reales, sin links muertos. */
export const mainNav: NavLink[] = [
  { label: "Catálogo", href: "/catalogo/tortas" },
  { label: "Acerca de", href: "/legal/sobre-nosotros" },
  { label: "Datos sobre la empresa", href: "/legal/contacto" },
];

/** Bloques del panel Tienda (apertura desde abajo, 4 piezas + ver más al catálogo). */
export const tiendaBlocks = [
  {
    name: "Cheesecake de Ciruela",
    description: "Horneado con compota artesanal de ciruela.",
    href: "/producto/cheesecake-ciruela",
    image: "/assets/products/tienda/cheesecake-ciruela.png",
  },
  {
    name: "Mousse de Café",
    description: "Porción individual, cremosa y con café.",
    href: "/catalogo/postres-individuales",
    image: "/assets/products/tienda/mousse-cafe.jpeg",
  },
  {
    name: "Pionono de Oreo",
    description: "Bizcocho enrollado con crema y galleta.",
    href: "/producto/pionono-oreo",
    image: "/assets/products/tienda/pionono-oreo.png",
  },
  {
    name: "Torta de Chocolate",
    description: "Bizcocho húmedo con ganache y fresas.",
    href: "/producto/torta-chocolate",
    image: "/assets/products/catalogo/torta-chocolate.jpg",
  },
] as const;

export const tiendaCatalogHref = "/catalogo/tortas";

/** @deprecated Usar mainNav — se mantiene vacío para no romper imports viejos. */
export const categoryNav: NavLink[] = [];

// Copy y color de acento por categoría para el hero del home
// (CategoryShowcase.astro). Vive acá, no en la base de datos, porque
// `categories` no tiene un campo de descripción/color — así el frontend no
// bloquea esperando un cambio de schema. Categorías reales sin entrada acá
// caen al fallback genérico más abajo.
export type CategoryAccent = "pink" | "gold";

export const categoryShowcase: Record<string, { tagline: string; accent: CategoryAccent }> = {
  tortas: {
    tagline: "Bizcochos húmedos y rellenos generosos, hechos el día de tu pedido.",
    accent: "pink",
  },
  "postres-individuales": {
    tagline: "Porciones para compartir, sin comprometerte a una torta entera.",
    accent: "gold",
  },
};

export const categoryShowcaseFallback = {
  tagline: "Hecho a pedido, con amor.",
  accent: "pink" as CategoryAccent,
};

// Fotos "studio" (fondo liso/transparente) para el tratamiento tipo Helias:
// producto flotando sobre la mancha de color, sin tarjeta ni sombra de
// escena. Vacío a propósito — mientras un slug no tenga entrada acá,
// CategoryShowcase.astro (y más adelante ProductCard/producto) usan la foto
// "lifestyle" normal (product.imageUrl) dentro de una tarjeta redondeada,
// que es el tratamiento que ya está en producción. Agregar una entrada acá
// es lo único que hace falta para activar el otro tratamiento en esa foto
// puntual — no requiere tocar ningún componente.
// Specs de la foto y dónde guardarla: ver ESPECIFICACION_FOTOS_PRODUCTO.md.
export const studioProductImages: Record<string, string> = {
  "torta-chocolate": "/assets/products/studio/torta-chocolate.png",
  "pionono-oreo": "/assets/products/studio/pionono-oreo.png",
  quesillo: "/assets/products/studio/quesillo.png",
};

/**
 * Fotos con fondo blanco sólido para el catálogo (JPG).
 * Evita los PNG “transparentes” que en la práctica dejan damero / fondo sucio.
 * Sin cheesecake / leche-asada / pie-moras: fotos incorrectas o con damero.
 */
export const catalogProductImages: Record<string, string> = {
  "torta-chocolate": "/assets/products/catalogo/torta-chocolate.jpg",
  "cheesecake-ciruela": "/assets/products/catalogo/cheesecake-ciruela.jpg",
  "pionono-oreo": "/assets/products/catalogo/pionono-oreo.jpg",
  quesillo: "/assets/products/catalogo/quesillo.jpg",
};

/** Materiales / ingredientes para el reverso del flip en el catálogo scroll. */
export const productMaterials: Record<string, string[]> = {
  "torta-chocolate": ["Cacao peruano", "Huevos frescos", "Mantequilla", "Azúcar rubia", "Crema de leche"],
  "cheesecake-ciruela": ["Queso crema", "Compota de ciruela", "Galleta", "Huevos", "Azúcar"],
  "pionono-oreo": ["Bizcocho de cacao", "Crema", "Galletas Oreo", "Azúcar", "Huevos"],
  quesillo: ["Leche fresca", "Huevos", "Azúcar caramelizada", "Vainilla"],
};

export const productMaterialsFallback = ["Harina", "Huevos", "Azúcar", "Mantequilla", "Hecho a pedido"];

/**
 * Textos de catálogo (descripción + qué se lleva).
 * Vive en config porque el seed es idempotente y no actualiza filas existentes.
 */
export const productCopy: Record<
  string,
  {
    description: string;
    /** Qué incluye el pedido / qué te llevás. */
    includes: string[];
  }
> = {
  "torta-chocolate": {
    description:
      "Bizcocho húmedo de cacao, ganache brillante y fresas frescas. Pensada para celebrar: llega lista para servir el día que elegís.",
    includes: [
      "Torta completa según tamaño (1 kg o 1.5 kg)",
      "Cobertura de ganache de chocolate",
      "Decoración con fresas de temporada",
      "Preparada el día de tu pedido",
    ],
  },
  "cheesecake-ciruela": {
    description:
      "La misma base cremosa del cheesecake, coronada con compota artesanal de ciruela. Un contraste dulce-ácido que se pide con anticipación.",
    includes: [
      "Cheesecake horneado",
      "Compota de ciruela preparada aparte",
      "Base de galleta",
      "Lead time de 3 días (sin opción urgente)",
    ],
  },
  "pionono-oreo": {
    description:
      "Bizcocho de cacao enrollado con crema suave y trozos de galleta Oreo. Formato alargado, fácil de porcionar y perfecto para meriendas o pedidos express.",
    includes: [
      "Pionono completo en bandeja",
      "Relleno de crema y Oreo",
      "Polvo de cacao al terminar",
      "Disponible con 1 día de anticipación",
    ],
  },
  quesillo: {
    description:
      "Clásico casero: leche, huevos y caramelo propio. Porción individual, textura firme y brillo de caramelo — el postre de siempre, hecho a pedido.",
    includes: [
      "Porción individual",
      "Caramelo de azúcar propio",
      "Listo para refrigerar y servir",
      "Ideal como complemento de mesa",
    ],
  },
};

export const footerNav = {
  atencionAlCliente: [
    { label: "Contacto", href: "/legal/contacto" },
    { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
    { label: "Seguimiento de pedido", href: "/cuenta/mis-pedidos" },
  ] satisfies NavLink[],
  info: [
    { label: "Sobre nosotros", href: "/legal/sobre-nosotros" },
    { label: "Política de privacidad", href: "/legal/privacidad" },
    { label: "Términos y condiciones", href: "/legal/terminos" },
  ] satisfies NavLink[],
};
