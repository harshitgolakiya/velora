import { describe, expect, it } from "vitest";
import { dirForLocale, localeFromPathname, localizedPath, stripLocale } from "@/lib/i18n";

describe("i18n routing helpers", () => {
  it("detects Arabic from visible /ar routes", () => {
    expect(localeFromPathname("/ar")).toBe("ar");
    expect(localeFromPathname("/ar/product/test")).toBe("ar");
    expect(localeFromPathname("/shop")).toBe("en");
  });

  it("strips and applies locale prefixes without changing the base route", () => {
    expect(stripLocale("/ar/shop")).toBe("/shop");
    expect(stripLocale("/ar")).toBe("/");
    expect(localizedPath("/shop?sort=latest", "ar")).toBe("/ar/shop?sort=latest");
    expect(localizedPath("/ar/shop", "en")).toBe("/shop");
  });

  it("maps text direction by locale", () => {
    expect(dirForLocale("ar")).toBe("rtl");
    expect(dirForLocale("en")).toBe("ltr");
  });
});
