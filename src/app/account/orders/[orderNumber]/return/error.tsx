"use client";
import { RouteErrorState } from "@/components/store/route-error-state";
export default function ReturnError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState {...props} eyebrow="Return request paused" title="We could not load the return form." body="No return request has been submitted. Try again or go back to your orders." destinationHref="/account/orders" destinationLabel="Back to orders" />;
}
