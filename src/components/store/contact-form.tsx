"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, CreditCard, PackageCheck, RefreshCcw, Shirt, Truck } from "lucide-react";

type ActiveOrder = { orderNumber: string; status: string };
const categories = [
  ["ORDER", "Order help", PackageCheck], ["DELIVERY", "Delivery", Truck], ["RETURN", "Return or exchange", RefreshCcw], ["PRODUCT", "Product and fit", Shirt], ["PAYMENT", "Payment", CreditCard],
] as const;
const fieldClass = "field";

export function ContactForm({ activeOrders, defaultName = "", defaultEmail = "", defaultCategory, defaultOrderNumber, product, source }: { activeOrders: ActiveOrder[]; defaultName?: string; defaultEmail?: string; defaultCategory?: string; defaultOrderNumber?: string; product?: string; source?: string }) {
  const validCategory = categories.some(([value]) => value === defaultCategory) ? defaultCategory! : "ORDER";
  const [category, setCategory] = useState(validCategory);
  const [orderNumber, setOrderNumber] = useState(defaultOrderNumber ?? activeOrders[0]?.orderNumber ?? "");
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

  if (result?.ok) return <div className="storefront-railed px-5 py-16 text-center sm:px-6" role="status"><CheckCircle2 className="mx-auto size-8 text-[var(--accent-text)]" /><h2 className="display-md mt-4">Request received</h2><p className="mt-2 text-sm text-[var(--muted)]">Reference {result.caseNumber}. A confirmation was sent by email.</p><button type="button" onClick={() => setResult(null)} className="storefront-action mt-6 min-h-10 px-2 text-sm font-semibold underline underline-offset-4">Send another request</button></div>;

  return <div className="mt-10 grid gap-10 lg:grid-cols-[300px_1fr]">
    <aside><p className="eyebrow eyebrow-muted">What do you need help with?</p><div className="storefront-railed mt-4 divide-y divide-[var(--border)]">{categories.map(([value, label, Icon]) => <button key={value} type="button" onClick={() => setCategory(value)} aria-pressed={category === value} className={`storefront-action flex w-full items-center gap-3 px-4 py-4 text-start text-sm transition hover:text-[var(--foreground)] motion-reduce:transition-none ${category === value ? "font-semibold" : "text-[var(--muted)]"}`}><Icon className="size-4" />{label}</button>)}</div></aside>
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      {(source || product || defaultOrderNumber) ? <div className="storefront-railed bg-[var(--hover)] p-4 text-sm sm:col-span-2"><p className="font-semibold">We carried your details into this request</p><p className="mt-1 text-[var(--muted)]">{product ? `Product: ${product}. ` : ""}{defaultOrderNumber ? `Order: ${defaultOrderNumber}. ` : ""}You can edit the fields below.</p></div> : null}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="grid gap-2 text-sm font-medium">Name<input name="name" required minLength={2} defaultValue={defaultName} className={fieldClass} /></label>
      <label className="grid gap-2 text-sm font-medium">Email<input name="email" type="email" required defaultValue={defaultEmail} suppressHydrationWarning className={fieldClass} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">Related order<select value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} className={fieldClass}><option value="">No order selected</option>{defaultOrderNumber && !activeOrders.some((order) => order.orderNumber === defaultOrderNumber) ? <option value={defaultOrderNumber}>{defaultOrderNumber} / selected order</option> : null}{activeOrders.map((order) => <option key={order.orderNumber} value={order.orderNumber}>{order.orderNumber} / {order.status}</option>)}</select>{activeOrders.length ? <span className="text-xs font-normal text-[var(--muted)]">Your active orders are listed automatically.</span> : null}</label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">Subject<input name="subject" required minLength={4} defaultValue={product ? `Help with ${product}` : defaultOrderNumber ? `Help with order ${defaultOrderNumber}` : ""} className={fieldClass} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">How can we help?<textarea name="message" required minLength={20} rows={7} className="field" /></label>
      {result && !result.ok ? <p role="alert" className="text-sm text-[var(--sale)] sm:col-span-2">{result.message}</p> : null}
      <div className="storefront-railed p-4 text-xs leading-5 text-[var(--muted)] sm:col-span-2"><strong className="text-[var(--foreground)]">Before you send:</strong> our <a href="/faqs" className="underline underline-offset-4">FAQs</a>, <a href="/shipping" className="underline underline-offset-4">delivery guide</a>, and <a href="/returns" className="underline underline-offset-4">returns policy</a> may have an immediate answer. You can still contact us below.</div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2"><button disabled={submitting} className="btn btn-primary">{submitting ? "Sending..." : "Send request"}</button><span className="text-xs text-[var(--muted)]">Typical reply: within one business day.</span></div>
    </form>
  </div>;
}
