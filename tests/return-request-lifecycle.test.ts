import { describe, expect, it } from "vitest";
import { canTransitionReturnRequest, getReturnRequestTransitions } from "@/lib/return-request-lifecycle";

describe("return request lifecycle", () => {
  it("allows controlled operational transitions", () => {
    expect(canTransitionReturnRequest("PENDING", "APPROVED", "EXCHANGE")).toBe(true);
    expect(canTransitionReturnRequest("PENDING", "AWAITING_CUSTOMER", "EXCHANGE")).toBe(true);
    expect(canTransitionReturnRequest("AWAITING_CUSTOMER", "PENDING", "EXCHANGE")).toBe(true);
    expect(canTransitionReturnRequest("APPROVED", "PICKUP_SCHEDULED", "EXCHANGE")).toBe(true);
    expect(canTransitionReturnRequest("PICKED_UP", "RECEIVED", "EXCHANGE")).toBe(true);
    expect(canTransitionReturnRequest("RECEIVED", "INSPECTED", "EXCHANGE")).toBe(true);
    expect(canTransitionReturnRequest("COMPLETED", "APPROVED", "EXCHANGE")).toBe(false);
  });

  it("only exposes replacement creation for exchanges", () => {
    expect(getReturnRequestTransitions("INSPECTED", "EXCHANGE")).toContain("REPLACEMENT_CREATED");
    expect(getReturnRequestTransitions("INSPECTED", "RETURN")).not.toContain("REPLACEMENT_CREATED");
    expect(getReturnRequestTransitions("INSPECTED", "REFUND")).toContain("REFUND_PROCESSING");
  });

  it("keeps terminal states closed", () => {
    expect(getReturnRequestTransitions("REJECTED", "EXCHANGE")).toEqual([]);
    expect(getReturnRequestTransitions("CANCELLED", "RETURN")).toEqual([]);
    expect(getReturnRequestTransitions("COMPLETED", "REFUND")).toEqual([]);
  });
});
