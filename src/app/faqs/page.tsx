import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { FaqContent } from "@/components/store/faq-content";
import { getPublishedPageContent } from "@/lib/content-cms";
import { faqJsonLd, localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = { alternates: localizedAlternates("/faqs") };

const faqs = [
  ["Do you ship across the UAE?", "Yes. UAE shipping is free above AED 300 and tracked from dispatch."],
  ["Can I checkout as a guest?", "Yes. Guest checkout is supported, with account creation optional after purchase."],
  ["Do you support Arabic?", "The layout and data model are prepared for Arabic RTL content and hreflang setup."],
  ["How do returns work?", "Unworn full-price pieces can be returned within 14 days with original tags."],
];

export default async function FaqsPage() {
  const page = await getPublishedPageContent("faqs");
  const blocks = page?.blocks ?? [{ id: "faq-general", type: "FAQ_GROUP" as const, category: "Shopping and delivery", items: faqs.map(([question, answer]) => ({ question, answer })) }];
  const faqItems = blocks
    .filter((block) => block.type === "FAQ_GROUP")
    .flatMap((block) => block.items)
    .slice(0, 30);
  return (
    <section className="mx-auto max-w-360 px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }}
      />
      <Breadcrumbs items={[{ label: "FAQs" }]} />
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Help centre</p><h1 className="mt-3 text-5xl font-medium sm:text-6xl">How can we help?</h1><p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">Clear answers about ordering, delivery, fit, payments, returns, and product care.</p>
      <FaqContent blocks={blocks} />
    </section>
  );
}
