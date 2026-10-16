import type { Metadata } from "next";
import { EmailPreferencesForm } from "@/components/store/email-preferences-form";

export const metadata: Metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};

export default async function EmailPreferencesPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <main className="storefront-container-compact min-h-[65vh] py-16 lg:py-24">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-text)]">Communication controls</p>
      <h1 className="mt-5 text-4xl font-semibold sm:text-5xl">Email preferences</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">Choose what reaches your inbox. Essential order, account, and service messages are not affected.</p>
      <div className="mt-10"><EmailPreferencesForm token={token} /></div>
    </main>
  );
}
