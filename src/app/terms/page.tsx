import type { Metadata } from "next";
import { CmsPage } from "@/components/store/cms-page";
import { localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = { alternates: localizedAlternates("/terms") };

export default function TermsPage() { return <CmsPage slug="terms" label="Terms and Conditions" fallback={[{ id: "terms-hero", type: "HERO", eyebrow: "Legal", heading: "Terms of service.", body: "The terms that apply when using this storefront and placing an order." }, { id: "terms-orders", type: "POLICY", heading: "Orders and availability", body: "Orders remain subject to product availability, payment authorization, delivery eligibility, and fraud checks. Prices and availability may change before checkout is completed." }]} />; }
