import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  syncCartReservations: vi.fn(),
}));

vi.mock("@/lib/cart-reservations", () => ({
  syncCartReservations: mocks.syncCartReservations,
}));

import { PUT } from "@/app/api/cart/route";

const payload = {
  sessionKey: "cart-session-123",
  items: [{ variantId: "variant-1", quantity: 1 }],
};

function cartRequest(origin = "http://localhost") {
  return new Request("http://localhost/api/cart", {
    method: "PUT",
    headers: { "Origin": origin },
    body: JSON.stringify(payload),
  });
}

describe("cart mutation request security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.syncCartReservations.mockResolvedValue({ id: "cart-1", items: [] });
  });

  it("allows same-origin reservation sync", async () => {
    const response = await PUT(cartRequest());

    expect(response.status).toBe(200);
    expect(mocks.syncCartReservations).toHaveBeenCalledWith("cart-session-123", payload.items);
  });

  it("rejects cross-site reservation sync before touching reservations", async () => {
    const response = await PUT(cartRequest("https://attacker.test"));

    expect(response.status).toBe(403);
    expect(mocks.syncCartReservations).not.toHaveBeenCalled();
  });
});
