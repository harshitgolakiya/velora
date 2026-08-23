import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { FaqContent } from "@/components/store/faq-content";
import { getPageContentMetadata, getPublishedPageContent } from "@/lib/content-cms";
import { faqJsonLd } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return getPageContentMetadata({
    slug: "faqs",
    path: "/faqs",
    title: "Frequently Asked Questions",
    description: "Answers about shopping, delivery, returns, and fit.",
  });
}

const faqs = [
  ["Where do you deliver?", "Available delivery options are shown at checkout, with tracked shipping from dispatch and complimentary standard delivery above AED 300 where eligible."],
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
    <section className="storefront-container-narrow py-8">
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
