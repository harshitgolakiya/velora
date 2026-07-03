import { describe, expect, it } from "vitest";
import { appendPrivacyAuditLog, parsePrivacyAuditLog, privacyRetentionDate } from "@/lib/privacy-requests";

describe("privacy request audit helpers", () => {
  it("appends audit entries and ignores malformed history", () => {
    const log = appendPrivacyAuditLog("not-json", {
      at: new Date("2026-07-02T10:00:00.000Z"),
      actor: "customer@example.com",
      action: "DELETE_REQUESTED",
      message: "Confirmed deletion",
    });

    expect(parsePrivacyAuditLog(log)).toEqual([
      {
        at: "2026-07-02T10:00:00.000Z",
        actor: "customer@example.com",
        action: "DELETE_REQUESTED",
        message: "Confirmed deletion",
      },
    ]);
  });

  it("sets a thirty-day retention checkpoint", () => {
    expect(privacyRetentionDate(new Date("2026-07-02T00:00:00.000Z")).toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
});
