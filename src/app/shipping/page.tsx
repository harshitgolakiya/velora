import type { Metadata } from "next";
import { CmsPage } from "@/components/store/cms-page";
import { getPageContentMetadata } from "@/lib/content-cms";

export function generateMetadata(): Promise<Metadata> {
  return getPageContentMetadata({
    slug: "shipping",
    path: "/shipping",
    title: "Shipping",
    description: "Delivery options, tracking, and shipping guidance.",
  });
}

export default function ShippingPage() { return <CmsPage slug="shipping" label="Shipping" fallback={[{ id: "shipping-hero", type: "HERO", eyebrow: "Client services", heading: "Delivery with clear tracking.", body: "Tracked standard and express delivery, with clear updates from checkout to arrival." }, { id: "shipping-options", type: "CARDS", heading: "Delivery options", items: [{ title: "Standard delivery", body: "Complimentary above AED 300 where eligible. Delivery estimates are shown at checkout." }, { title: "Express delivery", body: "Available for eligible addresses, with rates confirmed at checkout." }, { title: "Track your order", body: "Use your account or order number and checkout email for live status.", href: "/track-order" }] }]} />; }
