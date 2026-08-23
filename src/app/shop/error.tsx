"use client";
import { RouteErrorState } from "@/components/store/route-error-state";
export default function ShopError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState {...props} eyebrow="Shop unavailable" title="We could not load the activewear edit." body="Try refreshing the catalog, or return home while the collection reconnects." destinationHref="/" destinationLabel="Back to homepage" />;
}
