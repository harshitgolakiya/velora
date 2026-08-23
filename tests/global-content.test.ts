import { describe, expect, it } from "vitest";
import {
  defaultGlobalContent,
  enabledSorted,
  localText,
  parseGlobalContentSettings,
} from "@/lib/global-content";

describe("global storefront content settings", () => {
  it("falls back to default draft and published content", () => {
    const settings = parseGlobalContentSettings(null);

    expect(settings.draft.primaryNavigation.map((item) => item.id)).toContain("shop");
    expect(settings.published.footerGroups.map((item) => item.id)).toEqual(["services", "discover"]);
  });

  it("rejects malformed persisted JSON safely", () => {
    const settings = parseGlobalContentSettings("{not json");

    expect(settings.published.announcementEnabled).toBe(true);
    expect(localText(settings.published.footer.location, "en")).toBe("Premium activewear · UAE");
  });

  it("supports draft-only persisted settings for previewable admin edits", () => {
    const settings = parseGlobalContentSettings(JSON.stringify({
      draft: {
        ...defaultGlobalContent,
        primaryNavigation: [
          {
            id: "editorial",
            label: { en: "Editorial", ar: "تحرير" },
            href: "/story",
            enabled: true,
            sortOrder: 1,
          },
        ],
      },
    }));

    expect(settings.draft.primaryNavigation[0]?.label.en).toBe("Editorial");
    expect(settings.published.primaryNavigation.length).toBe(defaultGlobalContent.primaryNavigation.length);
  });

  it("filters disabled rows and applies sort order", () => {
    const sorted = enabledSorted([
      { id: "last", enabled: true, sortOrder: 30 },
      { id: "hidden", enabled: false, sortOrder: 1 },
      { id: "first", enabled: true, sortOrder: 10 },
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["first", "last"]);
  });
});
