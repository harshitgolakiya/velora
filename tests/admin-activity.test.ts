import { describe, expect, it, vi } from "vitest";
import { recordAdminActivity } from "@/lib/admin-activity";

describe("recordAdminActivity", () => {
  it("serializes metadata and applies defaults", async () => {
    const create = vi.fn().mockResolvedValue({});

    await recordAdminActivity(
      {
        action: "Created product",
        entityType: "product",
        metadata: { sku: "AURA" },
      },
      { activityLog: { create } },
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        actor: "Super admin",
        action: "Created product",
        entityType: "product",
        entityId: null,
        metadata: JSON.stringify({ sku: "AURA" }),
      },
    });
  });
});
