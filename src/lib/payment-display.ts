export function getPaymentStatusLabel(status?: string | null, provider?: string | null) {
  const normalizedStatus = (status ?? "").toLowerCase();
  const normalizedProvider = (provider ?? "").toLowerCase();

  if (normalizedProvider === "cash_on_delivery" || normalizedStatus === "cod_pending") {
    return "Cash on delivery";
  }
  if (normalizedProvider === "paypal" && normalizedStatus === "pending") {
    return "PayPal pending";
  }
  if (normalizedProvider === "tabby" && normalizedStatus === "pending") {
    return "Tabby pending";
  }
  if (normalizedStatus === "paid") return "Payment confirmed";
  if (normalizedStatus === "refunded") return "Refunded";
  if (normalizedStatus === "partial_refund") return "Partially refunded";
  if (normalizedStatus === "failed") return "Payment failed";
  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return "Payment cancelled";
  }
  return status ?? "Payment pending";
}

export function isPaymentComplete(status?: string | null) {
  return (status ?? "").toLowerCase() === "paid";
}
