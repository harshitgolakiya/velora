import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { AccountAccess } from "@/components/auth/account-access";
import { AccountDashboard } from "@/components/auth/account-dashboard";
import { getAccountDashboardData } from "@/lib/account-data";
import { authOptions } from "@/lib/auth";
import { getCmsProducts } from "@/lib/cms";
import { localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = { alternates: localizedAlternates("/account") };

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const accountData =
    session?.user?.id && session.user.email
      ? await getAccountDashboardData(session.user.id, session.user.email)
      : null;
  const user = accountData?.user;
  const orders = accountData?.orders ?? [];
  const products = session?.user && user ? await getCmsProducts() : [];
  const socialProviders = [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [{ id: "google" as const, label: "Google" }]
      : []),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [{ id: "facebook" as const, label: "Facebook" }]
      : []),
  ];
  const wishlistSlugs = user?.wishlist?.items.map((item) => item.product.slug) ?? [];
  const wishlistIntents = Object.fromEntries(user?.wishlist?.items.map((item) => [item.product.slug, {
    variantId: item.variantId ?? undefined,
    color: item.color ?? undefined,
    size: item.size ?? undefined,
  }]) ?? []);
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">My account</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">{session?.user ? `Welcome, ${session.user.name ?? "back"}` : "Your Velora account"}</h1>
        <p className="mt-4 text-[var(--muted)]">
          {session?.user ? "Manage your profile, orders, wishlist, and addresses." : "Sign in to access orders and saved pieces, or create a customer account."}
        </p>
      </div>
      {session?.user && user ? (
        <AccountDashboard
          initialUser={{
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
            marketingEmails: user.marketingEmails,
            productAlertEmails: user.productAlertEmails,
            postPurchaseEmails: user.postPurchaseEmails,
            preferredSize: user.preferredSize,
            fitPreference: user.fitPreference,
            compressionPreference: user.compressionPreference,
          }}
          initialAddresses={user.addresses.map((address) => ({
            id: address.id,
            name: address.name,
            phone: address.phone,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            country: address.country,
            postalCode: address.postalCode,
          }))}
          initialOrders={orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.payment?.status ?? order.paymentStatus,
            paymentProvider: order.payment?.provider,
            fulfillmentStatus: order.fulfillmentStatus,
            total: Number(order.total),
            createdAt: order.createdAt.toISOString(),
            itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
            trackingNo: order.shipment?.trackingNo,
            items: order.items.map((item) => ({
              title: item.title,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              unitPrice: Number(item.unitPrice),
            })),
          }))}
          initialReturns={orders.flatMap((order) =>
            order.returnRequests.map((request) => ({
              id: request.id,
              orderNumber: order.orderNumber,
              resolution: request.resolution,
              reason: request.reason,
              status: request.status,
              createdAt: request.createdAt.toISOString(),
              updatedAt: request.updatedAt.toISOString(),
              items: request.items.map((item) => ({
                title: item.orderItem.title,
                color: item.orderItem.color,
                originalSize: item.orderItem.size,
                requestedSize: item.requestedSize ?? item.requestedVariant?.size.name ?? null,
                quantity: item.quantity,
              })),
            })),
          )}
          initialWishlistSlugs={wishlistSlugs}
          initialWishlistIntents={wishlistIntents}
          catalogProducts={products}
        />
      ) : (
        <>
          <AccountAccess user={session?.user} socialProviders={socialProviders} />
          <div className="mt-10 bg-[var(--foreground)] p-6 text-[var(--background)]">
            <p className="text-3xl font-semibold">Order tracking</p>
            <p className="mt-2 text-sm opacity-75">Track by order number and email from the support flow.</p>
            <Link href="/track-order" className="mt-5 inline-flex h-11 items-center bg-[var(--background)] px-5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--accent)] hover:text-stone-950 motion-reduce:transition-none">Track order</Link>
          </div>
        </>
      )}
    </section>
  );
}
