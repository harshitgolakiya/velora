import type { Metadata } from "next";
import { CmsPage } from "@/components/store/cms-page";
import { getPageContentMetadata } from "@/lib/content-cms";

export function generateMetadata(): Promise<Metadata> {
  return getPageContentMetadata({
    slug: "privacy",
    path: "/privacy",
    title: "Privacy Policy",
    description: "How personal and commerce information is handled.",
  });
}

export default function PrivacyPage() { return <CmsPage slug="privacy" label="Privacy" fallback={[{ id: "privacy-hero", type: "HERO", eyebrow: "Legal", heading: "Your information, handled with care.", body: "How account, order, payment, communication, and analytics data is used." }, { id: "privacy-data", type: "POLICY", heading: "Information we process", body: "We process the information needed to provide accounts, orders, payments, delivery, returns, customer support, fraud prevention, and consented communications. Payment card details are handled by the payment provider and are not stored directly by this storefront." }]} />; }
