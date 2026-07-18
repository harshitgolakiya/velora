import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  productCount: vi.fn(),
  eventCreate: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { count: mocks.productCount },
    recommendationEvent: { create: mocks.eventCreate },
  },
}));

import { POST } from "@/app/api/recommendations/events/route";

function recommendationRequest(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/recommendations/events", {
    method: "POST",
    headers: { "Origin": origin },
    body: JSON.stringify(body),
  });
}

describe("recommendation attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.productCount.mockResolvedValue(2);
    mocks.eventCreate.mockResolvedValue({ id: "event-1" });
  });

  it("records a validated recommendation click with user attribution", async () => {
    const response = await POST(recommendationRequest({
        sourceProductId: "source-1",
        recommendedProductId: "recommended-1",
        eventType: "CLICK",
        strategy: "SAME_COLLECTION",
        placement: "product_page",
        sessionKey: "session-123456",
      }));

    expect(response.status).toBe(201);
    expect(mocks.eventCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      userId: "user-1",
      eventType: "CLICK",
      strategy: "SAME_COLLECTION",
    }) });
  });

  it("rejects self-recommendation events", async () => {
    const response = await POST(recommendationRequest({ sourceProductId: "same", recommendedProductId: "same", eventType: "IMPRESSION" }));
    expect(response.status).toBe(400);
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it("rejects cross-site recommendation events before product lookup", async () => {
    const response = await POST(recommendationRequest({
      sourceProductId: "source-1",
      recommendedProductId: "recommended-1",
      eventType: "CLICK",
    }, "https://attacker.test"));

    expect(response.status).toBe(403);
    expect(mocks.productCount).not.toHaveBeenCalled();
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });
});
