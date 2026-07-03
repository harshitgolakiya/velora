import type { Metadata } from "next";
import { CmsPage } from "@/components/store/cms-page";
import { localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = { alternates: localizedAlternates("/shipping") };

export default function ShippingPage() { return <CmsPage slug="shipping" label="UAE Shipping" fallback={[{ id: "shipping-hero", type: "HERO", eyebrow: "Client services", heading: "Delivery across the UAE.", body: "Tracked standard and express delivery, with clear updates from checkout to arrival." }, { id: "shipping-options", type: "CARDS", heading: "Delivery options", items: [{ title: "Standard delivery", body: "Complimentary above AED 300. Delivery estimates are shown at checkout." }, { title: "Express delivery", body: "Available for eligible UAE addresses for AED 40." }, { title: "Track your order", body: "Use your account or order number and checkout email for live status.", href: "/track-order" }] }]} />; }
