import type { ComponentType } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAccountDashboardData } from "@/lib/account-data";
import { mapAccountDashboardProps } from "@/lib/account-dashboard-data";
import { authOptions } from "@/lib/auth";
import { getCmsProducts, requestLocale } from "@/lib/cms";
import { accountCopy, localizedPath } from "@/lib/i18n";
import type { AccountDashboardProps } from "./account-dashboard";

export async function AccountSectionShell({
  component: SectionComponent,
  needsCatalog = false,
}: {
  component: ComponentType<Omit<AccountDashboardProps, "section">>;
  needsCatalog?: boolean;
}) {
  const locale = await requestLocale();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) redirect(localizedPath("/account", locale));

  const data = await getAccountDashboardData(session.user.id, session.user.email);
  if (!data.user) redirect(localizedPath("/account", locale));
  const products = needsCatalog ? await getCmsProducts() : [];
  const copy = accountCopy[locale];

  return (
    <section className="storefront-container py-10 sm:py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{copy.myAccount}</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">{copy.welcomeBack}{session.user.name ? `, ${session.user.name}` : ""}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-base">{copy.signedInDescription}</p>
      </div>
      <SectionComponent {...mapAccountDashboardProps({ user: data.user, orders: data.orders }, products)} />
    </section>
  );
}
