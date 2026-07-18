"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Clock3, ExternalLink, History } from "lucide-react";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { getCatalogQualityWarnings } from "@/lib/catalog-quality";
import type {
  AdminActivityLog,
  AdminCategoryOption,
  AdminCollectionOption,
  AdminMediaAsset,
  AdminProduct,
  AdminTag,
} from "@/lib/admin-catalog";

export function ProductDetailPage({
  product,
  categories,
  collections,
  tags,
  mediaAssets,
  auditLogs,
}: {
  product: AdminProduct;
  categories: AdminCategoryOption[];
  collections: AdminCollectionOption[];
  tags: AdminTag[];
  mediaAssets: AdminMediaAsset[];
  auditLogs: AdminActivityLog[];
}) {
  const [activeTab, setActiveTab] = useState<"editor" | "quality" | "audit">("editor");
  const qualityWarnings = getCatalogQualityWarnings(product, mediaAssets);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex h-10 items-center gap-2 border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--hover)]"
          >
            <ArrowLeft className="size-4" />
            Products
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/products/${product.id}/preview`}
              className="inline-flex h-10 items-center gap-2 border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--hover)]"
            >
              Preview
              <ExternalLink className="size-4" />
            </Link>
            <Link
              href={`/product/${product.slug}`}
              className="inline-flex h-10 items-center gap-2 border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--hover)]"
            >
              Storefront
              <ExternalLink className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-[var(--border)]">
          {[
            ["editor", "Product editor"],
            ["quality", `Quality (${qualityWarnings.length})`],
            ["audit", `Audit history (${auditLogs.length})`],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key as "editor" | "quality" | "audit")}
              className={`border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                activeTab === key
                  ? "border-[var(--accent)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "editor" ? (
          <ProductEditForm
            product={product}
            categories={categories}
            collections={collections}
            tags={tags}
            mediaAssets={mediaAssets}
            mode="edit"
          />
        ) : activeTab === "quality" ? (
          <ProductQualityWarnings product={product} warnings={qualityWarnings} />
        ) : (
          <ProductAuditHistory product={product} auditLogs={auditLogs} />
        )}
      </div>
    </div>
  );
}

function ProductQualityWarnings({
  product,
  warnings,
}: {
  product: AdminProduct;
  warnings: ReturnType<typeof getCatalogQualityWarnings>;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="h-fit border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          <AlertTriangle className="size-4" />
          Catalog quality
        </div>
        <h2 className="mt-3 text-2xl font-semibold">{product.name}</h2>
        <div className="mt-5 grid gap-3 text-sm">
          <div className="border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Critical</p>
            <p className="mt-1 text-2xl font-semibold">{warnings.filter((warning) => warning.severity === "critical").length}</p>
          </div>
          <div className="border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Warnings</p>
            <p className="mt-1 text-2xl font-semibold">{warnings.filter((warning) => warning.severity === "warning").length}</p>
          </div>
        </div>
      </aside>

      <div className="border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">Publishing checks</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Fix missing galleries, low-resolution images, repeated media, and inconsistent image ratios before pushing a product live.</p>
        </div>

        {warnings.length ? (
          <div className="divide-y divide-[var(--border)]">
            {warnings.map((warning, index) => (
              <article key={`${warning.code}-${index}`} className="grid gap-3 px-5 py-4 sm:grid-cols-[120px_1fr]">
                <span
                  className={`h-fit w-fit px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    warning.severity === "critical"
                      ? "bg-red-500/10 text-red-600"
                      : "bg-[var(--accent)]/20 text-[var(--foreground)]"
                  }`}
                >
                  {warning.severity}
                </span>
                <div>
                  <p className="font-semibold">{warning.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{warning.detail}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-[var(--muted)]">
            No catalog quality warnings for this product.
          </div>
        )}
      </div>
    </section>
  );
}

function formatStableDate(value: string) {
  return `${new Date(value).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function ProductAuditHistory({
  product,
  auditLogs,
}: {
  product: AdminProduct;
  auditLogs: AdminActivityLog[];
}) {
  const lastUpdated = auditLogs[0]?.createdAt ?? product.updatedAt;

  return (
    <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="h-fit border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          <History className="size-4" />
          Product audit
        </div>
        <h2 className="mt-3 text-2xl font-semibold">{product.name}</h2>
        <div className="mt-5 grid gap-3 text-sm">
          <div className="border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">SKU</p>
            <p className="mt-1 font-mono text-xs">{product.sku}</p>
          </div>
          <div className="border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Current status</p>
            <p className="mt-1">{product.status}</p>
          </div>
          <div className="border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Latest change</p>
            <p className="mt-1">{formatStableDate(lastUpdated)}</p>
          </div>
        </div>
      </aside>

      <div className="border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Change history</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Product edits, publishing changes, and related inventory updates.</p>
          </div>
          <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            {auditLogs.length} events
          </span>
        </div>

        {auditLogs.length ? (
          <div className="divide-y divide-[var(--border)]">
            {auditLogs.map((log) => (
              <article key={log.id} className="grid gap-4 px-5 py-4 md:grid-cols-[180px_1fr]">
                <div className="text-xs text-[var(--muted)]">
                  <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.12em]">
                    <Clock3 className="size-3.5" />
                    {formatStableDate(log.createdAt)}
                  </div>
                  <p className="mt-2">{log.actor}</p>
                  <p className="mt-1 capitalize">{log.entityType.replaceAll("_", " ")}</p>
                </div>
                <div>
                  <p className="font-semibold">{log.action}</p>
                  {log.metadata && Object.keys(log.metadata).length ? (
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(log.metadata).map(([key, value]) => (
                        <div key={key} className="border border-[var(--border)] bg-[var(--card)] p-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            {key.replaceAll("_", " ")}
                          </dt>
                          <dd className="mt-1 break-words text-xs">{formatMetadataValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-[var(--muted)]">
            No audit events recorded for this product yet.
          </div>
        )}
      </div>
    </section>
  );
}
