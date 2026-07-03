import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@/lib/store";

describe("wishlist variant intent", () => {
  beforeEach(() => {
    useStore.setState({ wishlist: [], wishlistIntents: {} });
  });

  it("stores and updates the selected variant", () => {
    useStore.getState().toggleWishlist("soft-legging", {
      variantId: "variant-black-s",
      color: "Black",
      size: "S",
    });

    expect(useStore.getState().wishlistIntents["soft-legging"]).toEqual({
      variantId: "variant-black-s",
      color: "Black",
      size: "S",
    });

    useStore.getState().setWishlistIntent("soft-legging", {
      variantId: "variant-black-m",
      color: "Black",
      size: "M",
    });
    expect(useStore.getState().wishlistIntents["soft-legging"]?.size).toBe("M");
  });

  it("clears variant intent when the product is removed", () => {
    useStore.getState().toggleWishlist("soft-legging", { color: "Black", size: "S" });
    useStore.getState().toggleWishlist("soft-legging");

    expect(useStore.getState().wishlist).toEqual([]);
    expect(useStore.getState().wishlistIntents["soft-legging"]).toBeUndefined();
  });

  it("drops stale intents when the server wishlist is replaced", () => {
    useStore.setState({
      wishlist: ["first", "second"],
      wishlistIntents: {
        first: { color: "Black", size: "S" },
        second: { color: "Pearl", size: "M" },
      },
    });

    useStore.getState().setWishlist(["second"]);
    expect(useStore.getState().wishlistIntents).toEqual({ second: { color: "Pearl", size: "M" } });
  });
});
