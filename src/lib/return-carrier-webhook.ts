import { createHmac, timingSafeEqual } from "node:crypto";

export function createReturnCarrierSignature(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyReturnCarrierSignature(body: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const supplied = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = createReturnCarrierSignature(body, secret);
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
}

export function mapCarrierWebhookStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  if (["booked", "scheduled", "pickup_scheduled"].includes(normalized)) return "PICKUP_SCHEDULED";
  if (["picked_up", "collected", "in_transit"].includes(normalized)) return "PICKED_UP";
  if (["received", "warehouse_received", "delivered_to_warehouse"].includes(normalized)) return "RECEIVED";
  if (["cancelled", "canceled"].includes(normalized)) return "CANCELLED";
  return null;
}
