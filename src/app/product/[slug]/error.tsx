"use client";
import { RouteErrorState } from "@/components/store/route-error-state";
export default function ProductError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState {...props} eyebrow="Product unavailable" title="We could not load this piece." body="Try again to restore its sizes and availability, or continue browsing the full collection." destinationHref="/shop" destinationLabel="Continue shopping" />;
}
