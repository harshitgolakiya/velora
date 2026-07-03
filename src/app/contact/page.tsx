import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ContactForm } from "@/components/store/contact-form";
import { authOptions } from "@/lib/auth";
import { getActiveAccountOrders } from "@/lib/account-data";
import { localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = { alternates: localizedAlternates("/contact") };

export default async function ContactPage() {
  const session = await getServerSession(authOptions);
  const orders = session?.user?.id && session.user.email ? await getActiveAccountOrders(session.user.id, session.user.email) : [];
  return (
    <section className="mx-auto max-w-360 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Customer care</p><h1 className="mt-3 text-5xl font-medium sm:text-6xl">How can we help?</h1><p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">Choose a topic and include an order when relevant. Your request receives a case number and reaches the support queue immediately.</p>
      <ContactForm activeOrders={orders.map((order) => ({ orderNumber: order.orderNumber, status: order.status }))} defaultName={session?.user?.name ?? ""} defaultEmail={session?.user?.email ?? ""} />
    </section>
  );
}
