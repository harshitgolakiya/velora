import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  expireStaleCartReservations: vi.fn(),
  processDueAutomationEvents: vi.fn(),
  publishDuePageContent: vi.fn(),
  processProductAlertQueue: vi.fn(),
  publishDueScheduledProducts: vi.fn(),
  publishDueScheduledHomepageSections: vi.fn(),
  publishDueScheduledCollections: vi.fn(),
}));

vi.mock("@/lib/cart-reservations", () => ({
  expireStaleCartReservations: mocks.expireStaleCartReservations,
}));

vi.mock("@/lib/automation-events", () => ({
  processDueAutomationEvents: mocks.processDueAutomationEvents,
}));

vi.mock("@/lib/content-cms", () => ({
  publishDuePageContent: mocks.publishDuePageContent,
}));

vi.mock("@/lib/product-alert-queue", () => ({
  processProductAlertQueue: mocks.processProductAlertQueue,
}));

vi.mock("@/lib/scheduled-publishing", () => ({
  publishDueScheduledProducts: mocks.publishDueScheduledProducts,
  publishDueScheduledHomepageSections: mocks.publishDueScheduledHomepageSections,
  publishDueScheduledCollections: mocks.publishDueScheduledCollections,
}));

describe("maintenance job runner", () => {
  const now = new Date("2026-07-04T08:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.expireStaleCartReservations.mockResolvedValue(2);
    mocks.publishDueScheduledProducts.mockResolvedValue({ count: 3 });
    mocks.publishDueScheduledHomepageSections.mockResolvedValue({ count: 4 });
    mocks.publishDueScheduledCollections.mockResolvedValue({ count: 5 });
    mocks.publishDuePageContent.mockResolvedValue({ count: 6 });
    mocks.processDueAutomationEvents.mockResolvedValue({ sent: 1, skipped: 2, failed: 0, retried: 1, events: 3 });
    mocks.processProductAlertQueue.mockResolvedValue({ processed: 4, sent: 3, failed: 1, skipped: 0 });
  });

  it("runs the centralized operational jobs with per-job metrics", async () => {
    const { runMaintenanceJobs } = await import("@/lib/maintenance-jobs");

    const result = await runMaintenanceJobs({ now, automationLimit: 25, productAlertLimit: 30 });

    expect(result).toEqual({
      ok: true,
      ranAt: now.toISOString(),
      totals: { failedJobs: 0, processedJobs: 4 },
      jobs: [
        { name: "cartReservations", status: "success", metrics: { expiredCarts: 2 } },
        { name: "scheduledPublishing", status: "success", metrics: { products: 3, homepageSections: 4, collections: 5, pages: 6 } },
        { name: "automation", status: "success", metrics: { sent: 1, skipped: 2, failed: 0, retried: 1, events: 3 } },
        { name: "productAlerts", status: "success", metrics: { processed: 4, sent: 3, failed: 1, skipped: 0 } },
      ],
    });
    expect(mocks.expireStaleCartReservations).toHaveBeenCalledWith(now);
    expect(mocks.publishDueScheduledProducts).toHaveBeenCalledWith(now, { force: true });
    expect(mocks.processDueAutomationEvents).toHaveBeenCalledWith({ limit: 25 });
    expect(mocks.processProductAlertQueue).toHaveBeenCalledWith(30);
  });

  it("keeps running later jobs when one maintenance step fails", async () => {
    const { runMaintenanceJobs } = await import("@/lib/maintenance-jobs");
    mocks.expireStaleCartReservations.mockRejectedValue(new Error("Database unavailable"));

    const result = await runMaintenanceJobs({ now, only: ["cartReservations", "automation"] });

    expect(result.ok).toBe(false);
    expect(result.totals).toEqual({ failedJobs: 1, processedJobs: 2 });
    expect(result.jobs[0]).toEqual({
      name: "cartReservations",
      status: "failed",
      metrics: {},
      error: "Database unavailable",
    });
    expect(result.jobs[1]).toEqual({
      name: "automation",
      status: "success",
      metrics: { sent: 1, skipped: 2, failed: 0, retried: 1, events: 3 },
    });
  });
});
