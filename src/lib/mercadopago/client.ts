import { MercadoPagoConfig } from "mercadopago";

export const mpConfig = new MercadoPagoConfig({
  accessToken: import.meta.env.MP_ACCESS_TOKEN,
});
