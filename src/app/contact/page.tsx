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

export default async function ContactPage() {
  const session = await getServerSession(authOptions);
  const [orders, page] = await Promise.all([
    session?.user?.id && session.user.email ? getActiveAccountOrders(session.user.id, session.user.email) : [],
    getPublishedPageContent("contact"),
  ]);
  return (
    <section className="mx-auto max-w-360 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <ContentBlockRenderer blocks={page?.blocks.length ? page.blocks : fallbackBlocks} />
      <div className="mt-14">
        <ContactForm activeOrders={orders.map((order) => ({ orderNumber: order.orderNumber, status: order.status }))} defaultName={session?.user?.name ?? ""} defaultEmail={session?.user?.email ?? ""} />
      </div>
    </section>
  );
}
