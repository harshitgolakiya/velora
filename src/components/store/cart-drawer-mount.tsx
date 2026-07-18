"use client";

import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";

const CartDrawer = dynamic(() => import("@/components/store/cart-drawer").then((mod) => mod.CartDrawer), {
  ssr: false,
});

export function CartDrawerMount() {
  const cartOpen = useStore((state) => state.cartOpen);

  return cartOpen ? <CartDrawer /> : null;
}
