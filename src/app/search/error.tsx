"use client";
import { RouteErrorState } from "@/components/store/route-error-state";
export default function SearchError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState {...props} eyebrow="Search interrupted" title="We could not complete that search." body="Your query is still in the address bar. Try again or browse the complete activewear catalog." destinationHref="/shop" destinationLabel="Browse all products" />;
}
