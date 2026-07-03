export const returnRequestStatuses = [
  "PENDING",
  "AWAITING_CUSTOMER",
  "APPROVED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "RECEIVED",
  "INSPECTED",
  "REFUND_PROCESSING",
  "REPLACEMENT_CREATED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const;

export type ReturnRequestStatus = (typeof returnRequestStatuses)[number];

const transitions: Record<ReturnRequestStatus, readonly ReturnRequestStatus[]> = {
  PENDING: ["AWAITING_CUSTOMER", "APPROVED", "REJECTED", "CANCELLED"],
  AWAITING_CUSTOMER: ["PENDING", "CANCELLED"],
  APPROVED: ["AWAITING_CUSTOMER", "PICKUP_SCHEDULED", "REJECTED", "CANCELLED"],
  PICKUP_SCHEDULED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["RECEIVED"],
  RECEIVED: ["INSPECTED"],
  INSPECTED: ["REPLACEMENT_CREATED", "REFUND_PROCESSING", "COMPLETED"],
  REFUND_PROCESSING: ["COMPLETED"],
  REPLACEMENT_CREATED: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function getReturnRequestTransitions(status: string, resolution?: string) {
  const next = transitions[status as ReturnRequestStatus] ?? [];
  return next.filter((candidate) => {
    if (candidate === "REPLACEMENT_CREATED") return resolution === "EXCHANGE";
    if (candidate === "REFUND_PROCESSING") return resolution === "RETURN" || resolution === "REFUND";
    return true;
  });
}

export function canTransitionReturnRequest(from: string, to: string, resolution?: string) {
  return getReturnRequestTransitions(from, resolution).includes(to as ReturnRequestStatus);
}
