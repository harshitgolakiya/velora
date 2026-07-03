import type { Metadata } from "next";
import { CmsPage } from "@/components/store/cms-page";
import { getReturnSettings } from "@/lib/store-settings";
import { localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = { alternates: localizedAlternates("/returns") };

export default async function ReturnsPage() { const settings = await getReturnSettings(); return <><CmsPage slug="returns" label="Returns and Exchanges" fallback={[{ id: "returns-hero", type: "HERO", eyebrow: "Client services", heading: "Returns without uncertainty.", body: "Start eligible returns and size exchanges directly from your order details." }, { id: "returns-process", type: "CARDS", heading: "How it works", items: [{ title: "1. Open your order", body: "Sign in and choose an eligible delivered order." }, { title: "2. Choose a resolution", body: "Available return, exchange, and refund-review options are calculated from policy and stock." }, { title: "3. Follow progress", body: "Track pickup, inspection, replacement, and refund progress from your account." }] }]} /><section className="mx-auto -mt-8 mb-16 max-w-360 px-4 sm:px-6 lg:px-8"><div className="border-y border-[var(--border)] py-6"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Current return policy</p><p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">Eligible requests use a {settings.returnWindowDays}-day window after delivery. {settings.policySummary}</p></div></section></>; }
