"use client";
import { RouteErrorState } from "@/components/store/route-error-state";
export default function CheckoutError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState {...props} eyebrow="Checkout paused" title="Your checkout could not be loaded." body="Your bag has not been cleared. Try again, or review your items before returning to checkout." destinationHref="/cart" destinationLabel="Review your bag" />;
}
