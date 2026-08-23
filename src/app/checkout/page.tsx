import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { CheckoutForm } from "@/components/store/checkout-form";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCheckoutSettings } from "@/lib/store-settings";
import { ContextualSupport } from "@/components/store/contextual-support";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const [checkoutSettings, savedAddresses] = await Promise.all([
    getCheckoutSettings(),
    session?.user?.id
      ? prisma.address.findMany({
          where: { userId: session.user.id },
          orderBy: { id: "desc" },
          take: 8,
        })
      : Promise.resolve([]),
  ]);
  return (
    <div className="storefront-container py-8 sm:py-12">
      <CheckoutForm
        cancelled={params.cancelled === "1"}
        checkoutSettings={checkoutSettings}
        customerEmail={session?.user?.email ?? undefined}
        savedAddresses={savedAddresses.map((address) => ({
          id: address.id,
          name: address.name,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          country: address.country,
          postalCode: address.postalCode,
        }))}
      />
      <div className="mx-auto mt-8 max-w-3xl"><ContextualSupport context="checkout" /></div>
    </div>
  );
}
