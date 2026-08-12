import { Payment } from "mercadopago";
import { mpConfig } from "./client";

export async function fetchMpPayment(paymentId: string) {
  const payment = new Payment(mpConfig);
  return payment.get({ id: paymentId });
}
