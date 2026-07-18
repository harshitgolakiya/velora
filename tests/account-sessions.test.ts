import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  requireCustomerSession: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/account-data", () => ({
  requireCustomerSession: mocks.requireCustomerSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    accountSession: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      update: mocks.update,
      upsert: mocks.upsert,
    },
  },
}));

function request(body?: unknown, headers: HeadersInit = {}) {
  return new Request("https://velora.test/api/account/sessions", {
    method: body ? "DELETE" : "GET",
    headers: body ? { origin: "https://velora.test", ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("account sessions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCustomerSession.mockResolvedValue({
      user: {
        id: "user_1",
        email: "customer@example.com",
        sessionId: "session_current_1234567890",
      },
    });
  });

  it("touches the current device and lists account sessions", async () => {
    const { GET } = await import("@/app/api/account/sessions/route");
    mocks.upsert.mockResolvedValue({});
    mocks.findMany.mockResolvedValue([
      {
        sessionToken: "session_current_1234567890",
        deviceLabel: "Desktop browser",
        userAgent: "Mozilla Windows",
        ipAddress: "203.0.113.10",
        createdAt: new Date("2026-07-03T09:00:00.000Z"),
        lastSeenAt: new Date("2026-07-03T10:00:00.000Z"),
        revokedAt: null,
        revokedReason: null,
      },
    ]);

    const response = await GET(request(undefined, {
      "user-agent": "Mozilla/5.0 Windows",
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { sessionToken: "session_current_1234567890" },
      update: expect.objectContaining({
        deviceLabel: "Desktop browser",
        ipAddress: "203.0.113.10",
      }),
    }));
    expect(body.sessions[0]).toMatchObject({
      sessionToken: "session_current_1234567890",
      current: true,
      deviceLabel: "Desktop browser",
    });
  });

  it("revokes a selected session for the current account", async () => {
    const { DELETE } = await import("@/app/api/account/sessions/route");
    mocks.findFirst.mockResolvedValue({
      sessionToken: "session_other_1234567890",
      revokedAt: null,
    });
    mocks.update.mockResolvedValue({});

    const response = await DELETE(request({ sessionToken: "session_other_1234567890" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ revoked: true, revokedCurrent: false });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { sessionToken: "session_other_1234567890" },
      data: expect.objectContaining({
        revokedReason: "Customer revoked this device",
      }),
    }));
  });

  it("rejects cross-site session revocation attempts", async () => {
    const { DELETE } = await import("@/app/api/account/sessions/route");

    const response = await DELETE(request(
      { sessionToken: "session_other_1234567890" },
      { origin: "https://attacker.test" },
    ));

    expect(response.status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
