import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/catalog";
import type { useStore as useStoreType } from "@/lib/store";

const product: Product = {
  id: "product-1",
  slug: "test-product",
  name: "Test Product",
  category: "Tops",
  collection: "Core",
  price: 200,
  rating: 0,
  reviews: 0,
  stock: 5,
  colors: ["Black"],
  sizes: ["S"],
  images: ["/fallback.jpg"],
  variants: [
    {
      id: "variant-1",
      stock: 5,
      color: { id: "black", name: "Black", hex: "#000000" },
      size: { id: "small", name: "S" },
      media: [],
    },
  ],
  description: "",
  fabric: "",
  care: "",
};

let useStore: typeof useStoreType;
const storage = new Map<string, string>();

describe("cart recovery state", () => {
  beforeAll(async () => {
    const localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", { localStorage });
    useStore = (await import("@/lib/store")).useStore;
  });

  beforeEach(() => {
    storage.clear();
    useStore.setState({
      cart: [],
      cartSessionKey: "",
      cartExpiresAt: undefined,
      cartReservationError: undefined,
      cartSyncStatus: "idle",
      cartRecoveryNotice: undefined,
      cartOpen: false,
      coupon: undefined,
      couponError: undefined,
      customerNote: "",
    });
  });

  it("restores a server cart after refresh and clears stale reservation errors", () => {
    useStore.getState().setCartReservationError("Network error");

    useStore.getState().replaceCart({
      cart: [{ product, variantId: "variant-1", color: "Black", size: "S", quantity: 2 }],
      cartSessionKey: "server-session",
      cartExpiresAt: "2026-06-15T10:30:00.000Z",
    });

    expect(useStore.getState()).toMatchObject({
      cartSessionKey: "server-session",
      cartExpiresAt: "2026-06-15T10:30:00.000Z",
      cartOpen: true,
      cartReservationError: undefined,
      cartSyncStatus: "synced",
      cartRecoveryNotice: "restored",
    });
    expect(useStore.getState().cart).toHaveLength(1);
  });

  it("keeps local cart lines visible when reservation sync reports a network failure", () => {
    useStore.getState().addToCart(product, { color: "Black", size: "S", quantity: 1 });
    useStore.getState().setCartSyncStatus("error");
    useStore.getState().setCartReservationError("NETWORK_UNAVAILABLE");

    expect(useStore.getState().cart).toHaveLength(1);
    expect(useStore.getState().cartSyncStatus).toBe("error");
    expect(useStore.getState().cartReservationError).toBe("NETWORK_UNAVAILABLE");
  });

  it("can replace the cart session after authentication changes", () => {
    useStore.getState().addToCart(product, { color: "Black", size: "S", quantity: 1 });

    useStore.getState().replaceCart({
      cart: [{ product, variantId: "variant-1", color: "Black", size: "S", quantity: 3 }],
      cartSessionKey: "account-session",
      cartExpiresAt: "2026-06-15T11:00:00.000Z",
    });

    expect(useStore.getState().cartSessionKey).toBe("account-session");
    expect(useStore.getState().cartSyncStatus).toBe("synced");
    expect(useStore.getState().cart[0]?.quantity).toBe(3);
  });
});
