import { describe, expect, it } from "vitest";
import {
  formatCartReservationError,
  getCartLineAvailability,
  getCartLineImage,
  isCartReservationExpired,
} from "@/lib/cart-ui";
import type { Product } from "@/lib/catalog";
import type { CartLine } from "@/lib/store";

const product: Product = {
  id: "product-1",
  slug: "test-product",
  name: "Test Product",
  category: "Tops",
  collection: "Core",
  price: 200,
  rating: 0,
  reviews: 0,
  stock: 2,
  colors: ["Black"],
  sizes: ["S"],
  images: ["/fallback.jpg"],
  variantMediaByColor: {
    Black: [
      { type: "IMAGE", url: "/hover.jpg", sortOrder: 0, isHoverImage: true },
      { type: "IMAGE", url: "/black.jpg", sortOrder: 1, isHoverImage: false },
    ],
  },
  variants: [
    {
      id: "variant-1",
      stock: 2,
      lowStockThreshold: 3,
      color: { id: "black", name: "Black", hex: "#000000" },
      size: { id: "small", name: "S" },
      media: [],
    },
  ],
  description: "",
  fabric: "",
  care: "",
};

const line: CartLine = {
  product,
  variantId: "variant-1",
  color: "Black",
  size: "S",
  quantity: 2,
};

const reservationCopy = {
  networkUnavailable: "Connection lost. Your cart is saved locally.",
  cartAlreadyCompleted: "This cart has already been completed.",
  reservationExpired: "Reservation expired. Inventory is no longer reserved.",
  cartSavedLocally: "Reconnect to reserve inventory before checkout.",
  refreshAvailability: "Refresh availability before checkout.",
};

describe("cart presentation", () => {
  it("uses the selected color gallery instead of the generic product image", () => {
    expect(getCartLineImage(line)).toBe("/black.jpg");
  });

  it("prevents quantity increases at stock limit and reports low stock", () => {
    expect(getCartLineAvailability(line)).toMatchObject({
      stock: 2,
      canIncrease: false,
      isLowStock: true,
      allowsBackorder: false,
    });
  });

  it("detects expired reservations", () => {
    expect(
      isCartReservationExpired("2026-06-15T10:00:00.000Z", Date.parse("2026-06-15T10:01:00.000Z")),
    ).toBe(true);
    expect(
      isCartReservationExpired("2026-06-15T10:02:00.000Z", Date.parse("2026-06-15T10:01:00.000Z")),
    ).toBe(false);
  });

  it("maps reservation error codes to customer-facing recovery labels", () => {
    expect(formatCartReservationError("NETWORK_UNAVAILABLE", reservationCopy)).toMatchObject({
      title: reservationCopy.networkUnavailable,
      detail: reservationCopy.cartSavedLocally,
      tone: "warning",
    });
    expect(formatCartReservationError("CART_ALREADY_COMPLETED", reservationCopy)).toMatchObject({
      title: reservationCopy.cartAlreadyCompleted,
      detail: reservationCopy.refreshAvailability,
      tone: "critical",
    });
    expect(formatCartReservationError("OUT_OF_STOCK", reservationCopy)).toMatchObject({
      title: reservationCopy.reservationExpired,
      detail: reservationCopy.refreshAvailability,
      tone: "critical",
    });
  });
});
