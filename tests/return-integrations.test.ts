import { afterEach, describe, expect, it, vi } from "vitest";
import { scanReturnEvidence } from "@/lib/return-malware-scan";
import { syncReturnCarrier } from "@/lib/return-carrier";
import { createReturnCarrierSignature, mapCarrierWebhookStatus, verifyReturnCarrierSignature } from "@/lib/return-carrier-webhook";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("return evidence malware scanning", () => {
  const file = new File([Uint8Array.from([0xff, 0xd8, 0xff])], "evidence.jpg", { type: "image/jpeg" });

  it("allows an explicit development skip but fails closed when scanning is required", async () => {
    await expect(scanReturnEvidence(file, { required: false, endpoint: "" })).resolves.toMatchObject({ status: "SKIPPED" });
    await expect(scanReturnEvidence(file, { required: true, endpoint: "" })).rejects.toThrow("scanner is configured");
  });

  it("accepts clean files and rejects detected threats", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ clean: true, provider: "scanner", reference: "scan-1" }), { status: 200 }));
    await expect(scanReturnEvidence(file, { endpoint: "https://scanner.test", required: true })).resolves.toMatchObject({ status: "CLEAN", reference: "scan-1" });
    global.fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ clean: false, threat: "test-signature" }), { status: 200 }));
    await expect(scanReturnEvidence(file, { endpoint: "https://scanner.test", required: true })).rejects.toThrow("test-signature");
  });
});

describe("return carrier adapter", () => {
  const payload = { action: "SCHEDULE_PICKUP" as const, requestId: "return-1", orderNumber: "VL-100", carrier: "Carrier" };

  it("reports manual handling when no API is configured", async () => {
    await expect(syncReturnCarrier(payload, { endpoint: "" })).resolves.toMatchObject({ status: "MANUAL_REQUIRED" });
  });

  it("maps provider success and surfaces provider failures", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ reference: "pickup-1", trackingNo: "RET-1", status: "booked" }), { status: 200 }));
    await expect(syncReturnCarrier(payload, { endpoint: "https://carrier.test" })).resolves.toMatchObject({ status: "SUCCEEDED", externalRef: "pickup-1", trackingNo: "RET-1" });
    global.fetch = vi.fn().mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    await expect(syncReturnCarrier(payload, { endpoint: "https://carrier.test" })).rejects.toThrow("status 503");
  });
});

describe("return carrier webhook security", () => {
  it("accepts only the valid HMAC signature", () => {
    const body = JSON.stringify({ eventId: "evt-1", status: "collected" });
    const signature = createReturnCarrierSignature(body, "secret");
    expect(verifyReturnCarrierSignature(body, `sha256=${signature}`, "secret")).toBe(true);
    expect(verifyReturnCarrierSignature(`${body}x`, signature, "secret")).toBe(false);
    expect(verifyReturnCarrierSignature(body, "invalid", "secret")).toBe(false);
  });

  it("maps provider states onto controlled return lifecycle states", () => {
    expect(mapCarrierWebhookStatus("booked")).toBe("PICKUP_SCHEDULED");
    expect(mapCarrierWebhookStatus("collected")).toBe("PICKED_UP");
    expect(mapCarrierWebhookStatus("warehouse_received")).toBe("RECEIVED");
    expect(mapCarrierWebhookStatus("unknown")).toBeNull();
  });
});
