import type { Metadata } from "next";
import { CmsPage } from "@/components/store/cms-page";
import { getPageContentMetadata } from "@/lib/content-cms";
import { getReturnSettings } from "@/lib/store-settings";

export function generateMetadata(): Promise<Metadata> {
  return getPageContentMetadata({
    slug: "returns",
    path: "/returns",
    title: "Returns and Exchanges",
    description: "Eligibility, exchanges, refunds, pickup, and tracking.",
  });
}

export default async function ReturnsPage() {
  const settings = await getReturnSettings();

  return (
    <>
      <CmsPage
        slug="returns"
        label="Returns and Exchanges"
        fallback={[
          {
            id: "returns-hero",
            type: "HERO",
            eyebrow: "Client services",
            heading: "Returns without uncertainty.",
            body: "Start eligible returns and size exchanges directly from your order details.",
          },
          {
            id: "returns-process",
            type: "CARDS",
            heading: "How it works",
            items: [
              { title: "1. Open your order", body: "Sign in and choose an eligible delivered order." },
              { title: "2. Choose a resolution", body: "Available return, exchange, and refund-review options are calculated from policy and stock." },
              { title: "3. Follow progress", body: "Track pickup, inspection, replacement, and refund progress from your account." },
            ],
          },
        ]}
      />
      <section className="storefront-container-narrow -mt-8 mb-16">
        <div className="storefront-railed px-5 py-6 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em]">Current return policy</p>
          <p className="storefront-body-copy mt-2 max-w-3xl text-[var(--muted)]">
            Eligible requests use a {settings.returnWindowDays}-day window after delivery. {settings.policySummary}
          </p>
        </div>
      </section>
    </>
  );
}
