import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ContactForm } from "@/components/store/contact-form";
import { ContentBlockRenderer } from "@/components/store/content-block-renderer";
import { authOptions } from "@/lib/auth";
import { getActiveAccountOrders } from "@/lib/account-data";
import { getPageContentMetadata, getPublishedPageContent, type ContentBlock } from "@/lib/content-cms";

export function generateMetadata(): Promise<Metadata> {
  return getPageContentMetadata({
    slug: "contact",
    path: "/contact",
    title: "Contact Support",
    description: "Order-aware support, product guidance, returns help, and partnerships.",
  });
}

const fallbackBlocks: ContentBlock[] = [
  {
    id: "contact-hero",
    type: "HERO",
    eyebrow: "Customer care",
    heading: "How can we help?",
    body: "Choose a topic and include an order when relevant. Your request receives a case number and reaches the support queue immediately.",
  },
];

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const session = await getServerSession(authOptions);
  const [orders, page] = await Promise.all([
    session?.user?.id && session.user.email ? getActiveAccountOrders(session.user.id, session.user.email) : [],
    getPublishedPageContent("contact"),
  ]);
  return (
    <section className="storefront-container-narrow py-8">
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <ContentBlockRenderer blocks={page?.blocks.length ? page.blocks : fallbackBlocks} />
      <div className="mt-8 sm:mt-10">
        <ContactForm
          activeOrders={orders.map((order) => ({ orderNumber: order.orderNumber, status: order.status }))}
          defaultName={session?.user?.name ?? ""}
          defaultEmail={session?.user?.email ?? ""}
          defaultCategory={typeof query.category === "string" ? query.category : undefined}
          defaultOrderNumber={typeof query.order === "string" ? query.order : undefined}
          product={typeof query.product === "string" ? query.product : undefined}
          source={typeof query.source === "string" ? query.source : undefined}
        />
      </div>
    </section>
  );
}
