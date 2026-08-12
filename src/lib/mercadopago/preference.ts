import { Preference } from "mercadopago";
import { mpConfig } from "./client";

export interface CreateInitialPreferenceParams {
  publicId: string;
  initialPaymentCents: number;
  isFullPayment: boolean; // true = delivery_propio (100%), false = contraentrega (50%)
}

export async function createInitialPaymentPreference(params: CreateInitialPreferenceParams) {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  const statusUrl = `${siteUrl}/pedido/estado/${params.publicId}`;
  const label = params.isFullPayment ? "pago total" : "pago inicial (50%)";

  const preference = new Preference(mpConfig);
  return preference.create({
    body: {
      items: [
        {
          id: params.publicId,
          title: `Pedido ${params.publicId} — ${label}`,
          quantity: 1,
          currency_id: "PEN",
          unit_price: params.initialPaymentCents / 100,
        },
      ],
      external_reference: params.publicId,
      back_urls: {
        success: statusUrl,
        pending: statusUrl,
        failure: statusUrl,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/pagos/webhook`,
    },
  });
}
