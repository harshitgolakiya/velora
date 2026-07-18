import type { Metadata } from "next";
import { CmsPage } from "@/components/store/cms-page";
import { getPageContentMetadata } from "@/lib/content-cms";

export function generateMetadata(): Promise<Metadata> {
  return getPageContentMetadata({
    slug: "terms",
    path: "/terms",
    title: "Terms and Conditions",
    description: "Terms for storefront use, orders, payment, and availability.",
  });
}

export default function TermsPage() { return <CmsPage slug="terms" label="Terms and Conditions" fallback={[{ id: "terms-hero", type: "HERO", eyebrow: "Legal", heading: "Terms of service.", body: "The terms that apply when using this storefront and placing an order." }, { id: "terms-orders", type: "POLICY", heading: "Orders and availability", body: "Orders remain subject to product availability, payment authorization, delivery eligibility, and fraud checks. Prices and availability may change before checkout is completed." }]} />; }
