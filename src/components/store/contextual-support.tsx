"use client";

import Link from "next/link";
import { CircleHelp, ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";
import { localizedPath, localeFromPathname } from "@/lib/i18n";

type SupportContext = "product" | "cart" | "checkout" | "order" | "return" | "tracking";

const guidance: Record<SupportContext, { title: string; body: string; category: string; links: Array<[string, string]> }> = {
  product: { title: "Need product guidance?", body: "Get help with fit, fabric, care, or choosing the right style.", category: "PRODUCT", links: [["Size guide", "/size-guide"], ["Product FAQs", "/faqs"]] },
  cart: { title: "Questions before you order?", body: "Review delivery, returns, and sizing—or ask our team for help.", category: "PRODUCT", links: [["Delivery information", "/shipping"], ["Returns policy", "/returns"]] },
  checkout: { title: "Checkout help", body: "Find payment and delivery answers without losing your progress.", category: "PAYMENT", links: [["Payment FAQs", "/faqs"], ["Delivery information", "/shipping"]] },
  order: { title: "Need help with this order?", body: "Your order number will be included automatically when you contact us.", category: "ORDER", links: [["Track order", "/track-order"], ["Returns policy", "/returns"]] },
  return: { title: "Need help with your return?", body: "Review eligibility first, or contact us with this order already attached.", category: "RETURN", links: [["Returns policy", "/returns"], ["Return FAQs", "/faqs"]] },
  tracking: { title: "Delivery not as expected?", body: "Check common delivery answers or send the order details to our care team.", category: "DELIVERY", links: [["Delivery information", "/shipping"], ["Delivery FAQs", "/faqs"]] },
};

export function ContextualSupport({ context, orderNumber, product, compact = false }: { context: SupportContext; orderNumber?: string; product?: string; compact?: boolean }) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const content = guidance[context];
  const query = new URLSearchParams({ category: content.category, source: context, returnTo: pathname });
  if (orderNumber) query.set("order", orderNumber);
  if (product) query.set("product", product);

  return (
    <aside className={`card ${compact ? "p-4" : "p-5 sm:p-6"}`} aria-label="Customer support">
      <div className="flex gap-3">
        <CircleHelp className="mt-0.5 size-5 shrink-0 text-[var(--accent-text)]" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{content.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{content.body}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
            {content.links.map(([label, href]) => <Link key={href} href={localizedPath(href, locale)} className="underline underline-offset-4">{label}</Link>)}
            <Link href={`${localizedPath("/contact", locale)}?${query}`} className="inline-flex items-center gap-1 text-[var(--accent-text)] underline underline-offset-4">Contact customer care <ExternalLink className="size-3" /></Link>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">Typical reply time: within one business day.</p>
        </div>
      </div>
    </aside>
  );
}
