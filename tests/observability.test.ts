import { describe, expect, it } from "vitest";
import { buildLogEvent, redactLogValue } from "@/lib/observability";

describe("observability logging", () => {
  it("redacts secret-like fields from structured log context", () => {
    expect(redactLogValue({
      email: "customer@example.com",
      password: "secret",
      nested: { apiKey: "abc", token: "def", safe: "value" },
    })).toEqual({
      email: "customer@example.com",
      password: "[redacted]",
      nested: { apiKey: "[redacted]", token: "[redacted]", safe: "value" },
    });
  });

  it("adds service and release metadata to log events", () => {
    const event = buildLogEvent("warn", "Something happened", { orderId: "order_1" });

    expect(event).toMatchObject({
      level: "warn",
      message: "Something happened",
      service: "velora",
      orderId: "order_1",
    });
    expect(event.timestamp).toEqual(expect.any(String));
  });
});
