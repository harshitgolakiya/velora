"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, CreditCard, PackageCheck, RefreshCcw, Shirt, Truck } from "lucide-react";

type ActiveOrder = { orderNumber: string; status: string };
const categories = [
  ["ORDER", "Order help", PackageCheck], ["DELIVERY", "Delivery", Truck], ["RETURN", "Return or exchange", RefreshCcw], ["PRODUCT", "Product and fit", Shirt], ["PAYMENT", "Payment", CreditCard],
] as const;
const fieldClass = "h-12 border border-[var(--border)] bg-[var(--surface)] px-4 outline-none transition focus:border-[var(--accent)] motion-reduce:transition-none";

export function ContactForm({ activeOrders, defaultName = "", defaultEmail = "" }: { activeOrders: ActiveOrder[]; defaultName?: string; defaultEmail?: string }) {
  const [category, setCategory] = useState("ORDER");
  const [orderNumber, setOrderNumber] = useState(activeOrders[0]?.orderNumber ?? "");
  const [startedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; caseNumber?: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setResult(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), category, subject: form.get("subject"), message: form.get("message"), orderNumber: orderNumber || undefined, website: form.get("website"), startedAt }) });
    const data = await response.json();
    setSubmitting(false);
    setResult({ ok: response.ok, message: data.message ?? "Unable to send request", caseNumber: data.caseNumber });
    if (response.ok) event.currentTarget.reset();
  }

  if (result?.ok) return <div className="border-y border-[var(--border)] py-16 text-center" role="status"><CheckCircle2 className="mx-auto size-8 text-emerald-600" /><h2 className="mt-4 text-2xl font-semibold">Request received</h2><p className="mt-2 text-sm text-[var(--muted)]">Reference {result.caseNumber}. A confirmation was sent by email.</p><button type="button" onClick={() => setResult(null)} className="mt-6 text-sm font-semibold underline underline-offset-4">Send another request</button></div>;

  return <div className="mt-10 grid gap-10 lg:grid-cols-[300px_1fr]">
    <aside><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">What do you need help with?</p><div className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">{categories.map(([value, label, Icon]) => <button key={value} type="button" onClick={() => setCategory(value)} aria-pressed={category === value} className={`flex w-full items-center gap-3 py-4 text-start text-sm transition hover:text-[var(--foreground)] motion-reduce:transition-none ${category === value ? "font-semibold" : "text-[var(--muted)]"}`}><Icon className="size-4" />{label}</button>)}</div></aside>
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="grid gap-2 text-sm font-medium">Name<input name="name" required minLength={2} defaultValue={defaultName} className={fieldClass} /></label>
      <label className="grid gap-2 text-sm font-medium">Email<input name="email" type="email" required defaultValue={defaultEmail} className={fieldClass} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">Related order<select value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} className={fieldClass}><option value="">No order selected</option>{activeOrders.map((order) => <option key={order.orderNumber} value={order.orderNumber}>{order.orderNumber} / {order.status}</option>)}</select>{activeOrders.length ? <span className="text-xs font-normal text-[var(--muted)]">Your active orders are listed automatically.</span> : null}</label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">Subject<input name="subject" required minLength={4} className={fieldClass} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">How can we help?<textarea name="message" required minLength={20} rows={7} className="border border-[var(--border)] bg-[var(--surface)] p-4 outline-none transition focus:border-[var(--accent)] motion-reduce:transition-none" /></label>
      {result && !result.ok ? <p role="alert" className="text-sm text-red-500 sm:col-span-2">{result.message}</p> : null}
      <div className="sm:col-span-2"><button disabled={submitting} className="h-12 bg-[var(--foreground)] px-7 text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent)] hover:text-stone-950 disabled:opacity-50 motion-reduce:transition-none">{submitting ? "Sending..." : "Send request"}</button></div>
    </form>
  </div>;
}
