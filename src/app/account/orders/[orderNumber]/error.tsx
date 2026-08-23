"use client";
import { RouteErrorState } from "@/components/store/route-error-state";
export default function OrderError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState {...props} eyebrow="Order unavailable" title="We could not load these order details." body="The order itself is unaffected. Try again or return to your complete order history." destinationHref="/account/orders" destinationLabel="View all orders" />;
}
