import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { OrderTracker } from "@/components/store/order-tracker";
import { getActiveAccountOrders } from "@/lib/account-data";
import { authOptions } from "@/lib/auth";
import { localizedAlternates } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { ContextualSupport } from "@/components/store/contextual-support";

export const metadata: Metadata = { alternates: localizedAlternates("/track-order") };

export default async function TrackOrderPage() {
  const session = await getServerSession(authOptions);
  const activeOrders = session?.user?.id && session.user.email
    ? await getActiveAccountOrders(session.user.id, session.user.email)
    : [];

  return (
    <section className="storefront-container py-10 sm:py-12">
      <Breadcrumbs items={[{ label: "Track Order" }]} />
      <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">{session?.user ? "Track your orders" : "Track order"}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
        {session?.user
          ? activeOrders.length
            ? "Follow orders that are being prepared or are currently on the way."
            : "You have no orders currently in progress. You can still look up another order below."
          : "Enter the order number and email used at checkout."}
      </p>
      <OrderTracker
        customerEmail={session?.user?.email ?? undefined}
        initialOrders={activeOrders.map((order) => ({
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.payment?.status ?? order.paymentStatus,
          paymentProvider: order.payment?.provider,
          fulfillmentStatus: order.fulfillmentStatus,
          carrier: order.shipment?.carrier ?? undefined,
          trackingNo: order.shipment?.trackingNo ?? undefined,
          shipmentStatus: order.shipment?.status ?? undefined,
          shippedAt: order.shipment?.shippedAt?.toISOString(),
          deliveredAt: order.shipment?.deliveredAt?.toISOString(),
          shipmentEvents: order.shipment?.events.map((event) => ({
            id: event.id,
            status: event.status,
            carrier: event.carrier ?? undefined,
            trackingNo: event.trackingNo ?? undefined,
            message: event.message ?? undefined,
            createdAt: event.createdAt.toISOString(),
          })) ?? [],
          itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
          updatedAt: order.updatedAt.toISOString(),
        }))}
      />
      <div className="mt-8"><ContextualSupport context="tracking" /></div>
    </section>
  );
}
