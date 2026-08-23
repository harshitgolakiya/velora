"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Download,
  PackageCheck,
  Radio,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type {
  AdminActivityLog,
  AdminCartAnalytics,
  AdminCustomer,
  AdminInventoryRow,
  AdminOrder,
  AdminProduct,
} from "@/lib/admin-catalog";
import {
  buildAdminOverview,
  type OverviewRange,
} from "@/lib/admin-overview";

const money = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0,
});

function Panel({
  title,
  eyebrow,
  children,
  action,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{eyebrow}</p> : null}
          <h2 className="mt-1 text-base font-semibold uppercase tracking-[0.12em]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "green" | "red";
}) {
  const classes = {
    neutral: "bg-[var(--hover)] text-[var(--foreground)]",
    gold: "bg-[var(--accent)] text-[#17262D]",
    green: "bg-emerald-500/10 text-emerald-500",
    red: "bg-red-500/10 text-red-500",
  };
  return <span className={`inline-flex px-2.5 py-1 text-xs font-semibold ${classes[tone]}`}>{children}</span>;
}

function Table({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="border-b border-[var(--border)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
          <tr>{headers.map((header) => <th key={header} className="pb-3 pr-5 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="py-3.5 pr-5">{cell}</td>)}</tr>
          )) : (
            <tr><td colSpan={headers.length} className="py-10 text-center text-[var(--muted)]">{emptyMessage}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function exportOverview(
  range: OverviewRange,
  overview: ReturnType<typeof buildAdminOverview>,
) {
  const rows = [
    ["Period", overview.periodLabel],
    ["Revenue", overview.revenue.toFixed(2)],
    ["Orders", String(overview.currentOrders.length)],
    ...overview.metrics.map((metric) => [metric.label, String(metric.value)]),
    ...overview.topProducts.map((product) => [
      `Product: ${product.title}`,
      `${product.units} units / AED ${product.revenue.toFixed(2)}`,
    ]),
  ];
  const csv = [["Metric", "Value"], ...rows]
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `velora-overview-${range.toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function OverviewDashboard({
  orders,
  customers,
  products,
  inventory,
  cartAnalytics,
  activityLogs,
  adminName,
  onNavigate,
}: {
  orders: AdminOrder[];
  customers: AdminCustomer[];
  products: AdminProduct[];
  inventory: AdminInventoryRow[];
  cartAnalytics: AdminCartAnalytics;
  activityLogs: AdminActivityLog[];
  adminName: string;
  onNavigate: (section: "orders" | "products" | "inventory" | "customers" | "analytics") => void;
}) {
  const [range, setRange] = useState<OverviewRange>("Week");
  const overview = useMemo(
    () => buildAdminOverview({ orders, customers, products, inventory, cartAnalytics }, range),
    [orders, customers, products, inventory, cartAnalytics, range],
  );
  const maxRevenue = Math.max(1, ...overview.timeline.map((point) => point.revenue));
  const funnelMax = Math.max(1, overview.funnel[0]?.value ?? 0);

  return (
    <div className="space-y-6">
      <div className="border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 items-center gap-2 border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold">
              <CalendarDays className="size-4" />
              {overview.periodLabel}
            </span>
            {(["Today", "Week", "Month", "Quarter"] as const).map((option) => (
              <button key={option} type="button" onClick={() => setRange(option)} aria-pressed={range === option} className={`h-10 border border-[var(--border)] px-3 text-sm font-semibold ${range === option ? "bg-[var(--accent)] text-[#17262D]" : "hover:bg-[var(--hover)]"}`}>
                {option}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex h-10 items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 px-3 text-emerald-500"><Radio className="size-4" />Live database</span>
            <span className="inline-flex h-10 items-center gap-2 border border-[var(--border)] px-3"><ShieldCheck className="size-4 text-[var(--accent)]" />{adminName}</span>
            <button type="button" onClick={() => exportOverview(range, overview)} className="inline-flex h-10 items-center gap-2 bg-[var(--foreground)] px-3 font-semibold text-[var(--background)]"><Download className="size-4" />Export</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {overview.metrics.map((metric) => {
          const formatted = metric.format === "money" ? money.format(metric.value) : metric.format === "percent" ? `${metric.value.toFixed(1)}%` : Math.round(metric.value).toLocaleString("en-AE");
          const positive = metric.delta >= 0;
          return (
            <article key={metric.label} className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-sm text-[var(--muted)]">{metric.label}</p><p className="mt-3 text-3xl font-semibold">{formatted}</p></div>
                {metric.delta !== 0 ? <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold ${positive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>{positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{Math.abs(metric.delta).toFixed(1)}%</span> : null}
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">{metric.helper}</p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Panel title="Revenue" eyebrow={`${range} performance`}>
          <div className="flex h-64 items-end gap-2 border-b border-[var(--border)] px-2 pt-6">
            {overview.timeline.map((point) => (
              <div key={point.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                <div title={money.format(point.revenue)} className="w-full bg-[var(--accent)] transition-all" style={{ height: `${Math.max(point.revenue ? 8 : 1, (point.revenue / maxRevenue) * 100)}%` }} />
                <span className="truncate text-center text-[10px] text-[var(--muted)]">{point.label}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Conversion funnel" eyebrow="Cart lifecycle">
          <div className="space-y-5">
            {overview.funnel.map((step, index) => (
              <div key={step.label}>
                <div className="mb-2 flex justify-between text-sm"><span className="font-medium">{step.label}</span><span>{step.value.toLocaleString("en-AE")}</span></div>
                <div className="h-3 bg-[var(--card)]"><div className="h-full bg-[var(--accent)]" style={{ width: `${Math.max(step.value ? 5 : 0, (step.value / funnelMax) * 100)}%` }} /></div>
                {index > 0 ? <p className="mt-1 text-xs text-[var(--muted)]">{overview.funnel[index - 1].value ? ((step.value / overview.funnel[index - 1].value) * 100).toFixed(1) : "0.0"}% from previous step</p> : null}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {overview.queue.map((item) => (
          <article key={item.label} className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-[var(--muted)]">{item.label}</p><p className="mt-3 text-3xl font-semibold">{item.value}</p></div><StatusPill tone={item.priority === "High" ? "red" : item.priority === "Medium" ? "gold" : "green"}>{item.priority}</StatusPill></div>
            <p className="mt-4 text-sm text-[var(--muted)]">{item.detail}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Recent orders" eyebrow="Live order queue" action={<button onClick={() => onNavigate("orders")} className="text-xs font-semibold uppercase underline">Open orders</button>}>
          <Table headers={["Order", "Customer", "Total", "Payment", "Fulfillment"]} emptyMessage="No orders have been placed." rows={overview.recentOrders.map((order) => [
            <span key="number" className="font-semibold">{order.orderNumber}</span>,
            <span key="customer">{order.customerName}<span className="block text-xs text-[var(--muted)]">{order.email}</span></span>,
            money.format(order.total),
            <StatusPill key="payment" tone={order.paymentStatus.toLowerCase() === "paid" ? "green" : "gold"}>{order.paymentStatus}</StatusPill>,
            order.fulfillmentStatus,
          ])} />
        </Panel>
        <Panel title="Operations queue" eyebrow="Actionable work">
          <div className="space-y-3">
            {[
              [Truck, "Process open orders", `${overview.queue[0].value} orders need operational attention.`, "orders" as const],
              [AlertTriangle, "Resolve inventory risk", `${overview.atRiskInventory.length} variants are low or out of stock.`, "inventory" as const],
              [PackageCheck, "Complete catalog", `${overview.catalogHealth[1].value} drafts and ${overview.catalogHealth[3].value} products missing SEO.`, "products" as const],
            ].map(([Icon, title, detail, section]) => (
              <button key={title as string} onClick={() => onNavigate(section as "orders" | "inventory" | "products")} className="flex w-full gap-3 border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:bg-[var(--hover)]">
                <Icon className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" /><span><span className="block font-semibold">{title as string}</span><span className="mt-1 block text-sm text-[var(--muted)]">{detail as string}</span></span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Inventory risk" eyebrow="Available stock" action={<button onClick={() => onNavigate("inventory")} className="text-xs font-semibold uppercase underline">Open inventory</button>}>
          <Table headers={["SKU", "Product", "Variant", "Available"]} emptyMessage="All variants are sufficiently stocked." rows={overview.atRiskInventory.map((row) => [
            <span key="sku" className="font-mono text-xs">{row.sku ?? "No SKU"}</span>,
            row.productName,
            `${row.colorName} / ${row.sizeName}`,
            <span key="stock" className={row.availableStock === 0 ? "font-semibold text-red-500" : "font-semibold text-amber-500"}>{row.availableStock}</span>,
          ])} />
        </Panel>
        <Panel title="Top selling products" eyebrow={`${range} paid orders`} action={<button onClick={() => onNavigate("analytics")} className="text-xs font-semibold uppercase underline">Full analytics</button>}>
          <Table headers={["Product", "Units", "Revenue"]} emptyMessage="No paid product sales in this period." rows={overview.topProducts.map((product) => [product.title, String(product.units), money.format(product.revenue)])} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Customer health" eyebrow="Retention" action={<button onClick={() => onNavigate("customers")} className="text-xs font-semibold uppercase underline">Open customers</button>}>
          <div className="grid gap-3 sm:grid-cols-2">{overview.customerHealth.map((signal) => <div key={signal.label} className="border border-[var(--border)] bg-[var(--card)] p-4"><p className="text-sm text-[var(--muted)]">{signal.label}</p><p className="mt-3 text-2xl font-semibold">{signal.value}</p><p className="mt-1 text-sm text-[var(--muted)]">{signal.detail}</p></div>)}</div>
        </Panel>
        <Panel title="Catalog health" eyebrow="Publishing readiness">
          <div className="grid gap-3 sm:grid-cols-2">{overview.catalogHealth.map((signal) => <button key={signal.label} onClick={() => onNavigate("products")} className="border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:bg-[var(--hover)]"><p className="text-sm text-[var(--muted)]">{signal.label}</p><p className="mt-3 text-2xl font-semibold">{signal.value}</p></button>)}</div>
        </Panel>
      </div>

      <Panel title="Audit trail" eyebrow="Latest team activity">
        <div className="grid gap-4 sm:grid-cols-2">
          {activityLogs.length ? activityLogs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex gap-3"><span className="mt-1 grid size-7 shrink-0 place-items-center border border-[var(--border)] bg-[var(--card)]"><CheckCircle2 className="size-4 text-[var(--accent)]" /></span><div><p className="font-medium">{log.action}</p><p className="mt-1 text-sm text-[var(--muted)]">{log.actor} - {new Date(log.createdAt).toLocaleString("en-AE")}</p></div></div>
          )) : <p className="text-sm text-[var(--muted)]">No admin activity recorded yet.</p>}
        </div>
      </Panel>
    </div>
  );
}
