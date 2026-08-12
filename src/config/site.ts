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

// Menú horizontal del navbar. Orden fijado por el spec de diseño.
export const categoryNav: NavLink[] = [
  { label: "Tortas", href: "/catalogo/tortas" },
  { label: "Galletas", href: "/catalogo/galletas" },
  { label: "Cupcakes", href: "/catalogo/cupcakes" },
  { label: "Brownies", href: "/catalogo/brownies" },
  { label: "Corporativo", href: "/corporativo" },
  { label: "Locales", href: "/locales" },
];

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
