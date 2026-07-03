import "server-only";

export type ReturnCarrierAction = "SCHEDULE_PICKUP" | "CANCEL_PICKUP" | "REFRESH_STATUS";

export async function syncReturnCarrier(input: {
  action: ReturnCarrierAction;
  requestId: string;
  orderNumber: string;
  carrier?: string | null;
  trackingNo?: string | null;
  pickupStart?: Date | null;
  pickupEnd?: Date | null;
  customerName?: string;
  phone?: string;
  address?: string;
}, options?: { endpoint?: string; apiKey?: string; timeoutMs?: number }) {
  const endpoint = options?.endpoint ?? process.env.RETURN_CARRIER_API_URL;
  if (!endpoint) {
    return { status: "MANUAL_REQUIRED" as const, provider: input.carrier ?? "manual", message: "No return-carrier API is configured. Continue with manual carrier handling." };
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `return-carrier:${input.requestId}:${input.action}`,
      ...(options?.apiKey ?? process.env.RETURN_CARRIER_API_KEY ? { Authorization: `Bearer ${options?.apiKey ?? process.env.RETURN_CARRIER_API_KEY}` } : {}),
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(options?.timeoutMs ?? 15_000),
  });
  if (!response.ok) throw new Error(`Carrier API failed with status ${response.status}.`);
  const result = await response.json() as { reference?: string; trackingNo?: string; status?: string; message?: string; provider?: string };
  return {
    status: "SUCCEEDED" as const,
    provider: result.provider ?? input.carrier ?? "carrier_api",
    externalRef: result.reference,
    trackingNo: result.trackingNo,
    carrierStatus: result.status,
    message: result.message ?? "Carrier synchronization completed.",
  };
}
