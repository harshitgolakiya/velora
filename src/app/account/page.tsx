import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { AccountAccess } from "@/components/auth/account-access";
import { AccountOverview } from "@/components/auth/account-overview";
import { getAccountDashboardData } from "@/lib/account-data";
import { authOptions } from "@/lib/auth";
import { getCmsProducts } from "@/lib/cms";
import { localizedAlternates } from "@/lib/seo";
import { accountCopy } from "@/lib/i18n";
import { mapAccountDashboardProps } from "@/lib/account-dashboard-data";

export const metadata: Metadata = { alternates: localizedAlternates("/account") };

export default async function AccountPage() {
  const locale = (await headers()).get("x-velora-locale") === "ar" ? "ar" : "en";
  const copy = accountCopy[locale];
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
  return (
    <section className="storefront-container py-10 sm:py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{copy.myAccount}</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">{session?.user ? `${copy.welcomeBack}${session.user.name ? `, ${session.user.name}` : ""}` : copy.accountTitle}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-base">
          {session?.user ? copy.signedInDescription : copy.signedOutDescription}
        </p>
      </div>
      {session?.user && user ? (
        <AccountOverview {...mapAccountDashboardProps({ user, orders }, products)} />
      ) : (
        <>
          <AccountAccess user={session?.user} socialProviders={socialProviders} />
          <div className="storefront-framed mt-8 flex flex-col gap-5 border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--foreground)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-2xl font-semibold">{copy.orderTracking}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{copy.orderTrackingBody}</p>
            </div>
            <Link href={locale === "ar" ? "/ar/track-order" : "/track-order"} className="storefront-action inline-flex h-11 shrink-0 items-center justify-center border border-[var(--border)] bg-[var(--background)] px-5 text-sm font-medium text-[var(--foreground)] hover:border-[var(--foreground)] hover:bg-[var(--hover)] motion-reduce:transition-none">{copy.trackOrder}</Link>
          </div>
        </>
      )}
    </section>
  );
}

