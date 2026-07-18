"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const CartDrawerMount = dynamic(
  () => import("@/components/store/cart-drawer-mount").then((mod) => mod.CartDrawerMount),
  { ssr: false },
);
const CartReservationSync = dynamic(
  () => import("@/components/store/cart-reservation-sync").then((mod) => mod.CartReservationSync),
  { ssr: false },
);
const NewsletterModalMount = dynamic(
  () => import("@/components/store/newsletter-modal-mount").then((mod) => mod.NewsletterModalMount),
  { ssr: false },
);

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function useStorefrontEffectsReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    const show = () => setReady(true);
    const usingIdleCallback = Boolean(idleWindow.requestIdleCallback);
    const handle = usingIdleCallback
      ? idleWindow.requestIdleCallback(show, { timeout: 1600 })
      : window.setTimeout(show, 900);

    return () => {
      if (usingIdleCallback && idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  return ready;
}

export function DeferredStorefrontEffects({
  showNewsletterModal,
  syncCart = true,
}: {
  showNewsletterModal: boolean;
  syncCart?: boolean;
}) {
  const ready = useStorefrontEffectsReady();
  if (!ready) return null;

  return (
    <>
      {syncCart ? <CartReservationSync /> : null}
      <CartDrawerMount />
      {showNewsletterModal ? <NewsletterModalMount /> : null}
    </>
  );
}
