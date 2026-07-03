import { describe, expect, it } from "vitest";
import { findAddressSuggestion, getAddressSuggestions } from "@/lib/address-autocomplete";
import { defaultCheckoutSettings } from "@/lib/store-settings";

describe("address autocomplete fallback", () => {
  it("filters local suggestions by emirate", () => {
    const dubai = getAddressSuggestions("Dubai");

    expect(dubai.length).toBeGreaterThan(0);
    expect(dubai.every((suggestion) => suggestion.emirate === "Dubai")).toBe(true);
  });

  it("matches a selected suggestion label", () => {
    expect(findAddressSuggestion("Dubai Marina, Dubai")).toMatchObject({
      emirate: "Dubai",
      city: "Dubai",
      area: "Dubai Marina",
    });
  });

  it("defaults to local autocomplete with fallback enabled", () => {
    expect(defaultCheckoutSettings.addressAutocomplete).toMatchObject({
      provider: "LOCAL",
      enabled: true,
      fallbackToLocal: true,
    });
  });
});
