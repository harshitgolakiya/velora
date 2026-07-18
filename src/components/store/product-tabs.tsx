"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { getProductFitGuidance } from "@/lib/fit-guidance";
import { isGenericProductCopy, splitProductCopy } from "@/lib/product-copy";

const TABS = ["Size & Fit", "Details", "Delivery & Returns"] as const;
type Tab = (typeof TABS)[number];

export function ProductTabs({ product }: { product: Product }) {
  const [active, setActive] = useState<Tab>("Size & Fit");
  const copy = splitProductCopy(product.description);
  const fitGuidance = getProductFitGuidance(product);
  const showFabric = product.fabric && !isGenericProductCopy(product.fabric);
  const showCare = product.care && !isGenericProductCopy(product.care);

  return (
    <section className="mt-20 border-t border-[var(--border)]" aria-label="Product information">
      <div className="flex overflow-x-auto border-b border-[var(--border)]" role="tablist">
        {TABS.map((tab) => (
          <button
            type="button"
            role="tab"
            aria-selected={active === tab}
            key={tab}
            onClick={() => setActive(tab)}
            className={`shrink-0 border-b-2 px-5 py-4 text-xs font-semibold uppercase tracking-widest transition-colors ${
              active === tab
                ? "border-[var(--foreground)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-w-3xl py-8 text-sm leading-7 text-[var(--muted)]" role="tabpanel">
        {active === "Size & Fit" ? (
          <div className="grid gap-8 sm:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <p className="text-[var(--foreground)]">{fitGuidance.fit}</p>
              <p>{fitGuidance.sizeAdvice}</p>
              <p>{fitGuidance.model}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">Key fit notes</p>
              <ul className="mt-3 space-y-2">
                {fitGuidance.dimensions.map((dimension) => (
                  <li key={dimension} className="border-b border-[var(--border)] pb-2">{dimension}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {active === "Details" ? (
          <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-[140px_1fr]">
            <dt className="font-medium text-[var(--foreground)]">Description</dt>
            <dd>{copy.summary}</dd>
            {copy.productDetails ? (
              <>
                <dt className="font-medium text-[var(--foreground)]">Product details</dt>
                <dd>{copy.productDetails}</dd>
              </>
            ) : null}
            {showFabric ? (
              <>
                <dt className="font-medium text-[var(--foreground)]">Fabric</dt>
                <dd>{product.fabric}</dd>
              </>
            ) : null}
            {showCare ? (
              <>
                <dt className="font-medium text-[var(--foreground)]">Care</dt>
                <dd>{product.care}</dd>
              </>
            ) : null}
            {copy.fabricCare ? (
              <>
                <dt className="font-medium text-[var(--foreground)]">Fabric & care</dt>
                <dd>{copy.fabricCare}</dd>
              </>
            ) : null}
            {product.sku ? (
              <>
                <dt className="font-medium text-[var(--foreground)]">Product code</dt>
                <dd>{product.sku}</dd>
              </>
            ) : null}
            {product.tags?.length ? (
              <>
                <dt className="font-medium text-[var(--foreground)]">Tags</dt>
                <dd>{product.tags.join(", ")}</dd>
              </>
            ) : null}
          </dl>
        ) : null}

        {active === "Delivery & Returns" ? (
          <ul className="space-y-2">
            <li>Complimentary standard delivery on eligible orders over AED 300.</li>
            <li>Delivery timing and available shipping methods are confirmed at checkout.</li>
            <li>Eligible full-price items may be returned within 14 days in unworn condition with tags attached.</li>
            <li>Final-sale and hygiene-restricted items are not eligible for return.</li>
          </ul>
        ) : null}
      </div>
    </section>
  );
}
