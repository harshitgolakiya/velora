import "server-only";

import Stripe from "stripe";

export type ProviderRefundResult = {
  provider: string;
  providerRef?: string;
  status: "COMPLETED" | "PENDING" | "MANUAL_REQUIRED" | "PENDING_CONFIGURATION" | "FAILED";
  note: string;
};

export function mapStripeRefundStatus(status: Stripe.Refund["status"]): ProviderRefundResult["status"] {
  if (status === "succeeded") return "COMPLETED";
  if (status === "failed" || status === "canceled") return "FAILED";
  return "PENDING";
}

export async function createProviderRefund(input: {
  paymentProvider: string;
  paymentReference?: string | null;
  amount: number;
  returnRequestId: string;
  orderNumber: string;
}): Promise<ProviderRefundResult> {
  if (input.paymentProvider === "cash_on_delivery") {
    return {
      provider: "cash_on_delivery",
      status: "MANUAL_REQUIRED",
      note: "COD refund requires a verified manual payout before completion.",
    };
  }
  if (input.paymentProvider !== "stripe") {
    return {
      provider: input.paymentProvider || "manual",
      status: "MANUAL_REQUIRED",
      note: "This payment provider requires manual refund confirmation.",
    };
  }
  if (!process.env.STRIPE_SECRET_KEY || !input.paymentReference) {
    return {
      provider: "stripe",
      status: "PENDING_CONFIGURATION",
      note: "Stripe credentials or the original payment reference are unavailable.",
    };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let paymentIntent = input.paymentReference;
  if (paymentIntent.startsWith("cs_")) {
    const checkoutSession = await stripe.checkout.sessions.retrieve(paymentIntent);
    paymentIntent = typeof checkoutSession.payment_intent === "string"
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id ?? "";
  }
  if (!paymentIntent.startsWith("pi_")) {
    return {
      provider: "stripe",
      status: "PENDING_CONFIGURATION",
      note: "The original Stripe PaymentIntent could not be resolved.",
    };
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntent,
    amount: Math.round(input.amount * 100),
    metadata: { returnRequestId: input.returnRequestId, orderNumber: input.orderNumber },
  }, { idempotencyKey: `return-refund:${input.returnRequestId}` });

  return {
    provider: "stripe",
    providerRef: refund.id,
    status: mapStripeRefundStatus(refund.status),
    note: refund.status === "succeeded" ? "Stripe refund completed." : `Stripe refund status: ${refund.status ?? "pending"}.`,
  };
}
