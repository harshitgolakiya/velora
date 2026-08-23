"use client";
import { RouteErrorState } from "@/components/store/route-error-state";
export default function AccountError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState {...props} eyebrow="Account unavailable" title="We could not load your account." body="Your orders and saved details are unchanged. Try again or continue shopping." destinationHref="/shop" destinationLabel="Continue shopping" />;
}
