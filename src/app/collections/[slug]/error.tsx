"use client";
import { RouteErrorState } from "@/components/store/route-error-state";
export default function CollectionError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState {...props} eyebrow="Collection unavailable" title="This edit is taking longer than expected." body="Try loading the collection again or browse every activewear piece." destinationHref="/shop" destinationLabel="Shop all activewear" />;
}
