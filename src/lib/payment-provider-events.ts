import "server-only";

import { prisma } from "./prisma";

function compactPayload(payload: unknown) {
  if (payload === undefined) return undefined;
  try {
    const value = JSON.stringify(payload);
    return value.length > 12000 ? `${value.slice(0, 12000)}...` : value;
  } catch {
    return undefined;
  }
}

export async function recordPaymentProviderEvent(input: {
  provider: string;
  providerEventId: string;
  eventType: string;
  orderId?: string | null;
  orderNumber?: string | null;
  paymentRef?: string | null;
  severity?: "INFO" | "WARN" | "ERROR";
  status?: "RECEIVED" | "PROCESSED" | "FAILED" | "ACTION_REQUIRED";
  message?: string | null;
  payload?: unknown;
  occurredAt?: Date;
  processedAt?: Date | null;
}) {
  return prisma.paymentProviderEvent.upsert({
    where: {
      provider_providerEventId: {
        provider: input.provider,
        providerEventId: input.providerEventId,
      },
    },
    create: {
      provider: input.provider,
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      orderId: input.orderId ?? undefined,
      orderNumber: input.orderNumber ?? undefined,
      paymentRef: input.paymentRef ?? undefined,
      severity: input.severity ?? "INFO",
      status: input.status ?? "RECEIVED",
      message: input.message ?? undefined,
      payload: compactPayload(input.payload),
      occurredAt: input.occurredAt ?? new Date(),
      processedAt: input.processedAt ?? undefined,
    },
    update: {
      orderId: input.orderId ?? undefined,
      orderNumber: input.orderNumber ?? undefined,
      paymentRef: input.paymentRef ?? undefined,
      severity: input.severity ?? undefined,
      status: input.status ?? undefined,
      message: input.message ?? undefined,
      payload: input.payload === undefined ? undefined : compactPayload(input.payload),
      processedAt: input.processedAt ?? undefined,
    },
  });
}
