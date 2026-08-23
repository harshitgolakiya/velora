"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Eye,
  FileDown,
  FileText,
  FolderTree,
  GripVertical,
  ImageIcon,
  Layers3,
  LifeBuoy,
  Loader2,
  Mail,
  Megaphone,
  Package,
  Palette,
  Plus,
  Ruler,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import type {
  AdminActivityLog,
  AdminUser,
  AdminCategory,
  AdminColor,
  AdminCategoryOption,
  AdminCartAnalytics,
  AdminCartReservationSummary,
  AdminCollection,
  AdminCollectionProductAssignment,
  AdminCollectionOption,
  AdminCheckoutSettings,
  AdminCoupon,
  AdminNewsletterSubscriber,
  AdminEmailIntegration,
  AdminEmailDelivery,
  AdminAutomationEvent,
  AdminEmailProviderEvent,
  AdminPaymentProviderEvent,
  AdminAutomationReportRow,
  AdminAutomationWorkflow,
  AdminScheduledReport,
  AdminCustomer,
  AdminEventDiagnostics,
  AdminGlobalContentSettings,
  AdminGiftCard,
  AdminInventoryAnomaly,
  AdminHomepageSection,
  AdminInventoryRow,
  AdminMediaAsset,
  AdminOrder,
  AdminProduct,
  AdminProductAlertDelivery,
  AdminReview,
  AdminRecommendationSettings,
  AdminReturnRequest,
  AdminReturnSettings,
  AdminSize,
  AdminSearchMerchandisingSettings,
  AdminTag,
  AdminTranslationCoverage,
} from "@/lib/admin-catalog";
import { ThemeToggle } from "@/components/store/theme-toggle";
import type { AdminAccess } from "@/lib/admin-permissions";
import type { GlobalContent, GlobalFooterGroup, GlobalLinkItem, LocalizedText } from "@/lib/global-content";
import { OverviewDashboard } from "./overview-dashboard";
import { ProductEditForm } from "./product-edit-form";
import { getReturnRequestTransitions, type ReturnRequestStatus } from "@/lib/return-request-lifecycle";
import { filterGroupLabels, normalizeFilterSettings, type FilterGroupId, type FilterSettings } from "@/lib/filter-settings";

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminCatalog = {
  products: AdminProduct[];
  reviews: AdminReview[];
  returnRequests: AdminReturnRequest[];
  categories: AdminCategory[];
  collections: AdminCollection[];
  colors: AdminColor[];
  sizes: AdminSize[];
  tags: AdminTag[];
  inventory: AdminInventoryRow[];
  orders: AdminOrder[];
  customers: AdminCustomer[];
  coupons: AdminCoupon[];
  giftCards: AdminGiftCard[];
  activityLogs: AdminActivityLog[];
  adminUsers: AdminUser[];
  homepageSections: AdminHomepageSection[];
  mediaAssets: AdminMediaAsset[];
  newsletterSubscribers: AdminNewsletterSubscriber[];
  emailIntegrations: AdminEmailIntegration[];
  automationWorkflows: AdminAutomationWorkflow[];
  scheduledReports: AdminScheduledReport[];
  cartAnalytics: AdminCartAnalytics;
  cartReservationSummary: AdminCartReservationSummary;
  inventoryAnomalies: AdminInventoryAnomaly[];
  eventDiagnostics: AdminEventDiagnostics;
  automationReport: AdminAutomationReportRow[];
  emailDeliveries: AdminEmailDelivery[];
  automationEvents: AdminAutomationEvent[];
  emailProviderEvents: AdminEmailProviderEvent[];
  paymentProviderEvents: AdminPaymentProviderEvent[];
  checkoutSettings: AdminCheckoutSettings;
  returnSettings: AdminReturnSettings;
  recommendationSettings: AdminRecommendationSettings;
  searchMerchandisingSettings: AdminSearchMerchandisingSettings;
  globalContentSettings: AdminGlobalContentSettings;
  productAlertDeliveries: AdminProductAlertDelivery[];
  translationCoverage: AdminTranslationCoverage;
};

type TranslationEntity = "product" | "category" | "collection" | "homepageSection";

type TranslationDraft = {
  title: string;
  name: string;
  description: string;
  summary: string;
  fabricDetails: string;
  careInstructions: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  seoTitle: string;
  seoDescription: string;
};

type HomepageCategoryMediaDraft = {
  id: string;
  title: string;
  href: string;
  mediaType: "IMAGE" | "VIDEO" | "CLOUDFLARE_STREAM";
  imageUrl: string;
  videoUrl: string;
  cloudflareStreamId: string;
  posterUrl: string;
};

const emptyTranslationDraft: TranslationDraft = {
  title: "",
  name: "",
  description: "",
  summary: "",
  fabricDetails: "",
  careInstructions: "",
  subtitle: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
  seoTitle: "",
  seoDescription: "",
};

function emptyHomepageCategoryMedia(index = 0): HomepageCategoryMediaDraft {
  return {
    id: `category-media-${Date.now()}-${index}`,
    title: "",
    href: "",
    mediaType: "IMAGE",
    imageUrl: "",
    videoUrl: "",
    cloudflareStreamId: "",
    posterUrl: "",
  };
}

function parseHomepageCategoryMediaItems(value: unknown): HomepageCategoryMediaDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        id: typeof row.id === "string" && row.id ? row.id : `category-media-${index}`,
        title: typeof row.title === "string" ? row.title : "",
        href: typeof row.href === "string" ? row.href : "",
        mediaType: row.mediaType === "VIDEO" || row.mediaType === "CLOUDFLARE_STREAM" ? row.mediaType : "IMAGE",
        imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : "",
        videoUrl: typeof row.videoUrl === "string" ? row.videoUrl : "",
        cloudflareStreamId: typeof row.cloudflareStreamId === "string" ? row.cloudflareStreamId : "",
        posterUrl: typeof row.posterUrl === "string" ? row.posterUrl : "",
      } satisfies HomepageCategoryMediaDraft;
    })
    .filter(Boolean) as HomepageCategoryMediaDraft[];
}

function normalizeHomepageCategoryMediaItems(items: HomepageCategoryMediaDraft[]) {
  return items
    .map((item, index) => ({
      id: item.id || `category-media-${index}`,
      title: item.title.trim(),
      href: item.href.trim(),
      mediaType: item.mediaType,
      imageUrl: item.imageUrl.trim(),
      videoUrl: item.videoUrl.trim(),
      cloudflareStreamId: item.cloudflareStreamId.trim(),
      posterUrl: item.posterUrl.trim(),
    }))
    .filter((item) => item.title && item.href);
}

const focalPointOptions = [
  ["50% 50%", "Center"],
  ["50% 0%", "Top center"],
  ["50% 100%", "Bottom center"],
  ["0% 50%", "Left center"],
  ["100% 50%", "Right center"],
  ["0% 0%", "Top left"],
  ["100% 0%", "Top right"],
  ["0% 100%", "Bottom left"],
  ["100% 100%", "Bottom right"],
] as const;

const cropRatioOptions = [
  ["", "Default for section"],
  ["16 / 9", "Wide 16:9"],
  ["16 / 10", "Editorial 16:10"],
  ["4 / 5", "Portrait 4:5"],
  ["3 / 4", "Tall 3:4"],
  ["1 / 1", "Square 1:1"],
] as const;

function settingString(settings: Record<string, unknown> | undefined, key: string, fallback = "") {
  const value = settings?.[key];
  return typeof value === "string" ? value : fallback;
}

const adminRoleOptions: AdminUser["role"][] = [
  "SUPER_ADMIN",
  "MANAGER",
  "ORDER_MANAGER",
  "CONTENT_EDITOR",
];

const adminRoleLabels: Record<AdminUser["role"], string> = {
  SUPER_ADMIN: "Super admin",
  MANAGER: "Manager",
  ORDER_MANAGER: "Support",
  CONTENT_EDITOR: "Content editor",
};

const homepageSectionTypes: AdminHomepageSection["type"][] = [
  "HERO",
  "FEATURED_PRODUCTS",
  "COLLECTION_STORY",
  "PRODUCT_GRID",
  "STORY_BAND",
  "NEWSLETTER",
  "CUSTOM",
];

const homepageSectionTypeLabels: Record<AdminHomepageSection["type"], string> = {
  HERO: "Hero",
  FEATURED_PRODUCTS: "Featured products",
  COLLECTION_STORY: "Collection story",
  PRODUCT_GRID: "Product grid",
  STORY_BAND: "Story band",
  NEWSLETTER: "Newsletter",
  CUSTOM: "Custom",
};

type AdminAlert = {
  type: "High" | "Medium" | "Low";
  message: string;
};

type AdminSearchResult = {
  id: string;
  section: Section;
  title: string;
  subtitle: string;
  href?: string;
};

type ConfirmPending = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
};

const sections = [
  ["overview", "Overview", BarChart3],
  ["products", "Products", Package],
  ["reviews", "Reviews", Star],
  ["categories", "Categories", FolderTree],
  ["collections", "Collections", Layers3],
  ["attributes", "Attributes", Palette],
  ["orders", "Orders", ClipboardList],
  ["returns", "Returns", RotateCcw],
  ["customers", "Customers", Users],
  ["marketing", "Marketing", Megaphone],
  ["inventory", "Inventory", Boxes],
  ["analytics", "Analytics", Activity],
  ["security", "Security", ShieldCheck],
  ["media", "Media", ImageIcon],
  ["automation", "Automation", Sparkles],
  ["content", "Content", FileText],
  ["support", "Support", LifeBuoy],
  ["settings", "Settings", SlidersHorizontal],
] as const;

type Section = (typeof sections)[number][0];
const sectionKeys = new Set(sections.map(([key]) => key));
const sectionPermissionMap: Partial<Record<Section, string>> = {
  products: "catalog:write",
  reviews: "catalog:write",
  categories: "catalog:write",
  collections: "catalog:write",
  attributes: "catalog:write",
  orders: "orders:write",
  returns: "orders:write",
  customers: "customers:read",
  marketing: "marketing:write",
  inventory: "inventory:write",
  analytics: "analytics:read",
  security: "security:write",
  media: "media:write",
  automation: "marketing:write",
  content: "catalog:write",
  support: "orders:write",
  settings: "orders:write",
};

function getStoredAdminSection(): Section {
  if (typeof window === "undefined") return "overview";

  const fromHash = window.location.hash.replace("#", "");
  if (sectionKeys.has(fromHash as Section)) return fromHash as Section;

  const fromQuery = new URLSearchParams(window.location.search).get("section");
  if (fromQuery && sectionKeys.has(fromQuery as Section)) return fromQuery as Section;

  const fromStorage = window.localStorage.getItem("velora-admin-section");
  if (fromStorage && sectionKeys.has(fromStorage as Section)) return fromStorage as Section;

  return "overview";
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatAdminMoney(value: number) {
  return `AED ${value.toLocaleString("en-AE", { maximumFractionDigits: 2 })}`;
}

function formatAdminDate(value?: string) {
  if (!value) return "No orders yet";

  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTimeLocal(value?: string) {
  if (!value) return "";
  return value.slice(0, 16);
}

function recordToLines(record: Record<string, string | string[]>) {
  return Object.entries(record)
    .map(([query, value]) => `${query} => ${Array.isArray(value) ? value.join(", ") : value}`)
    .join("\n");
}

function parseLines(value: string, mode: "single" | "list") {
  return Object.fromEntries(
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [rawQuery, ...rawValueParts] = line.split("=>");
        const query = rawQuery.trim();
        const rawValue = rawValueParts.join("=>").trim();
        if (!query || !rawValue) return null;
        return [
          query,
          mode === "single"
            ? rawValue
            : rawValue.split(",").map((item) => item.trim()).filter(Boolean),
        ] as const;
      })
      .filter((entry): entry is readonly [string, string | string[]] => Boolean(entry)),
  );
}

function FilterSettingsEditor({
  value,
  onChange,
}: {
  value: FilterSettings;
  onChange: (next: FilterSettings) => void;
}) {
  const moveGroup = (group: FilterGroupId, direction: -1 | 1) => {
    const index = value.groupOrder.indexOf(group);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= value.groupOrder.length) return;
    const nextOrder = [...value.groupOrder];
    [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
    onChange({ ...value, groupOrder: nextOrder });
  };

  const toggleGroup = (group: FilterGroupId, visible: boolean) => {
    onChange({
      ...value,
      hiddenGroups: visible
        ? value.hiddenGroups.filter((item) => item !== group)
        : Array.from(new Set([...value.hiddenGroups, group])),
    });
  };

  return (
    <Panel title="Filter controls">
      <div className="grid gap-2">
        {value.groupOrder.map((group, index) => {
          const visible = !value.hiddenGroups.includes(group);
          return (
            <div
              key={group}
              className="grid gap-3 border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <label className="inline-flex items-center gap-3 font-medium">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(event) => toggleGroup(group, event.target.checked)}
                  className="size-4 accent-[var(--accent)]"
                />
                {filterGroupLabels[group]}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveGroup(group, -1)}
                  className="grid size-9 place-items-center border border-[var(--border)] disabled:opacity-40"
                  aria-label={`Move ${filterGroupLabels[group]} up`}
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={index === value.groupOrder.length - 1}
                  onClick={() => moveGroup(group, 1)}
                  className="grid size-9 place-items-center border border-[var(--border)] disabled:opacity-40"
                  aria-label={`Move ${filterGroupLabels[group]} down`}
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AdminTable({
  headers,
  rows,
  onRowClick,
  emptyMessage = "No records found.",
}: {
  headers: string[];
  rows: React.ReactNode[][];
  onRowClick?: (index: number) => void;
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b border-[var(--border)]">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="pb-3 pr-5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.length ? (
            rows.map((row, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(i) : undefined}
                className={`transition hover:bg-[var(--hover)] ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {row.map((cell, j) => (
                  <td key={j} className="py-3.5 pr-5 align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length} className="py-10 text-center text-sm text-[var(--muted)]">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= pageSize) return null;

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 border border-[var(--border)] px-3 font-semibold uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-16 text-center font-semibold text-[var(--foreground)]">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 border border-[var(--border)] px-3 font-semibold uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

const pillTones: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600",
  AWAITING_CUSTOMER: "bg-orange-500/10 text-orange-600",
  PAID: "bg-emerald-500/10 text-emerald-600",
  PROCESSING: "bg-amber-500/10 text-amber-600",
  SHIPPED: "bg-blue-500/10 text-blue-600",
  DELIVERED: "bg-emerald-500/10 text-emerald-600",
  CANCELLED: "bg-red-500/10 text-red-500",
  REFUNDED: "bg-red-500/10 text-red-500",
  APPROVED: "bg-emerald-500/10 text-emerald-600",
  PICKUP_SCHEDULED: "bg-blue-500/10 text-blue-600",
  PICKED_UP: "bg-blue-500/10 text-blue-600",
  RECEIVED: "bg-purple-500/10 text-purple-600",
  INSPECTED: "bg-violet-500/10 text-violet-600",
  REFUND_PROCESSING: "bg-orange-500/10 text-orange-600",
  REPLACEMENT_CREATED: "bg-cyan-500/10 text-cyan-600",
  COMPLETED: "bg-emerald-500/10 text-emerald-600",
  REJECTED: "bg-red-500/10 text-red-500",
  paid: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
  refunded: "bg-red-500/10 text-red-500",
  Processing: "bg-amber-500/10 text-amber-600",
  Shipped: "bg-blue-500/10 text-blue-600",
  Delivered: "bg-emerald-500/10 text-emerald-600",
  Cancelled: "bg-red-500/10 text-red-500",
  "Refund review": "bg-orange-500/10 text-orange-500",
  Published: "bg-emerald-500/10 text-emerald-600",
  Scheduled: "bg-blue-500/10 text-blue-600",
  Draft: "bg-[var(--hover)] text-[var(--muted)]",
  "Low stock": "bg-red-500/10 text-red-500",
  "In stock": "bg-emerald-500/10 text-emerald-600",
  Paid: "bg-emerald-500/10 text-emerald-600",
  Refunded: "bg-red-500/10 text-red-500",
  "Partial refund": "bg-orange-500/10 text-orange-500",
  "Issue history": "bg-orange-500/10 text-orange-500",
};

function StatusPill({ label }: { label: string }) {
  const cls =
    pillTones[label] ?? "bg-[var(--hover)] text-[var(--foreground)]";
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function humanizeAdminValue(value?: string) {
  if (!value) return "Not captured";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function printInvoice(order: AdminOrder) {
  const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${order.orderNumber}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; color: #111; }
    .page { max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .brand { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.03em; }
    .small { font-size: 0.85rem; color: #555; }
    .box { border: 1px solid #ddd; border-radius: 12px; padding: 18px; margin-top: 18px; }
    .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { padding: 12px 10px; border: 1px solid #ddd; text-align: left; }
    th { background: #fafafa; font-size: 0.85rem; letter-spacing: 0.02em; }
    .totals { margin-top: 18px; width: 100%; max-width: 400px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 8px 0; }
    .totals .total { font-weight: 700; font-size: 1rem; }
    .print-only { display: none; }
    @media print {
      body { padding: 0; }
      .print-only { display: block; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="brand">Velora</div>
        <p class="small">Elegant womenswear direct from the admin dashboard.</p>
      </div>
      <div class="small">
        <div>Invoice: ${order.orderNumber}</div>
        <div>Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
        <div>Status: ${order.status}</div>
      </div>
    </div>

    <div class="box grid">
      <div>
        <h3 style="margin:0 0 8px;">Bill to</h3>
        <p style="margin:0; font-weight:700;">${order.customerName}</p>
        <p style="margin:4px 0 0;">${order.email}</p>
        <p style="margin:4px 0 0;">${order.phone ?? "No phone"}</p>
      </div>
      <div>
        <h3 style="margin:0 0 8px;">Shipping</h3>
        <p style="margin:0;">${order.shippingAddress ?? "N/A"}</p>
      </div>
      <div>
        <h3 style="margin:0 0 8px;">Payment</h3>
        <p style="margin:0;">${order.paymentProvider ?? "N/A"}</p>
        <p style="margin:4px 0 0;">Ref: ${order.paymentRef ?? "N/A"}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Variant</th>
          <th>Qty</th>
          <th>Unit price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
          .map(
            (item) => `
          <tr>
            <td>${item.title}</td>
            <td>${item.color} / ${item.size}</td>
            <td>${item.quantity}</td>
            <td>AED ${item.unitPrice.toFixed(2)}</td>
            <td>AED ${(item.unitPrice * item.quantity).toFixed(2)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>AED ${order.subtotal.toFixed(2)}</span></div>
      <div><span>Shipping</span><span>AED ${order.shippingTotal.toFixed(2)}</span></div>
      <div><span>Discount</span><span>AED ${order.discountTotal.toFixed(2)}</span></div>
      <div class="total"><span>Total</span><span>AED ${order.total.toFixed(2)}</span></div>
    </div>

    <div class="box">
      <p class="small" style="margin:0;">Tracking: ${order.shipmentCarrier ?? "N/A"} / ${order.trackingNo ?? "N/A"}</p>
      <p class="small" style="margin:8px 0 0;">Customer note: ${order.internalNote ?? "None"}</p>
    </div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;
  win.document.open();
  win.document.write(invoiceHtml);
  win.document.close();
  win.focus();
  win.print();
}

function previewInvoice(order: AdminOrder) {
  const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice Preview ${order.orderNumber}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; color: #111; }
    .page { max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .brand { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.03em; }
    .small { font-size: 0.85rem; color: #555; }
    .box { border: 1px solid #ddd; border-radius: 12px; padding: 18px; margin-top: 18px; }
    .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { padding: 12px 10px; border: 1px solid #ddd; text-align: left; }
    th { background: #fafafa; font-size: 0.85rem; letter-spacing: 0.02em; }
    .totals { margin-top: 18px; width: 100%; max-width: 400px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 8px 0; }
    .total { font-weight: 700; font-size: 1rem; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="brand">Velora</div>
        <p class="small">Invoice preview generated from the admin dashboard.</p>
      </div>
      <div class="small">
        <div>Invoice: ${order.orderNumber}</div>
        <div>Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
        <div>Status: ${order.status}</div>
      </div>
    </div>

    <div class="box grid">
      <div>
        <h3 style="margin:0 0 8px;">Bill to</h3>
        <p style="margin:0; font-weight:700;">${order.customerName}</p>
        <p style="margin:4px 0 0;">${order.email}</p>
        <p style="margin:4px 0 0;">${order.phone ?? "No phone"}</p>
      </div>
      <div>
        <h3 style="margin:0 0 8px;">Shipping</h3>
        <p style="margin:0;">${order.shippingAddress ?? "N/A"}</p>
      </div>
      <div>
        <h3 style="margin:0 0 8px;">Payment</h3>
        <p style="margin:0;">${order.paymentProvider ?? "N/A"}</p>
        <p style="margin:4px 0 0;">Ref: ${order.paymentRef ?? "N/A"}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Variant</th>
          <th>Qty</th>
          <th>Unit price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
          .map(
            (item) => `
          <tr>
            <td>${item.title}</td>
            <td>${item.color} / ${item.size}</td>
            <td>${item.quantity}</td>
            <td>AED ${item.unitPrice.toFixed(2)}</td>
            <td>AED ${(item.unitPrice * item.quantity).toFixed(2)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>AED ${order.subtotal.toFixed(2)}</span></div>
      <div><span>Shipping</span><span>AED ${order.shippingTotal.toFixed(2)}</span></div>
      <div><span>Discount</span><span>AED ${order.discountTotal.toFixed(2)}</span></div>
      <div class="total"><span>Total</span><span>AED ${order.total.toFixed(2)}</span></div>
    </div>

    <div class="box">
      <p class="small" style="margin:0;">Tracking: ${order.shipmentCarrier ?? "N/A"} / ${order.trackingNo ?? "N/A"}</p>
      <p class="small" style="margin:8px 0 0;">Customer note: ${order.customerNote ?? "None"}</p>
    </div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;
  win.document.open();
  win.document.write(invoiceHtml);
  win.document.close();
  win.focus();
}

function openShippingLabel(labelHtml: string) {
  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) return;
  win.document.open();
  win.document.write(labelHtml);
  win.document.close();
  win.focus();
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 bg-stone-950 px-5 py-3 shadow-2xl">
      <Check className="size-4 shrink-0 text-emerald-400" />
      <span className="text-sm font-medium text-white">{message}</span>
    </div>
  );
}

// ── Modal shell & helpers ─────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
  maxWidth = "max-w-lg",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`w-full ${maxWidth} border border-[var(--border)] bg-[var(--surface)] shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</p>
          <button
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
            className="text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "mt-2 h-11 w-full border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none focus:border-[var(--accent)]";

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function ActionRow({
  onClose,
  submitLabel = "Save",
  submitting = false,
}: {
  onClose: () => void;
  submitLabel?: string;
  submitting?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-1">
      <button
        type="submit"
        disabled={submitting}
        className="h-11 flex-1 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D] disabled:cursor-wait disabled:opacity-70"
      >
        {submitLabel}
      </button>
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="h-11 border border-[var(--border)] px-5 text-xs font-semibold uppercase tracking-[0.12em]"
      >
        Cancel
      </button>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function LiveAlertsPanel({ alerts, onClose }: { alerts: AdminAlert[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="mt-14 w-full max-w-sm border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">Live alerts</p>
          <button
            type="button"
            aria-label="Close live alerts"
            onClick={onClose}
            className="text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {alerts.map((a, i) => (
            <div key={i} className="flex gap-3 px-5 py-4">
              <span
                className={`mt-0.5 shrink-0 text-xs font-bold uppercase ${
                  a.type === "High"
                    ? "text-red-500"
                    : a.type === "Medium"
                    ? "text-amber-500"
                    : "text-[var(--muted)]"
                }`}
              >
                {a.type}
              </span>
              <p className="text-sm leading-5">{a.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onClose,
}: ConfirmPending & { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="w-full max-w-sm border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <p className="text-base font-semibold">{title}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
        </div>
        <div className="flex gap-3 border-t border-[var(--border)] p-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-10 flex-1 border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--hover)] disabled:cursor-wait disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className={`inline-flex h-10 flex-1 items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] transition disabled:cursor-wait disabled:opacity-70 ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-[var(--accent)] text-[#17262D]"
            }`}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {submitting ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryEditorModal({
  category,
  categories,
  onClose,
  onSaved,
}: {
  category?: AdminCategory;
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: (category: AdminCategory) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(() => normalizeFilterSettings(category?.filterSettings));
  const availableParents = categories.filter((item) => item.id !== category?.id);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? ""),
      slug: String(data.get("slug") ?? ""),
      parentId: String(data.get("parentId") ?? "") || null,
      seoTitle: String(data.get("seoTitle") ?? ""),
      seoDescription: String(data.get("seoDescription") ?? ""),
      socialImage: String(data.get("socialImage") ?? ""),
      filterSettings,
    };

    try {
      const response = await fetch(
        category ? `/api/admin/categories/${category.id}` : "/api/admin/categories",
        {
          method: category ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to save category");
      }

      onSaved(result.category);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save category");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title={category ? "Edit category" : "Create category"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {error ? (
          <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </div>
        ) : null}
        <FieldLabel label="Name">
          <input
            required
            name="name"
            minLength={2}
            defaultValue={category?.name ?? ""}
            className={inputCls}
            placeholder="Leggings"
          />
        </FieldLabel>
        <FieldLabel label="Slug">
          <input
            name="slug"
            minLength={2}
            defaultValue={category?.slug ?? ""}
            className={inputCls}
            placeholder="Auto-generated if empty"
          />
        </FieldLabel>
        <FieldLabel label="Parent category">
          <select name="parentId" defaultValue={category?.parentId ?? ""} className={inputCls}>
            <option value="">None</option>
            {availableParents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="SEO title">
          <input
            name="seoTitle"
            defaultValue={category?.seoTitle ?? ""}
            className={inputCls}
            placeholder="Leggings | Velora"
          />
        </FieldLabel>
        <FieldLabel label="SEO description">
          <textarea
            name="seoDescription"
            rows={4}
            defaultValue={category?.seoDescription ?? ""}
            className={`${inputCls} h-auto py-3`}
            placeholder="Shop premium performance leggings from Velora."
          />
        </FieldLabel>
        <FieldLabel label="Social image">
          <input
            name="socialImage"
            defaultValue={category?.socialImage ?? ""}
            className={inputCls}
            placeholder="/images/..."
          />
        </FieldLabel>
        <FilterSettingsEditor value={filterSettings} onChange={setFilterSettings} />
        <div className="border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Preview</p>
          <p className="mt-3 font-semibold">{category?.seoTitle || category?.name || "SEO title preview"}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{category?.seoDescription || "SEO description preview"}</p>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="h-11 flex-1 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D] disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? "Saving..." : category ? "Save category" : "Create category"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 border border-[var(--border)] px-5 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

async function uploadAdminFile(file: File) {
  const body = new FormData();
  body.append("files", file);

  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    body,
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message ?? "Unable to upload file");
  }

  return result.files[0].url as string;
}

function MediaPickerModal({
  title = "Choose media",
  assets,
  onClose,
  onPick,
}: {
  title?: string;
  assets: AdminMediaAsset[];
  onClose: () => void;
  onPick: (asset: AdminMediaAsset) => void;
}) {
  const [query, setQuery] = useState("");
  const imageAssets = assets.filter((asset) => asset.mediaType === "IMAGE");
  const filtered = imageAssets.filter((asset) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [
      asset.name,
      asset.originalName,
      asset.url,
      asset.folder ?? "",
      asset.altText ?? "",
      asset.tags.join(" "),
    ].some((value) => value.toLowerCase().includes(q));
  });

  return (
    <ModalShell title={title} onClose={onClose} maxWidth="max-w-5xl">
      <div className="max-h-[82vh] overflow-y-auto p-5">
        <label className="mb-4 flex h-11 items-center gap-2 border border-[var(--border)] bg-[var(--card)] px-3">
          <Search className="size-4 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search image name, folder, tag..."
            className="h-full w-full bg-transparent text-sm outline-none"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onPick(asset)}
              className="border border-[var(--border)] bg-[var(--card)] p-3 text-left transition hover:border-[var(--accent)]"
            >
              <div className="relative aspect-square overflow-hidden bg-stone-100">
                <Image
                  src={asset.url}
                  alt={asset.altText ?? asset.name}
                  fill
                  sizes="220px"
                  className="object-cover"
                />
              </div>
              <p className="mt-2 truncate text-xs font-semibold">{asset.name}</p>
              <p className="truncate text-xs text-[var(--muted)]">
                {asset.folder ? `/${asset.folder}` : "No folder"} · {formatBytes(asset.sizeBytes)}
              </p>
            </button>
          ))}
          {filtered.length === 0 ? (
            <div className="col-span-full border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
              No reusable images found.
            </div>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}

function CollectionEditorModal({
  collection,
  products,
  mediaAssets,
  onClose,
  onSaved,
}: {
  collection?: AdminCollection;
  products: AdminProduct[];
  mediaAssets: AdminMediaAsset[];
  onClose: () => void;
  onSaved: (collection: AdminCollection) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerImage, setBannerImage] = useState(collection?.bannerImage ?? "");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState<AdminCollection["status"]>(collection?.status ?? "PUBLISHED");
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(() => normalizeFilterSettings(collection?.filterSettings));
  const [productAssignments, setProductAssignments] = useState<AdminCollectionProductAssignment[]>(
    () => collection?.productAssignments?.length
      ? collection.productAssignments
      : (collection?.productIds ?? []).map((productId, index) => ({ productId, sortOrder: index, pinned: false })),
  );
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const selectedProductIds = useMemo(() => new Set(productAssignments.map((assignment) => assignment.productId)), [productAssignments]);
  const assignedProducts = productAssignments
    .map((assignment) => ({ assignment, product: productById.get(assignment.productId) }))
    .filter((item): item is { assignment: AdminCollectionProductAssignment; product: AdminProduct } => Boolean(item.product));
  const availableProducts = products.filter((product) => !selectedProductIds.has(product.id));

  const toggleProduct = (productId: string) => {
    setProductAssignments((prev) => {
      if (prev.some((assignment) => assignment.productId === productId)) {
        return prev.filter((assignment) => assignment.productId !== productId).map((assignment, index) => ({ ...assignment, sortOrder: index }));
      }
      return [...prev, { productId, sortOrder: prev.length, pinned: false }];
    });
  };

  const updateProductAssignment = (productId: string, patch: Partial<AdminCollectionProductAssignment>) => {
    setProductAssignments((prev) => prev.map((assignment) => (
      assignment.productId === productId ? { ...assignment, ...patch } : assignment
    )));
  };

  const moveProductAssignment = (productId: string, direction: -1 | 1) => {
    setProductAssignments((prev) => {
      const index = prev.findIndex((assignment) => assignment.productId === productId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next.map((assignment, sortOrder) => ({ ...assignment, sortOrder }));
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(event.currentTarget);

    try {
      const uploadedBanner = bannerFile ? await uploadAdminFile(bannerFile) : bannerImage;
      const payload = {
        name: String(data.get("name") ?? ""),
        slug: String(data.get("slug") ?? ""),
        summary: String(data.get("summary") ?? ""),
        status: String(data.get("status") ?? "PUBLISHED"),
        scheduledAt: String(data.get("scheduledAt") ?? "") || null,
        bannerImage: uploadedBanner || null,
        seoTitle: String(data.get("seoTitle") ?? ""),
        seoDescription: String(data.get("seoDescription") ?? ""),
        socialImage: String(data.get("socialImage") ?? ""),
        filterSettings,
        productIds: productAssignments.map((assignment) => assignment.productId),
        productAssignments: productAssignments.map((assignment, sortOrder) => ({
          productId: assignment.productId,
          sortOrder,
          pinned: assignment.pinned,
        })),
      };

      const response = await fetch(
        collection ? `/api/admin/collections/${collection.id}` : "/api/admin/collections",
        {
          method: collection ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to save collection");
      }

      onSaved(result.collection);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save collection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title={collection ? "Edit collection" : "Create collection"} onClose={onClose} maxWidth="max-w-5xl">
      {pickerOpen ? (
        <MediaPickerModal
          title="Choose collection banner"
          assets={mediaAssets}
          onClose={() => setPickerOpen(false)}
          onPick={(asset) => {
            setBannerFile(null);
            setBannerImage(asset.url);
            setPickerOpen(false);
          }}
        />
      ) : null}
      <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto p-5">
        {error ? (
          <div className="mb-4 border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Panel title="Collection details">
              <div className="grid gap-4">
                <FieldLabel label="Name">
                  <input required name="name" minLength={2} defaultValue={collection?.name ?? ""} className={inputCls} />
                </FieldLabel>
                <FieldLabel label="Slug">
                  <input name="slug" minLength={2} defaultValue={collection?.slug ?? ""} className={inputCls} placeholder="Auto-generated if empty" />
                </FieldLabel>
                <FieldLabel label="Summary">
                  <textarea required name="summary" rows={4} defaultValue={collection?.summary ?? ""} className={`${inputCls} h-auto py-3`} />
                </FieldLabel>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldLabel label="Publication state">
                    <select
                      name="status"
                      value={collectionStatus}
                      onChange={(event) => setCollectionStatus(event.target.value as AdminCollection["status"])}
                      className={inputCls}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                  </FieldLabel>
                  {collectionStatus === "SCHEDULED" ? (
                    <FieldLabel label="Publish at">
                      <input
                        required
                        type="datetime-local"
                        name="scheduledAt"
                        defaultValue={formatDateTimeLocal(collection?.scheduledAt)}
                        className={inputCls}
                      />
                    </FieldLabel>
                  ) : null}
                </div>
              </div>
            </Panel>

            <Panel title="Assigned products">
              <div className="grid gap-4">
                <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
                  {assignedProducts.map(({ assignment, product }, index) => (
                    <div
                      key={product.id}
                      className="grid gap-3 border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <span>
                        <span className="font-medium">{product.name}</span>
                        <span className="block text-xs text-[var(--muted)]">{product.sku} · {product.category}</span>
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
                          <input
                            type="checkbox"
                            checked={assignment.pinned}
                            onChange={(event) => updateProductAssignment(product.id, { pinned: event.target.checked })}
                            className="size-4 accent-[var(--accent)]"
                          />
                          Pin
                        </label>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveProductAssignment(product.id, -1)}
                          className="grid size-9 place-items-center border border-[var(--border)] disabled:opacity-40"
                          aria-label={`Move ${product.name} up`}
                        >
                          <ChevronUp className="size-4" />
                        </button>
                        <button
                          type="button"
                          disabled={index === assignedProducts.length - 1}
                          onClick={() => moveProductAssignment(product.id, 1)}
                          className="grid size-9 place-items-center border border-[var(--border)] disabled:opacity-40"
                          aria-label={`Move ${product.name} down`}
                        >
                          <ChevronDown className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleProduct(product.id)}
                          className="h-9 border border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {assignedProducts.length === 0 ? (
                    <div className="border border-dashed border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
                      No products assigned.
                    </div>
                  ) : null}
                </div>
                <div className="grid max-h-60 gap-2 overflow-y-auto border-t border-[var(--border)] pt-4">
                  {availableProducts.map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => toggleProduct(product.id)}
                      className="flex items-center justify-between gap-4 border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left text-sm hover:bg-[var(--hover)]"
                    >
                      <span>
                        <span className="font-medium">{product.name}</span>
                        <span className="block text-xs text-[var(--muted)]">{product.sku} · {product.category}</span>
                      </span>
                      <Plus className="size-4 shrink-0" />
                    </button>
                  ))}
                  {availableProducts.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">All products are assigned.</p>
                  ) : null}
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="Banner">
              <div className="space-y-4">
                {bannerFile || bannerImage ? (
                  <div className="relative aspect-[16/10] overflow-hidden border border-[var(--border)] bg-[var(--card)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerFile ? URL.createObjectURL(bannerFile) : bannerImage}
                      alt="Collection banner"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center border border-dashed border-[var(--border)] bg-[var(--card)] text-xs text-[var(--muted)]">
                    No banner uploaded
                  </div>
                )}
                <label className="flex h-11 cursor-pointer items-center justify-center gap-2 border border-[var(--border)] bg-[var(--card)] text-xs font-semibold uppercase tracking-[0.12em]">
                  <Upload className="size-4" />
                  Upload banner
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="h-11 w-full border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[var(--hover)]"
                >
                  Choose from media library
                </button>
                {(bannerFile || bannerImage) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setBannerFile(null);
                      setBannerImage("");
                    }}
                    className="h-10 w-full border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)] hover:bg-red-500/10 hover:text-red-500"
                  >
                    Remove banner
                  </button>
                ) : null}
              </div>
            </Panel>

            <Panel title="SEO">
              <div className="grid gap-4">
                <FieldLabel label="SEO title">
                  <input name="seoTitle" defaultValue={collection?.seoTitle ?? ""} className={inputCls} />
                </FieldLabel>
                <FieldLabel label="SEO description">
                  <textarea name="seoDescription" rows={4} defaultValue={collection?.seoDescription ?? ""} className={`${inputCls} h-auto py-3`} />
                </FieldLabel>
                <FieldLabel label="Social image">
                  <input name="socialImage" defaultValue={collection?.socialImage ?? collection?.bannerImage ?? ""} className={inputCls} placeholder="/images/..." />
                </FieldLabel>
                <div className="border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Preview</p>
                  <p className="mt-3 font-semibold">{collection?.seoTitle || collection?.name || "SEO title preview"}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{collection?.seoDescription || collection?.summary || "SEO description preview"}</p>
                </div>
              </div>
            </Panel>
            <FilterSettingsEditor value={filterSettings} onChange={setFilterSettings} />
          </div>
        </div>

        <div className="mt-5 flex gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="submit"
            disabled={submitting}
            className="h-11 flex-1 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D] disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? "Saving..." : collection ? "Save collection" : "Create collection"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 border border-[var(--border)] px-5 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ColorEditorModal({
  color,
  onClose,
  onSaved,
}: {
  color?: AdminColor;
  onClose: () => void;
  onSaved: (color: AdminColor) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hex, setHex] = useState(color?.hex ?? "#111111");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch(color ? `/api/admin/colors/${color.id}` : "/api/admin/colors", {
        method: color ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          hex,
        }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message ?? "Unable to save color");

      onSaved(result.color);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save color");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title={color ? "Edit color" : "Create color"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {error ? <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div> : null}
        <FieldLabel label="Color name">
          <input required name="name" defaultValue={color?.name ?? ""} className={inputCls} placeholder="Deep Neutral" />
        </FieldLabel>
        <FieldLabel label="Hex value">
          <div className="mt-2 grid grid-cols-[56px_1fr] gap-3">
            <input
              type="color"
              value={hex}
              onChange={(event) => setHex(event.target.value)}
              className="h-11 w-full border border-[var(--border)] bg-[var(--card)] p-1"
            />
            <input
              required
              value={hex}
              onChange={(event) => setHex(event.target.value)}
              pattern="^#[0-9a-fA-F]{6}$"
              className="h-11 w-full border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
        </FieldLabel>
        <ActionRow
          onClose={onClose}
          submitLabel={submitting ? "Saving..." : "Save color"}
          submitting={submitting}
        />
      </form>
    </ModalShell>
  );
}

function SizeEditorModal({
  size,
  onClose,
  onSaved,
}: {
  size?: AdminSize;
  onClose: () => void;
  onSaved: (size: AdminSize) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch(size ? `/api/admin/sizes/${size.id}` : "/api/admin/sizes", {
        method: size ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(data.get("name") ?? "") }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message ?? "Unable to save size");

      onSaved(result.size);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save size");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title={size ? "Edit size" : "Create size"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {error ? <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div> : null}
        <FieldLabel label="Size label">
          <input required name="name" defaultValue={size?.name ?? ""} className={inputCls} placeholder="XL, One Size, 38" />
        </FieldLabel>
        {size?.variantCount ? (
          <p className="text-xs text-[var(--muted)]">
            This size is used by variants. Renaming changes the display label for existing variants.
          </p>
        ) : null}
        <ActionRow
          onClose={onClose}
          submitLabel={submitting ? "Saving..." : "Save size"}
          submitting={submitting}
        />
      </form>
    </ModalShell>
  );
}

function TagEditorModal({
  tag,
  onClose,
  onSaved,
}: {
  tag?: AdminTag;
  onClose: () => void;
  onSaved: (tag: AdminTag) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch(tag ? `/api/admin/tags/${tag.id}` : "/api/admin/tags", {
        method: tag ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(data.get("name") ?? "") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save tag");

      onSaved(result.tag);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save tag");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title={tag ? "Edit tag" : "Create tag"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {error ? <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div> : null}
        <FieldLabel label="Tag name">
          <input required name="name" defaultValue={tag?.name ?? ""} className={inputCls} placeholder="Trending, Luxury, Essentials" />
        </FieldLabel>
        {tag?.productCount ? (
          <p className="text-xs text-[var(--muted)]">
            This tag is assigned to {tag.productCount} product{tag.productCount !== 1 ? "s" : ""}. Renaming keeps those assignments.
          </p>
        ) : null}
        <ActionRow
          onClose={onClose}
          submitLabel={submitting ? "Saving..." : "Save tag"}
          submitting={submitting}
        />
      </form>
    </ModalShell>
  );
}

function AddProductModal({
  categories,
  collections,
  tags,
  mediaAssets,
  onClose,
  onCreated,
  onSuccess,
}: {
  categories: AdminCategoryOption[];
  collections: AdminCollectionOption[];
  tags: AdminTag[];
  mediaAssets: AdminMediaAsset[];
  onClose: () => void;
  onCreated: (product: AdminProduct) => void;
  onSuccess: (msg: string) => void;
}) {
  return (
    <ModalShell title="Add product" onClose={onClose} maxWidth="max-w-6xl">
      <div className="max-h-[84vh] overflow-y-auto p-5">
        <ProductEditForm
          categories={categories}
          collections={collections}
          tags={tags}
          mediaAssets={mediaAssets}
          mode="create"
          onSaved={(product) => {
            onCreated(product);
            onSuccess(`"${product.name}" created`);
            onClose();
          }}
        />
      </div>
    </ModalShell>
  );
}
const CSV_TEMPLATE_HEADERS =
  "name,sku,price,sale_price,category,description,fabric_details,care_instructions,status,color_name,color_hex,size_name,stock,variant_sku";
const CSV_TEMPLATE_EXAMPLE =
  'Aura Legging,AL-001,299,,Leggings,"Engineered for peak performance.",90% Polyester 10% Elastane,"Machine wash cold.",DRAFT,Black,#111111,S,50,AL-001-BLK-S\nAura Legging,AL-001,299,,Leggings,"Engineered for peak performance.",90% Polyester 10% Elastane,"Machine wash cold.",DRAFT,Black,#111111,M,45,AL-001-BLK-M\nAura Legging,AL-001,299,,Leggings,"Engineered for peak performance.",90% Polyester 10% Elastane,"Machine wash cold.",DRAFT,White,#F5F5F5,S,30,AL-001-WHT-S';

type BulkResult = {
  created: number;
  failed: number;
  failedProducts: { sku: string; name: string; error: string }[];
  rowErrors: { row: number; error: string }[];
};

function BulkUploadModal({
  onClose,
  onSuccess,
  onProductsAdded,
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onProductsAdded: (products: AdminProduct[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const downloadTemplate = () => {
    const content = `${CSV_TEMPLATE_HEADERS}\n${CSV_TEMPLATE_EXAMPLE}`;
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "velora-product-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrorReport = (errors: string[]) => {
    const content = ["error", ...errors.map((error) => `"${error.replace(/"/g, '""')}"`)].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "velora-product-import-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/products/bulk", { method: "POST", body });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.message ?? "Upload failed");
        return;
      }

      setResult(data as BulkResult);
      if (data.products?.length > 0) {
        onProductsAdded(data.products as AdminProduct[]);
        onSuccess(
          `${data.created} product${data.created !== 1 ? "s" : ""} imported${data.failed > 0 ? `, ${data.failed} failed` : ""}`,
        );
      }
    } catch {
      setUploadError("Network error — please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Results view ─────────────────────────────────────────────────────────
  if (result) {
    const allErrors = [
      ...result.rowErrors.map((e) => `Row ${e.row}: ${e.error}`),
      ...result.failedProducts.map((f) => `${f.name} (${f.sku}): ${f.error}`),
    ];
    return (
      <ModalShell title="Import results" onClose={onClose}>
        <div className="p-5">
          <div className="flex gap-4">
            <div className="flex-1 border border-[var(--border)] bg-[var(--card)] p-4 text-center">
              <p className="text-2xl font-semibold text-[var(--accent)]">{result.created}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Created</p>
            </div>
            <div className="flex-1 border border-[var(--border)] bg-[var(--card)] p-4 text-center">
              <p className={`text-2xl font-semibold ${result.failed > 0 ? "text-red-500" : "text-[var(--muted)]"}`}>
                {result.failed}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Failed</p>
            </div>
          </div>

          {allErrors.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-red-500">
                Errors
              </p>
              <div className="max-h-48 overflow-y-auto border border-[var(--border)] bg-[var(--card)] p-3">
                {allErrors.map((err, i) => (
                  <p key={i} className="py-0.5 text-xs text-red-400">
                    {err}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => downloadErrorReport(allErrors)}
                className="mt-3 h-10 border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--hover)]"
              >
                Download error report
              </button>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-[var(--muted)]">
            All imported products are saved as <strong>Draft</strong> — review and publish them from the Products section.
          </p>

          <button
            onClick={onClose}
            className="mt-5 h-11 w-full bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D]"
          >
            Done
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── Upload view ───────────────────────────────────────────────────────────
  return (
    <ModalShell title="Bulk upload CSV" onClose={onClose}>
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <div>
            <p className="text-xs font-semibold">Required columns</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              name · sku · price · category · color_name · color_hex · size_name · stock + more
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="shrink-0 text-xs font-semibold uppercase underline"
          >
            Download template
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploadError(null); }}
            className="hidden"
          />
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed border-[var(--border)] bg-[var(--card)] p-10 transition hover:border-[var(--accent)]"
          >
            <Upload className="size-7 text-[var(--muted)]" />
            <p className="text-sm text-[var(--muted)]">
              {file ? file.name : "Click to select a CSV file"}
            </p>
          </div>

          {uploadError ? (
            <p className="mt-3 text-xs text-red-500">{uploadError}</p>
          ) : null}

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={!file || uploading}
              className="h-11 flex-1 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D] disabled:opacity-40"
            >
              {uploading ? "Importing…" : "Import products"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 border border-[var(--border)] px-5 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}

function SchedulePublishModal({
  products,
  onClose,
  onSuccess,
  onScheduled,
}: {
  products: AdminProduct[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onScheduled: (productIds: string[], scheduledAt: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const productIds = products.filter((product) => product.status !== "Archived").map((product) => product.id);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const scheduledAt = new Date(`${data.get("date")}T${data.get("time")}:00+04:00`);
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/products/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds,
          scheduledAt: scheduledAt.toISOString(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to schedule products");

      onScheduled(productIds, result.scheduledAt);
      onSuccess(`${result.count} product${result.count === 1 ? "" : "s"} scheduled for ${data.get("date")} at ${data.get("time")} UAE`);
      onClose();
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "Unable to schedule products");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <ModalShell title="Schedule publishing" onClose={onClose}>
      <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
        {error ? <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div> : null}
        <div className="border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
          <span className="font-semibold">{productIds.length}</span> filtered product{productIds.length === 1 ? "" : "s"} will be scheduled.
        </div>
        <FieldLabel label="Publish date">
          <input
            required
            name="date"
            type="date"
            min={new Date().toISOString().split("T")[0]}
            className={inputCls}
          />
        </FieldLabel>
        <FieldLabel label="Publish time (UAE)">
          <input required name="time" type="time" className={inputCls} />
        </FieldLabel>
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting || productIds.length === 0}
            className="h-11 flex-1 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Scheduling..." : "Schedule"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 border border-[var(--border)] px-5 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function OrderReviewPanel({
  order,
  activityLogs,
  onClose,
  onAction,
  onSaved,
}: {
  order: AdminOrder;
  activityLogs: AdminActivityLog[];
  onClose: () => void;
  onAction: (msg: string) => void;
  onSaved: (order: AdminOrder) => void;
}) {
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [fulfillmentStatus, setFulfillmentStatus] = useState(order.fulfillmentStatus);
  const [carrier, setCarrier] = useState(order.shipmentCarrier ?? "");
  const [trackingNo, setTrackingNo] = useState(order.trackingNo ?? "");
  const [internalNote, setInternalNote] = useState(order.internalNote ?? "");
  const [customerNote, setCustomerNote] = useState(order.customerNote ?? "");
  const [refundAmount, setRefundAmount] = useState(order.refundAmount?.toString() ?? "");
  const [tagsInput, setTagsInput] = useState(order.orderTags.join(", "));
  const [submitting, setSubmitting] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refundValue = refundAmount.trim() ? Number(refundAmount) : order.refundAmount ?? 0;
  const hasRefund = refundValue > 0;

  const orderTimeline = useMemo(
    () =>
      activityLogs
        .filter((log) => log.entityType === "order" && log.entityId === order.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [activityLogs, order.id],
  );

  const saveOrder = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          paymentStatus,
          fulfillmentStatus,
          carrier,
          trackingNo,
          internalNote,
          customerNote,
          refundAmount: refundAmount.trim() ? Number(refundAmount) : null,
          tags: tagsInput,
        }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message ?? "Unable to update order");

      onSaved({
        ...order,
        status,
        paymentStatus,
        fulfillmentStatus,
        shipmentCarrier: carrier || undefined,
        trackingNo: trackingNo || undefined,
        internalNote: internalNote || undefined,
        customerNote: customerNote || undefined,
        refundAmount: refundAmount.trim() ? Number(refundAmount) : undefined,
        orderTags: tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      onAction(`${order.orderNumber} updated`);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update order");
    } finally {
      setSubmitting(false);
    }
  };

  const generateShippingLabel = async () => {
    setGeneratingLabel(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/shipping-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier: carrier || "Velora Logistics",
          weightGrams: Math.max(500, order.items.reduce((sum, item) => sum + item.quantity * 250, 0)),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to generate shipping label");
      setCarrier(result.shipment.carrier ?? "");
      setTrackingNo(result.shipment.trackingNo ?? "");
      onSaved({
        ...order,
        shipmentCarrier: result.shipment.carrier ?? undefined,
        trackingNo: result.shipment.trackingNo ?? undefined,
        shippingLabelId: result.shipment.labelId ?? undefined,
        shippingLabelCreatedAt: result.shipment.labelCreatedAt ?? undefined,
      });
      openShippingLabel(result.labelHtml);
      onAction(`Shipping label generated for ${order.orderNumber}`);
    } catch (labelError) {
      setError(labelError instanceof Error ? labelError.message : "Unable to generate shipping label");
    } finally {
      setGeneratingLabel(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">
              Order {order.orderNumber}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{order.email}</p>
          </div>
          <button
            type="button"
            aria-label="Close order review panel"
            onClick={onClose}
            className="text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {error ? <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div> : null}

          <div className="grid gap-4">
            <FieldLabel label="Order status">
              <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputCls}>
                {["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Payment status">
              <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className={inputCls}>
                {["pending", "paid", "refunded", "partial_refund", "failed"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Fulfillment status">
              <select value={fulfillmentStatus} onChange={(event) => setFulfillmentStatus(event.target.value)} className={inputCls}>
                {["unfulfilled", "processing", "fulfilled", "shipped", "delivered", "returned", "cancelled"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FieldLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldLabel label="Carrier">
                <input value={carrier} onChange={(event) => setCarrier(event.target.value)} className={inputCls} />
              </FieldLabel>
              <FieldLabel label="Tracking no.">
                <input value={trackingNo} onChange={(event) => setTrackingNo(event.target.value)} className={inputCls} />
              </FieldLabel>
            </div>
            <FieldLabel label="Internal note">
              <textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} rows={4} className={`${inputCls} h-auto py-3`} />
            </FieldLabel>
            <FieldLabel label="Customer-facing note">
              <textarea
                value={customerNote}
                onChange={(event) => setCustomerNote(event.target.value)}
                rows={3}
                placeholder="Shown to the customer on order communication."
                className={`${inputCls} h-auto py-3`}
              />
            </FieldLabel>
            <FieldLabel label="Refund amount (AED)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </FieldLabel>
            <FieldLabel label="Order tags">
              <input
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="priority, fraud review"
                className={inputCls}
              />
            </FieldLabel>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Customer</p>
            <p className="mt-1 font-medium">{order.customerName}</p>
            <p className="text-sm text-[var(--muted)]">{order.email}</p>
            <p className="text-sm text-[var(--muted)]">{order.phone ?? "No phone"}</p>
            {order.orderTags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {order.orderTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {order.refundAmount != null ? (
              <div className="mt-3 text-sm text-[var(--muted)]">
                <span className="font-semibold">Refund amount:</span> AED {order.refundAmount.toFixed(2)}
              </div>
            ) : null}
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Order timeline</p>
            {orderTimeline.length ? (
              <div className="mt-3 space-y-3">
                {orderTimeline.map((log) => (
                  <div key={log.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{log.action}</p>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                        {new Date(log.createdAt).toLocaleString("en-AE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">By {log.actor}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">No timeline entries recorded for this order.</p>
            )}
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Items</p>
            <div className="mt-3 space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{item.title}</span>
                    <span>{item.quantity} × AED {item.unitPrice}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{item.color} / {item.size}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 border-t border-[var(--border)] pt-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>AED {order.subtotal}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>AED {order.shippingTotal}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>AED {order.discountTotal}</span></div>
            {hasRefund ? (
              <div className="flex justify-between text-orange-600"><span>Refund</span><span>- AED {refundValue.toFixed(2)}</span></div>
            ) : null}
            <div className="flex justify-between font-semibold"><span>Total</span><span>AED {order.total}</span></div>
            {hasRefund ? (
              <div className="flex justify-between font-semibold text-orange-600"><span>Net total</span><span>AED {Math.max(0, order.total - refundValue).toFixed(2)}</span></div>
            ) : null}
          </div>
        </div>
        <div className="grid gap-3 border-t border-[var(--border)] p-5">
          <button
            onClick={saveOrder}
            disabled={submitting}
            className="h-11 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D] disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save order"}
          </button>
          <button
            onClick={() => printInvoice(order)}
            className="h-11 border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Print invoice
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => previewInvoice(order)}
              className="h-11 border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Preview invoice
            </button>
            <button
              onClick={generateShippingLabel}
              disabled={generatingLabel}
              className="h-11 border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em]"
            >
              {generatingLabel ? "Generating..." : order.shippingLabelId ? "Reprint label" : "Generate label"}
            </button>
          </div>
          <button
            onClick={() => {
              setStatus("REFUNDED");
              setPaymentStatus("refunded");
            }}
            className="h-11 border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Mark refunded
          </button>
          <button
            onClick={() => {
              setStatus("PROCESSING");
              setPaymentStatus("partial_refund");
            }}
            className="h-11 border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Mark partial refund
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCouponModal({
  coupon,
  onClose,
  onAdd,
}: {
  coupon?: AdminCoupon;
  onClose: () => void;
  onAdd: (coupon: AdminCoupon) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const payload = {
      code: String(data.get("code") ?? "").toUpperCase(),
      type: String(data.get("type") ?? "PERCENTAGE"),
      value: Number(data.get("value") ?? 0),
      minimumAmount: data.get("minimum") ? Number(data.get("minimum")) : null,
      usageLimit: data.get("limit") ? Number(data.get("limit")) : null,
      expiresAt: data.get("expiry") ? new Date(String(data.get("expiry"))).toISOString() : null,
      combinable: data.get("combinable") === "on",
      eligibleProductIds: String(data.get("eligibleProductIds") ?? ""),
      eligibleCategories: String(data.get("eligibleCategories") ?? ""),
      eligibleCollections: String(data.get("eligibleCollections") ?? ""),
      excludedProductIds: String(data.get("excludedProductIds") ?? ""),
    };

    try {
      const response = await fetch(coupon ? `/api/admin/coupons/${coupon.id}` : "/api/admin/coupons", {
        method: coupon ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to create coupon");
      onAdd(result.coupon);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create coupon");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title={coupon ? "Edit coupon" : "Add coupon"} onClose={onClose}>
      <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
        {error ? (
          <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </div>
        ) : null}
        <FieldLabel label="Coupon code">
          <input
            required
            name="code"
            defaultValue={coupon?.code}
            type="text"
            placeholder="e.g. VELORA20"
            className={`${inputCls} uppercase`}
          />
        </FieldLabel>
        <div className="grid grid-cols-2 gap-4">
          <FieldLabel label="Type">
            <select name="type" required defaultValue={coupon?.type ?? "PERCENTAGE"} className={inputCls}>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount</option>
              <option value="FREE_SHIPPING">Free shipping</option>
            </select>
          </FieldLabel>
          <FieldLabel label="Value (e.g. 20 for 20%)">
            <input
              required
              name="value"
              defaultValue={coupon?.value}
              type="number"
              min="0"
              step="0.01"
              placeholder="20"
              className={inputCls}
            />
          </FieldLabel>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FieldLabel label="Minimum order (AED)">
            <input
              name="minimum"
              type="number"
              min="0"
              step="0.01"
              defaultValue={coupon?.minimumAmount}
              placeholder="No minimum"
              className={inputCls}
            />
          </FieldLabel>
          <FieldLabel label="Expiry date">
            <input name="expiry" type="date" defaultValue={coupon?.expiresAt?.slice(0, 10)} className={inputCls} />
          </FieldLabel>
          <FieldLabel label="Usage limit">
            <input
              name="limit"
              type="number"
              min="1"
              defaultValue={coupon?.usageLimit}
              placeholder="Unlimited"
              className={inputCls}
            />
          </FieldLabel>
        </div>
        <div className="grid gap-3 border border-[var(--border)] p-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              name="combinable"
              type="checkbox"
              defaultChecked={coupon?.combinable ?? false}
              className="size-4 accent-[var(--accent)]"
            />
            Allow this coupon to combine with future stackable discounts
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldLabel label="Eligible product IDs">
              <textarea
                name="eligibleProductIds"
                rows={2}
                defaultValue={coupon?.eligibleProductIds?.join(", ")}
                placeholder="Comma-separated product IDs"
                className={`${inputCls} h-auto py-3`}
              />
            </FieldLabel>
            <FieldLabel label="Excluded product IDs">
              <textarea
                name="excludedProductIds"
                rows={2}
                defaultValue={coupon?.excludedProductIds?.join(", ")}
                placeholder="Comma-separated product IDs"
                className={`${inputCls} h-auto py-3`}
              />
            </FieldLabel>
            <FieldLabel label="Eligible categories">
              <textarea
                name="eligibleCategories"
                rows={2}
                defaultValue={coupon?.eligibleCategories?.join(", ")}
                placeholder="Leggings, Jackets"
                className={`${inputCls} h-auto py-3`}
              />
            </FieldLabel>
            <FieldLabel label="Eligible collections">
              <textarea
                name="eligibleCollections"
                rows={2}
                defaultValue={coupon?.eligibleCollections?.join(", ")}
                placeholder="studio-sculpt, after-hours"
                className={`${inputCls} h-auto py-3`}
              />
            </FieldLabel>
          </div>
          <p className="text-xs leading-5 text-[var(--muted)]">
            Leave all eligibility fields blank for a cart-wide coupon. Targeted coupons discount only matching line items.
          </p>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="h-11 flex-1 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D] disabled:opacity-60"
          >
            {submitting ? "Saving..." : coupon ? "Save coupon" : "Create coupon"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 border border-[var(--border)] px-5 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function IssueGiftCardModal({
  onClose,
  onIssued,
}: {
  onClose: () => void;
  onIssued: (giftCard: AdminGiftCard, code: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const payload = {
      amount: Number(data.get("amount") ?? 0),
      recipientEmail: String(data.get("recipientEmail") ?? "").trim() || null,
      purchaserEmail: String(data.get("purchaserEmail") ?? "").trim() || null,
      note: String(data.get("note") ?? "").trim() || null,
      expiresAt: data.get("expiresAt") ? new Date(String(data.get("expiresAt"))).toISOString() : null,
    };
    try {
      const response = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to issue gift card");
      onIssued(result.giftCard, result.code);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to issue gift card");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Issue gift card" onClose={onClose}>
      <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
        {error ? <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div> : null}
        <FieldLabel label="Amount (AED)">
          <input required name="amount" type="number" min="1" step="1" placeholder="250" className={inputCls} />
        </FieldLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Recipient email">
            <input name="recipientEmail" type="email" placeholder="customer@example.com" className={inputCls} />
          </FieldLabel>
          <FieldLabel label="Purchaser email">
            <input name="purchaserEmail" type="email" placeholder="buyer@example.com" className={inputCls} />
          </FieldLabel>
        </div>
        <FieldLabel label="Expiry date">
          <input name="expiresAt" type="date" className={inputCls} />
        </FieldLabel>
        <FieldLabel label="Internal note">
          <textarea name="note" rows={3} placeholder="Reason, campaign, or customer request" className={`${inputCls} h-auto py-3`} />
        </FieldLabel>
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="h-11 flex-1 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D] disabled:opacity-60"
          >
            {submitting ? "Issuing..." : "Issue gift card"}
          </button>
          <button type="button" onClick={onClose} className="h-11 border border-[var(--border)] px-5 text-xs font-semibold uppercase tracking-[0.12em]">
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function InventoryLogPanel({
  row,
  onClose,
}: {
  row: AdminInventoryRow;
  onClose: () => void;
}) {
  const [reasonFilter, setReasonFilter] = useState("All");
  const [directionFilter, setDirectionFilter] = useState("All");
  const reasonOptions = ["All", ...Array.from(new Set(row.logs.map((log) => log.reason)))];
  const filteredLogs = row.logs.filter((log) => {
    if (reasonFilter !== "All" && log.reason !== reasonFilter) return false;
    if (directionFilter === "Increase" && log.delta <= 0) return false;
    if (directionFilter === "Decrease" && log.delta >= 0) return false;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">{row.sku ?? "No SKU"}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {row.productName} · {row.colorName} · {row.sizeName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <select
              value={reasonFilter}
              onChange={(event) => setReasonFilter(event.target.value)}
              className="h-9 border border-[var(--border)] bg-[var(--card)] px-3 text-xs"
            >
              {reasonOptions.map((reason) => <option key={reason}>{reason}</option>)}
            </select>
            <select
              value={directionFilter}
              onChange={(event) => setDirectionFilter(event.target.value)}
              className="h-9 border border-[var(--border)] bg-[var(--card)] px-3 text-xs"
            >
              {["All", "Increase", "Decrease"].map((direction) => <option key={direction}>{direction}</option>)}
            </select>
          </div>
          {filteredLogs.length ? (
            <AdminTable
              headers={["Date", "Change", "Reason", "Stock", "By"]}
              rows={filteredLogs.map((log) => [
                <span key="d" className="text-[var(--muted)]">
                  {new Intl.DateTimeFormat("en-AE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(log.createdAt))}
                </span>,
                <span
                  key="q"
                  className={`font-semibold ${
                    log.delta > 0
                      ? "text-emerald-600"
                      : log.delta < 0
                      ? "text-red-500"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {log.delta > 0 ? `+${log.delta}` : log.delta}
                  {log.note ? <span className="block text-xs font-normal text-[var(--muted)]">{log.note}</span> : null}
                </span>,
                <span key="reason" className="text-xs text-[var(--muted)]">{log.reason.replaceAll("_", " ")}</span>,
                `${log.oldStock} → ${log.newStock}`,
                log.actor,
              ])}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">No inventory history matches these filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerProfilePanel({
  customer,
  customers,
  onClose,
  onSaved,
  onMerged,
}: {
  customer: AdminCustomer;
  customers: AdminCustomer[];
  onClose: () => void;
  onSaved: (customer: AdminCustomer) => void;
  onMerged: (customer: AdminCustomer, removedCustomerIds: string[]) => void;
}) {
  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("");
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(customer.name);
  const [emailInput, setEmailInput] = useState(customer.email);
  const [notesInput, setNotesInput] = useState(customer.notes ?? "");
  const [tagInput, setTagInput] = useState(customer.tags.join(", "));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const communicationPreferences = customer.communicationPreferences;
  const fitPreferences = customer.fitPreferences;
  const privacy = customer.privacy;
  const productAlerts = customer.productAlerts ?? [];

  const accountMatch =
    customer.type === "Guest"
      ? customers.find(
          (item) => item.type === "Account" && item.email.toLowerCase() === customer.email.toLowerCase(),
        )
      : customer;
  const matchingGuestCustomers =
    accountMatch && accountMatch.userId
      ? customers.filter(
          (item) =>
            item.type === "Guest" &&
            item.email.toLowerCase() === accountMatch.email.toLowerCase(),
        )
      : [];
  const canMergeGuestOrders = Boolean(accountMatch?.userId && matchingGuestCustomers.length);

  const resetForm = () => {
    setNameInput(customer.name);
    setEmailInput(customer.email);
    setNotesInput(customer.notes ?? "");
    setTagInput(customer.tags.join(", "));
    setSaveError(null);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customer.userId) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/admin/customers/${customer.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.trim(),
          email: emailInput.trim(),
          notes: notesInput.trim(),
          tags: tagInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save customer");

      const updatedCustomer: AdminCustomer = {
        ...customer,
        name: result.customer.name,
        email: result.customer.email,
        notes: result.customer.notes,
        tags: result.customer.tags,
      };
      onSaved(updatedCustomer);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMergeGuestOrders = async () => {
    if (!accountMatch?.userId || !matchingGuestCustomers.length) return;
    setIsMerging(true);
    setMergeError(null);

    try {
      const response = await fetch(`/api/admin/customers/${accountMatch.userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge_guest_orders" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to merge guest orders");

      const mergedOrders = [...accountMatch.orders, ...matchingGuestCustomers.flatMap((item) => item.orders)].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const mergedCustomer: AdminCustomer = {
        ...accountMatch,
        orderCount: mergedOrders.length,
        lifetimeValue: mergedOrders.reduce((sum, order) => sum + order.total, 0),
        lastOrderAt: mergedOrders[0]?.createdAt,
        phone: accountMatch.phone ?? matchingGuestCustomers.find((item) => item.phone)?.phone,
        addresses: Array.from(new Set([...accountMatch.addresses, ...matchingGuestCustomers.flatMap((item) => item.addresses)])),
        tags: Array.from(new Set([...accountMatch.tags, ...matchingGuestCustomers.flatMap((item) => item.tags)])),
        orders: mergedOrders,
      };

      onMerged(mergedCustomer, matchingGuestCustomers.map((item) => item.id));
      setMergeError(null);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "Unable to merge guest orders");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">
            Customer profile
          </p>
          <button
            onClick={onClose}
            className="text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center bg-[var(--accent)] text-base font-bold text-[#17262D]">
              {initials}
            </div>
            <div>
              <p className="font-semibold">{customer.name}</p>
              <p className="text-sm text-[var(--muted)]">{customer.email}</p>
              <StatusPill label={customer.type} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["Orders", String(customer.orderCount)],
              ["Lifetime value", formatAdminMoney(customer.lifetimeValue)],
              ["Last order", formatAdminDate(customer.lastOrderAt)],
              ["Phone", customer.phone ?? "Not captured"],
            ].map(([label, value]) => (
              <div key={label} className="border border-[var(--border)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {communicationPreferences || fitPreferences || privacy || productAlerts.length ? (
            <div className="border-b border-[var(--border)] pb-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Account signals
                </p>
                {privacy ? <StatusPill label={privacy.deletionState === "PENDING_DELETION" ? "Deletion pending" : "Active"} /> : null}
              </div>
              <div className="mt-3 grid gap-3">
                {communicationPreferences ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Communication preferences
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill label={communicationPreferences.marketingEmails ? "Marketing on" : "Marketing off"} />
                      <StatusPill label={communicationPreferences.productAlertEmails ? "Alerts on" : "Alerts off"} />
                      <StatusPill label={communicationPreferences.postPurchaseEmails ? "Post-purchase on" : "Post-purchase off"} />
                    </div>
                  </div>
                ) : null}

                {fitPreferences ? (
                  <div className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm sm:grid-cols-3">
                    {[
                      ["Preferred size", fitPreferences.preferredSize ?? "Not captured"],
                      ["Fit", humanizeAdminValue(fitPreferences.fitPreference)],
                      ["Compression", humanizeAdminValue(fitPreferences.compressionPreference)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                        <p className="mt-1 font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {privacy ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Email verification</p>
                        <p className="mt-1 font-semibold">{privacy.emailVerifiedAt ? formatAdminDate(privacy.emailVerifiedAt) : "Not verified"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Deletion state</p>
                        <p className="mt-1 font-semibold">{privacy.deletedAt ? `Requested ${formatAdminDate(privacy.deletedAt)}` : "Active account"}</p>
                      </div>
                    </div>
                    {privacy.requests.length ? (
                      <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                        {privacy.requests.map((request) => (
                          <div key={request.id} className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold">{humanizeAdminValue(request.type)} request</p>
                              <p className="text-xs text-[var(--muted)]">
                                {formatAdminDate(request.createdAt)}
                                {request.completedAt ? ` / Completed ${formatAdminDate(request.completedAt)}` : ""}
                                {request.retentionUntil ? ` / Retain until ${formatAdminDate(request.retentionUntil)}` : ""}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <StatusPill label={request.status} />
                              {request.legalHold ? <StatusPill label="Legal hold" /> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {productAlerts.length ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Product alerts
                    </p>
                    <div className="mt-3 space-y-3">
                      {productAlerts.map((alert) => (
                        <div key={alert.id} className="border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{alert.productTitle}</p>
                            <StatusPill label={alert.status} />
                          </div>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {humanizeAdminValue(alert.type)}
                            {alert.variantLabel ? ` / ${alert.variantLabel}` : ""}
                            {alert.targetPrice ? ` / Target ${formatAdminMoney(alert.targetPrice)}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Created {formatAdminDate(alert.createdAt)}
                            {alert.lastNotifiedAt ? ` / Last notified ${formatAdminDate(alert.lastNotifiedAt)}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="border-b border-[var(--border)] pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Addresses
            </p>
            <div className="mt-2 space-y-2">
              {customer.addresses.length ? (
                customer.addresses.map((address) => (
                  <p key={address} className="text-sm font-medium">
                    {address}
                  </p>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">No saved addresses.</p>
              )}
            </div>
          </div>

          <div className="border-b border-[var(--border)] pb-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Tags
              </p>
              {customer.userId ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing((prev) => !prev);
                    if (isEditing) resetForm();
                  }}
                  className="text-[var(--accent)] text-xs font-semibold uppercase tracking-[0.12em]"
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              ) : null}
            </div>

            {isEditing && customer.userId ? (
              <form onSubmit={handleSave} className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Name
                    </label>
                    <input
                      value={nameInput}
                      onChange={(event) => setNameInput(event.target.value)}
                      className="mt-2 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Email
                    </label>
                    <input
                      value={emailInput}
                      onChange={(event) => setEmailInput(event.target.value)}
                      type="email"
                      className="mt-2 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Tags
                  </label>
                  <input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    placeholder="VIP, Returns risk"
                    className="mt-2 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Notes
                  </label>
                  <textarea
                    value={notesInput}
                    onChange={(event) => setNotesInput(event.target.value)}
                    rows={4}
                    className="mt-2 w-full resize-none rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
                {saveError ? (
                  <p className="text-xs text-red-500">{saveError}</p>
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="h-10 rounded bg-[var(--accent)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#17262D] disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save customer"}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      setIsEditing(false);
                      resetForm();
                    }}
                    className="h-10 rounded border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.12em]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {customer.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-[var(--border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {customer.notes ? (
            <div className="border-b border-[var(--border)] pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Notes
              </p>
              <p className="mt-2 whitespace-pre-line text-sm text-[var(--muted)]">
                {customer.notes}
              </p>
            </div>
          ) : null}

          <div className="border-b border-[var(--border)] pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Account merge
            </p>
            {canMergeGuestOrders && accountMatch ? (
              <div className="mt-3 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div>
                  <p className="text-sm font-semibold">
                    Merge {matchingGuestCustomers.reduce((sum, item) => sum + item.orderCount, 0)} guest orders into {accountMatch.email}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Guest orders and addresses with the same email will attach to the account profile.
                  </p>
                </div>
                {mergeError ? <p className="text-xs text-red-500">{mergeError}</p> : null}
                <button
                  type="button"
                  disabled={isMerging}
                  onClick={handleMergeGuestOrders}
                  className="h-10 rounded bg-[var(--accent)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#17262D] disabled:opacity-50"
                >
                  {isMerging ? "Merging..." : "Merge guest orders"}
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">
                No matching guest orders are available for this customer email.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Order timeline
            </p>
            <div className="mt-4 space-y-5">
              {customer.orders.length ? (
                customer.orders.map((order, index) => {
                  const hasIssueSignal =
                    Boolean(order.refundAmount) ||
                    Boolean(order.internalNote?.trim()) ||
                    order.orderTags.some((tag) => /refund|return|issue|risk|chargeback/i.test(tag));

                  return (
                    <div key={order.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-xs font-semibold text-[#17262D]">
                          {customer.orders.length - index}
                        </div>
                        {index < customer.orders.length - 1 ? (
                          <div className="mt-1 h-full w-px bg-[var(--border)]" />
                        ) : null}
                      </div>
                      <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold">{order.orderNumber}</p>
                            <p className="text-xs text-[var(--muted)]">
                              {formatAdminDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill label={order.status} />
                            <StatusPill label={order.paymentStatus} />
                            <StatusPill label={order.fulfillmentStatus} />
                            {hasIssueSignal ? <StatusPill label="Issue history" /> : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
                          <span>{order.orderNumber}</span>
                          <span className="font-semibold text-[var(--foreground)]">
                            {formatAdminMoney(order.total)}
                          </span>
                        </div>
                        {order.orderTags.length || order.refundAmount || order.customerNote || order.internalNote ? (
                          <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
                            {order.orderTags.length ? (
                              <div className="flex flex-wrap gap-1.5">
                                {order.orderTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="border border-[var(--border)] px-2 py-1 font-semibold uppercase tracking-[0.1em]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {order.refundAmount ? (
                              <p>
                                <span className="font-semibold text-[var(--foreground)]">Refund:</span>{" "}
                                {formatAdminMoney(order.refundAmount)}
                              </p>
                            ) : null}
                            {order.customerNote ? (
                              <p>
                                <span className="font-semibold text-[var(--foreground)]">Customer note:</span>{" "}
                                {order.customerNote}
                              </p>
                            ) : null}
                            {order.internalNote ? (
                              <p>
                                <span className="font-semibold text-[var(--foreground)]">Internal note:</span>{" "}
                                {order.internalNote}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[var(--muted)]">No orders placed yet.</p>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-3 border-t border-[var(--border)] p-5">
          <a
            href={`mailto:${customer.email}`}
            className="grid h-11 place-items-center bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D]"
          >
            Email customer
          </a>
        </div>
      </div>
    </div>
  );
}

function HomepageSectionModal({
  section,
  products,
  collections,
  mediaAssets,
  onClose,
  onSaved,
}: {
  section?: AdminHomepageSection;
  products: AdminProduct[];
  collections: AdminCollection[];
  mediaAssets: AdminMediaAsset[];
  onClose: () => void;
  onSaved: (section: AdminHomepageSection) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [rollingBackVersionId, setRollingBackVersionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<AdminHomepageSection["status"]>(section?.status ?? "DRAFT");
  const [imageUrl, setImageUrl] = useState(section?.imageUrl ?? "");
  const [mobileImageUrl, setMobileImageUrl] = useState(section?.mobileImageUrl ?? "");
  const [desktopFocalPoint, setDesktopFocalPoint] = useState(() => settingString(section?.settings, "desktopFocalPoint", "50% 50%"));
  const [mobileFocalPoint, setMobileFocalPoint] = useState(() => settingString(section?.settings, "mobileFocalPoint", "50% 50%"));
  const [desktopCropRatio, setDesktopCropRatio] = useState(() => settingString(section?.settings, "desktopCropRatio"));
  const [mobileCropRatio, setMobileCropRatio] = useState(() => settingString(section?.settings, "mobileCropRatio"));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [pickerTarget, setPickerTarget] = useState<"desktop" | "mobile" | null>(null);
  const [categoryMediaPicker, setCategoryMediaPicker] = useState<{
    index: number;
    field: "imageUrl" | "posterUrl" | "videoUrl";
  } | null>(null);
  const [categoryMediaItems, setCategoryMediaItems] = useState<HomepageCategoryMediaDraft[]>(() =>
    parseHomepageCategoryMediaItems(section?.settings.categoryMediaItems),
  );
  const [selectedProductIds, setSelectedProductIds] = useState(
    () => new Set(section?.productIds ?? []),
  );
  const isEdit = Boolean(section);

  const updateCategoryMediaItem = (
    index: number,
    patch: Partial<HomepageCategoryMediaDraft>,
  ) => {
    setCategoryMediaItems((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(event.currentTarget);

    try {
      const uploadedImage = imageFile ? await uploadAdminFile(imageFile) : imageUrl;
      const uploadedMobileImage = mobileImageFile ? await uploadAdminFile(mobileImageFile) : mobileImageUrl;
      const payload = {
        key: String(data.get("key") ?? ""),
        type: String(data.get("type") ?? "CUSTOM"),
        status: String(data.get("status") ?? "DRAFT"),
        scheduledAt: String(data.get("scheduledAt") ?? "") || null,
        title: String(data.get("title") ?? ""),
        subtitle: String(data.get("subtitle") ?? ""),
        body: String(data.get("body") ?? ""),
        ctaLabel: String(data.get("ctaLabel") ?? ""),
        ctaHref: String(data.get("ctaHref") ?? ""),
        imageUrl: uploadedImage,
        mobileImageUrl: uploadedMobileImage,
        enabled: data.get("enabled") === "on",
        settings: {
          ...(section?.settings ?? {}),
          categoryMediaItems: normalizeHomepageCategoryMediaItems(categoryMediaItems),
          desktopFocalPoint,
          mobileFocalPoint,
          desktopCropRatio,
          mobileCropRatio,
        },
        collectionId: String(data.get("collectionId") ?? "") || null,
        productIds: Array.from(selectedProductIds),
      };

      const response = await fetch(
        section ? `/api/admin/homepage-sections/${section.id}` : "/api/admin/homepage-sections",
        {
          method: section ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save homepage section");

      onSaved(result.section);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save homepage section");
    } finally {
      setSubmitting(false);
    }
  };

  const rollbackVersion = async (versionId: string) => {
    if (!section) return;
    setRollingBackVersionId(versionId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/homepage-sections/${section.id}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to roll back homepage section");
      onSaved(result.section);
      onClose();
    } catch (rollbackError) {
      setError(rollbackError instanceof Error ? rollbackError.message : "Unable to roll back homepage section");
    } finally {
      setRollingBackVersionId(null);
    }
  };

  const previewImage = imageFile ? URL.createObjectURL(imageFile) : imageUrl;

  return (
    <ModalShell title={isEdit ? "Edit homepage section" : "Create homepage section"} onClose={onClose} maxWidth="max-w-5xl">
      {pickerTarget ? (
        <MediaPickerModal
          title={pickerTarget === "desktop" ? "Choose desktop image" : "Choose mobile image"}
          assets={mediaAssets}
          onClose={() => setPickerTarget(null)}
          onPick={(asset) => {
            if (pickerTarget === "desktop") {
              setImageFile(null);
              setImageUrl(asset.url);
            } else {
              setMobileImageFile(null);
              setMobileImageUrl(asset.url);
            }
            setPickerTarget(null);
          }}
        />
      ) : null}
      {categoryMediaPicker ? (
        <MediaPickerModal
          title={
            categoryMediaPicker.field === "videoUrl"
              ? "Choose category video"
              : categoryMediaPicker.field === "posterUrl"
              ? "Choose category poster"
              : "Choose category image"
          }
          assets={mediaAssets.filter((asset) =>
            categoryMediaPicker.field === "videoUrl" ? asset.mediaType === "VIDEO" : asset.mediaType === "IMAGE",
          )}
          onClose={() => setCategoryMediaPicker(null)}
          onPick={(asset) => {
            updateCategoryMediaItem(categoryMediaPicker.index, { [categoryMediaPicker.field]: asset.url });
            setCategoryMediaPicker(null);
          }}
        />
      ) : null}
      <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto p-5">
        {error ? (
          <div className="mb-4 border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Panel title="Section content">
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldLabel label="Title">
                    <input required name="title" defaultValue={section?.title ?? ""} className={inputCls} />
                  </FieldLabel>
                  <FieldLabel label="Key">
                    <input
                      required={isEdit}
                      name="key"
                      defaultValue={section?.key ?? ""}
                      className={inputCls}
                      placeholder="Auto-generated if empty"
                    />
                  </FieldLabel>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldLabel label="Type">
                    <select name="type" defaultValue={section?.type ?? "CUSTOM"} className={inputCls}>
                      {homepageSectionTypes.map((type) => (
                        <option key={type} value={type}>
                          {homepageSectionTypeLabels[type]}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                  <FieldLabel label="Publish state">
                    <select
                      name="status"
                      value={publishStatus}
                      onChange={(event) => setPublishStatus(event.target.value as AdminHomepageSection["status"])}
                      className={inputCls}
                    >
                      <option value="DRAFT">Draft / preview only</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                  </FieldLabel>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldLabel label="Linked collection">
                    <select name="collectionId" defaultValue={section?.collectionId ?? ""} className={inputCls}>
                      <option value="">No collection</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                  {publishStatus === "SCHEDULED" ? (
                    <FieldLabel label="Publish at">
                      <input
                        required
                        type="datetime-local"
                        name="scheduledAt"
                        defaultValue={formatDateTimeLocal(section?.scheduledAt)}
                        className={inputCls}
                      />
                    </FieldLabel>
                  ) : null}
                </div>
                <FieldLabel label="Subtitle">
                  <input name="subtitle" defaultValue={section?.subtitle ?? ""} className={inputCls} />
                </FieldLabel>
                <FieldLabel label="Body">
                  <textarea name="body" rows={5} defaultValue={section?.body ?? ""} className={`${inputCls} h-auto py-3`} />
                </FieldLabel>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldLabel label="CTA label">
                    <input name="ctaLabel" defaultValue={section?.ctaLabel ?? ""} className={inputCls} />
                  </FieldLabel>
                  <FieldLabel label="CTA link">
                    <input name="ctaHref" defaultValue={section?.ctaHref ?? ""} className={inputCls} placeholder="/shop" />
                  </FieldLabel>
                </div>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={section?.enabled ?? true}
                    className="size-4 accent-[var(--accent)]"
                  />
                  Enabled on storefront
                </label>
              </div>
            </Panel>

            <Panel title="Category media grid">
              <div className="space-y-4">
                <p className="text-xs leading-5 text-[var(--muted)]">
                  Used by the homepage category video/image row. Paste HTTPS .mp4/.webm links, add Cloudflare Stream IDs, or choose media from the library.
                </p>
                {categoryMediaItems.map((item, index) => (
                  <div key={item.id} className="border border-[var(--border)] bg-[var(--card)] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        Tile {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => setCategoryMediaItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                        className="text-xs font-semibold uppercase tracking-[0.12em] text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldLabel label="Title">
                        <input
                          value={item.title}
                          onChange={(event) => updateCategoryMediaItem(index, { title: event.target.value })}
                          className={inputCls}
                          placeholder="Leggings"
                        />
                      </FieldLabel>
                      <FieldLabel label="Link">
                        <input
                          value={item.href}
                          onChange={(event) => updateCategoryMediaItem(index, { href: event.target.value })}
                          className={inputCls}
                          placeholder="/shop?category=Leggings"
                        />
                      </FieldLabel>
                      <FieldLabel label="Media type">
                        <select
                          value={item.mediaType}
                          onChange={(event) =>
                            updateCategoryMediaItem(index, {
                              mediaType: event.target.value as HomepageCategoryMediaDraft["mediaType"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="IMAGE">Image</option>
                          <option value="VIDEO">Direct video URL</option>
                          <option value="CLOUDFLARE_STREAM">Cloudflare Stream</option>
                        </select>
                      </FieldLabel>
                      <FieldLabel label="Poster image">
                        <div className="flex gap-2">
                          <input
                            value={item.posterUrl}
                            onChange={(event) => updateCategoryMediaItem(index, { posterUrl: event.target.value })}
                            className={inputCls}
                            placeholder="/images/..."
                          />
                          <button
                            type="button"
                            onClick={() => setCategoryMediaPicker({ index, field: "posterUrl" })}
                            className="mt-2 h-11 border border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.12em]"
                          >
                            Pick
                          </button>
                        </div>
                      </FieldLabel>
                      {item.mediaType === "IMAGE" ? (
                        <FieldLabel label="Image">
                          <div className="flex gap-2">
                            <input
                              value={item.imageUrl}
                              onChange={(event) => updateCategoryMediaItem(index, { imageUrl: event.target.value })}
                              className={inputCls}
                              placeholder="/images/..."
                            />
                            <button
                              type="button"
                              onClick={() => setCategoryMediaPicker({ index, field: "imageUrl" })}
                              className="mt-2 h-11 border border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.12em]"
                            >
                              Pick
                            </button>
                          </div>
                        </FieldLabel>
                      ) : null}
                      {item.mediaType === "VIDEO" ? (
                        <FieldLabel label="Video URL">
                          <div className="flex gap-2">
                            <input
                              value={item.videoUrl}
                              onChange={(event) => updateCategoryMediaItem(index, { videoUrl: event.target.value })}
                              className={inputCls}
                              placeholder="https://pub-...r2.dev/Core-Legging-black.mp4"
                            />
                            <button
                              type="button"
                              onClick={() => setCategoryMediaPicker({ index, field: "videoUrl" })}
                              className="mt-2 h-11 border border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.12em]"
                            >
                              Pick
                            </button>
                          </div>
                        </FieldLabel>
                      ) : null}
                      {item.mediaType === "CLOUDFLARE_STREAM" ? (
                        <FieldLabel label="Cloudflare Stream ID">
                          <div className="space-y-2">
                            <input
                              value={item.cloudflareStreamId}
                              onChange={(event) => updateCategoryMediaItem(index, { cloudflareStreamId: event.target.value })}
                              className={inputCls}
                              placeholder="e.g., d4336699b16201be3067a5175a60cfeb"
                            />
                            <p className="text-xs text-[var(--muted)]">
                              Paste just the video ID from Cloudflare Stream. For custom domains, set NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN in .env.local
                            </p>
                          </div>
                        </FieldLabel>
                      ) : null}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCategoryMediaItems((prev) => [...prev, emptyHomepageCategoryMedia(prev.length)])}
                  className="h-11 w-full border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[var(--hover)]"
                >
                  Add category media tile
                </button>
              </div>
            </Panel>

            <Panel title="Featured products">
              <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center justify-between gap-4 border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium">{product.name}</span>
                      <span className="block text-xs text-[var(--muted)]">{product.sku} · {product.category}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedProductIds.has(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="size-4 accent-[var(--accent)]"
                    />
                  </label>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="Images">
              <div className="space-y-4">
                {previewImage ? (
                  <div
                    className="relative overflow-hidden border border-[var(--border)] bg-[var(--card)]"
                    style={{ aspectRatio: desktopCropRatio || "4 / 5" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewImage}
                      alt="Homepage section preview"
                      className="h-full w-full object-cover"
                      style={{ objectPosition: desktopFocalPoint }}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center border border-dashed border-[var(--border)] bg-[var(--card)] text-xs text-[var(--muted)]">
                    No desktop image
                  </div>
                )}
                <FieldLabel label="Desktop image">
                  <input
                    type="file"
                    accept="image/*"
                    className={inputCls}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setImageFile(file);
                    }}
                  />
                </FieldLabel>
                <button
                  type="button"
                  onClick={() => setPickerTarget("desktop")}
                  className="h-11 w-full border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[var(--hover)]"
                >
                  Choose desktop image from media library
                </button>
                <FieldLabel label="Mobile image">
                  <input
                    type="file"
                    accept="image/*"
                    className={inputCls}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setMobileImageFile(file);
                    }}
                  />
                </FieldLabel>
                <button
                  type="button"
                  onClick={() => setPickerTarget("mobile")}
                  className="h-11 w-full border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[var(--hover)]"
                >
                  Choose mobile image from media library
                </button>
                {mobileImageUrl ? (
                  <p className="text-xs text-[var(--muted)]">Current mobile image: {mobileImageUrl}</p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldLabel label="Desktop focal point">
                    <select value={desktopFocalPoint} onChange={(event) => setDesktopFocalPoint(event.target.value)} className={inputCls}>
                      {focalPointOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                  <FieldLabel label="Mobile focal point">
                    <select value={mobileFocalPoint} onChange={(event) => setMobileFocalPoint(event.target.value)} className={inputCls}>
                      {focalPointOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldLabel label="Desktop crop ratio">
                    <select value={desktopCropRatio} onChange={(event) => setDesktopCropRatio(event.target.value)} className={inputCls}>
                      {cropRatioOptions.map(([value, label]) => (
                        <option key={label} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                  <FieldLabel label="Mobile crop ratio">
                    <select value={mobileCropRatio} onChange={(event) => setMobileCropRatio(event.target.value)} className={inputCls}>
                      {cropRatioOptions.map(([value, label]) => (
                        <option key={label} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                </div>
              </div>
            </Panel>
            {isEdit && section?.versions?.length ? (
              <Panel title="Version history">
                <div className="space-y-2">
                  {section.versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between gap-3 border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-semibold">Version {version.version}</span>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {version.title} · {version.status.toLowerCase()} · {formatAdminDate(version.createdAt)}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={rollingBackVersionId === version.id}
                        onClick={() => void rollbackVersion(version.id)}
                        className="inline-flex h-9 items-center gap-1.5 border border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.12em] disabled:cursor-wait disabled:opacity-60"
                      >
                        <RotateCcw className="size-3.5" />
                        {rollingBackVersionId === version.id ? "Restoring" : "Rollback"}
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            disabled={submitting}
            className="h-11 flex-1 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D] disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? "Saving..." : isEdit ? "Save section" : "Create draft"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 border border-[var(--border)] px-5 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function MediaAssetModal({
  asset,
  onClose,
  onSaved,
  onDelete,
}: {
  asset: AdminMediaAsset;
  onClose: () => void;
  onSaved: (asset: AdminMediaAsset) => void;
  onDelete: (asset: AdminMediaAsset) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? ""),
      altText: String(data.get("altText") ?? ""),
      folder: String(data.get("folder") ?? ""),
      focalPointX: Number(data.get("focalPointX") ?? 0.5),
      focalPointY: Number(data.get("focalPointY") ?? 0.5),
      tags: String(data.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    try {
      const response = await fetch(`/api/admin/media-assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save media asset");
      onSaved(result.asset);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save media asset");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Edit media asset" onClose={onClose} maxWidth="max-w-4xl">
      <form onSubmit={handleSubmit} className="grid max-h-[82vh] gap-5 overflow-y-auto p-5 lg:grid-cols-[320px_1fr]">
        <div>
          <div className="relative aspect-square overflow-hidden border border-[var(--border)] bg-stone-100">
            {asset.mediaType === "IMAGE" ? (
              <Image src={asset.url} alt={asset.altText ?? asset.name} fill sizes="320px" className="object-cover" />
            ) : (
              <video src={asset.url} className="h-full w-full object-cover" controls />
            )}
          </div>
          <p className="mt-3 break-all font-mono text-[11px] text-[var(--muted)]">{asset.url}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
            <span>{asset.mediaType}</span>
            <span>{formatBytes(asset.sizeBytes)}</span>
            <span>{asset.mimeType}</span>
            <span>Used {asset.usageCount}x</span>
            <span>{asset.width && asset.height ? `${asset.width} x ${asset.height}` : "Dimensions pending"}</span>
            <span>{asset.aspectRatio ? `${asset.aspectRatio}:1` : "Ratio pending"}</span>
            <span>{asset.optimizedFormat ? `Target ${asset.optimizedFormat}` : "Original format"}</span>
            <span>{asset.responsiveWidths.length ? `${asset.responsiveWidths.length} widths` : "No width set"}</span>
            <span>Focal X {asset.focalPointX.toFixed(2)}</span>
            <span>Focal Y {asset.focalPointY.toFixed(2)}</span>
          </div>
          <p className="mt-3 break-all text-xs leading-5 text-[var(--muted)]">
            Original source: {asset.originalUrl ?? asset.url}
          </p>
          {asset.derivativeManifest.length ? (
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              Derivatives tracked: {asset.derivativeManifest.map((item) => `${item.width}px${item.format ? ` ${item.format}` : ""}`).join(", ")}
            </p>
          ) : null}
          {asset.responsiveWidths.length ? (
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Responsive widths: {asset.responsiveWidths.join(", ")}px
            </p>
          ) : null}
          {asset.optimizationNotes ? (
            <p className="mt-2 border border-[var(--border)] bg-[var(--card)] p-3 text-xs leading-5 text-[var(--muted)]">
              {asset.optimizationNotes}
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          {error ? (
            <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          ) : null}
          <FieldLabel label="Display name">
            <input name="name" required defaultValue={asset.name} className={inputCls} />
          </FieldLabel>
          <FieldLabel label="Alt text">
            <input name="altText" defaultValue={asset.altText ?? ""} className={inputCls} />
          </FieldLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="Focal point X">
              <input name="focalPointX" type="number" min="0" max="1" step="0.01" defaultValue={asset.focalPointX} className={inputCls} />
            </FieldLabel>
            <FieldLabel label="Focal point Y">
              <input name="focalPointY" type="number" min="0" max="1" step="0.01" defaultValue={asset.focalPointY} className={inputCls} />
            </FieldLabel>
          </div>
          <FieldLabel label="Folder">
            <input name="folder" defaultValue={asset.folder ?? ""} className={inputCls} placeholder="products, homepage, campaigns..." />
          </FieldLabel>
          <FieldLabel label="Tags">
            <input name="tags" defaultValue={asset.tags.join(", ")} className={inputCls} placeholder="hero, leggings, sale" />
          </FieldLabel>
          <FieldLabel label="Original filename">
            <input disabled value={asset.originalName} className={`${inputCls} opacity-60`} />
          </FieldLabel>
          <div className="flex gap-3 pt-2">
            <button
              disabled={submitting}
              className="h-11 flex-1 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D] disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save media"}
            </button>
            <button
              type="button"
              onClick={() => onDelete(asset)}
              className="h-11 border border-red-500/40 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

function AdminUserModal({
  user,
  onClose,
  onSaved,
}: {
  user?: AdminUser;
  onClose: () => void;
  onSaved: (user: AdminUser) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(user);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      role: String(data.get("role") ?? "MANAGER"),
    };

    try {
      const response = await fetch(isEdit ? `/api/admin/users/${user?.id}` : "/api/admin/users", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { name: payload.name, role: payload.role } : payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save admin user");
      onSaved(result.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save admin user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title={isEdit ? "Edit admin user" : "Add admin user"} onClose={onClose}>
      <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
        {error ? (
          <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </div>
        ) : null}
        <FieldLabel label="Name">
          <input required name="name" defaultValue={user?.name ?? ""} className={inputCls} />
        </FieldLabel>
        <FieldLabel label="Email">
          <input
            required
            disabled={isEdit}
            name="email"
            type="email"
            defaultValue={user?.email ?? ""}
            className={`${inputCls} disabled:opacity-60`}
          />
        </FieldLabel>
        {!isEdit ? (
          <FieldLabel label="Temporary password">
            <input required name="password" type="password" minLength={12} className={inputCls} />
          </FieldLabel>
        ) : null}
        <FieldLabel label="Role">
          <select name="role" defaultValue={user?.role ?? "MANAGER"} className={inputCls}>
            {adminRoleOptions.map((role) => (
              <option key={role} value={role}>
                {adminRoleLabels[role]}
              </option>
            ))}
          </select>
        </FieldLabel>
        <button
          disabled={submitting}
          className="h-11 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.14em] text-[#17262D] disabled:opacity-60"
        >
          {submitting ? "Saving..." : isEdit ? "Save user" : "Create user"}
        </button>
      </form>
    </ModalShell>
  );
}

function GenerateDescModal({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setOutput(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Failed to generate description.");
      } else {
        setOutput(data.description ?? "");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalShell title="AI description generator" onClose={onClose}>
      <div className="p-5">
        <form className="flex gap-2" onSubmit={handle}>
          <input
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Product name or attributes…"
            className="h-10 min-w-0 flex-1 border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-10 shrink-0 bg-[var(--accent)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#17262D] disabled:opacity-50"
          >
            {loading ? "Writing…" : "Generate"}
          </button>
        </form>
        {error ? (
          <p className="mt-4 text-xs text-red-500">{error}</p>
        ) : null}
        {output ? (
          <div className="mt-5 border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Generated description
            </p>
            <p className="text-sm leading-6">{output}</p>
            <button
              onClick={copy}
              className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] underline"
            >
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

function ReturnRequestPanel({
  request,
  onClose,
  onUpdated,
}: {
  request: AdminReturnRequest;
  onClose: () => void;
  onUpdated: (request: AdminReturnRequest) => void;
}) {
  const allowed = getReturnRequestTransitions(request.status, request.resolution);
  const [status, setStatus] = useState(allowed[0] ?? request.status);
  const [adminNote, setAdminNote] = useState(request.adminNote ?? "");
  const [externalReference, setExternalReference] = useState(request.externalReference ?? "");
  const [pickupStart, setPickupStart] = useState(request.returnShipment?.pickupStart?.slice(0, 16) ?? "");
  const [pickupEnd, setPickupEnd] = useState(request.returnShipment?.pickupEnd?.slice(0, 16) ?? "");
  const [returnCarrier, setReturnCarrier] = useState(request.returnShipment?.carrier ?? "Velora Returns");
  const [returnTrackingNo, setReturnTrackingNo] = useState(request.returnShipment?.trackingNo ?? "");
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [inspectionCondition, setInspectionCondition] = useState(request.inspection?.condition ?? "GOOD");
  const [disposition, setDisposition] = useState(request.inspection?.disposition ?? "RESTOCK");
  const [inspectionNotes, setInspectionNotes] = useState(request.inspection?.notes ?? "");
  const [refundAmount, setRefundAmount] = useState("");
  const [issuingRefund, setIssuingRefund] = useState(false);
  const [syncingCarrier, setSyncingCarrier] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/returns/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNote,
          externalReference,
          pickupStart: status === "PICKUP_SCHEDULED" ? pickupStart : undefined,
          pickupEnd: status === "PICKUP_SCHEDULED" ? pickupEnd : undefined,
          carrier: status === "PICKUP_SCHEDULED" ? returnCarrier : undefined,
          trackingNo: status === "PICKUP_SCHEDULED" && returnTrackingNo ? returnTrackingNo : undefined,
          inspectionCondition: status === "INSPECTED" ? inspectionCondition : undefined,
          disposition: status === "INSPECTED" ? disposition : undefined,
          inspectionNotes: status === "INSPECTED" ? inspectionNotes : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to update request");
      onUpdated({
        ...request,
        ...result.request,
        adminNote: result.request.adminNote ?? undefined,
        externalReference: result.request.externalReference ?? undefined,
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update request");
    } finally {
      setSaving(false);
    }
  }

  async function generateReturnLabel() {
    setGeneratingLabel(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/returns/${request.id}/label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrier: returnCarrier }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to create return label");
      onUpdated({
        ...request,
        returnShipment: {
          status: result.shipment.status,
          carrier: result.shipment.carrier ?? undefined,
          trackingNo: result.shipment.trackingNo ?? undefined,
          pickupStart: result.shipment.pickupStart,
          pickupEnd: result.shipment.pickupEnd,
          labelId: result.shipment.labelId ?? undefined,
        },
      });
      const labelUrl = URL.createObjectURL(new Blob([result.labelHtml], { type: "text/html" }));
      window.open(labelUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(labelUrl), 60_000);
    } catch (labelError) {
      setError(labelError instanceof Error ? labelError.message : "Unable to create return label");
    } finally {
      setGeneratingLabel(false);
    }
  }

  async function issueReturnRefund(confirmManual = false) {
    setIssuingRefund(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/returns/${request.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: refundAmount.trim() ? Number(refundAmount) : undefined, confirmManual }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to issue refund");
      onUpdated({
        ...request,
        status: result.requestStatus,
        integrationStatus: result.refund.status,
        refund: {
          id: result.refund.id,
          amount: Number(result.refund.amount),
          status: result.refund.status,
          provider: result.refund.provider,
          providerRef: result.refund.providerRef ?? undefined,
          note: result.refund.note ?? undefined,
          updatedAt: result.refund.updatedAt,
        },
      });
    } catch (refundError) {
      setError(refundError instanceof Error ? refundError.message : "Unable to issue refund");
    } finally {
      setIssuingRefund(false);
    }
  }

  async function syncCarrier(action: "SCHEDULE_PICKUP" | "CANCEL_PICKUP" | "REFRESH_STATUS", attemptId?: string) {
    setSyncingCarrier(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/returns/${request.id}/carrier-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, attemptId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Carrier synchronization failed");
      onUpdated({
        ...request,
        integrationStatus: result.attempt.status,
        externalReference: result.attempt.externalRef ?? request.externalReference,
        integrationAttempts: [{
          id: result.attempt.id,
          provider: result.attempt.provider,
          action: result.attempt.action,
          status: result.attempt.status,
          attempts: result.attempt.attempts,
          errorMessage: result.attempt.errorMessage ?? undefined,
          externalRef: result.attempt.externalRef ?? undefined,
          nextRetryAt: result.attempt.nextRetryAt ?? undefined,
          lastAttemptAt: result.attempt.lastAttemptAt ?? undefined,
          createdAt: result.attempt.createdAt,
        }, ...request.integrationAttempts.filter((item) => item.id !== result.attempt.id)],
      });
    } catch (carrierError) {
      setError(carrierError instanceof Error ? carrierError.message : "Carrier synchronization failed");
    } finally {
      setSyncingCarrier(false);
    }
  }

  return (
    <ModalShell title={`${request.resolution} · ${request.orderNumber}`} onClose={onClose} maxWidth="max-w-5xl">
      <div className="max-h-[82vh] overflow-y-auto p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <section className="border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{request.customerName}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{request.email}{request.phone ? ` · ${request.phone}` : ""}</p>
                </div>
                <StatusPill label={request.status} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-xs uppercase text-[var(--muted)]">Reason</dt><dd className="mt-1 font-medium">{request.reason}</dd></div>
                <div><dt className="text-xs uppercase text-[var(--muted)]">Order</dt><dd className="mt-1 font-medium">{request.orderStatus} · {request.paymentStatus}</dd></div>
                <div><dt className="text-xs uppercase text-[var(--muted)]">Fulfillment</dt><dd className="mt-1 font-medium">{request.fulfillmentStatus}</dd></div>
              </dl>
              {request.notes ? <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm leading-6 text-[var(--muted)]">Customer: {request.notes}</p> : null}
            </section>

            <section className="border border-[var(--border)]">
              <h3 className="border-b border-[var(--border)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Requested items</h3>
              <div className="divide-y divide-[var(--border)]">
                {request.items.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm">
                    <div>
                      <p className="font-semibold">{item.title} × {item.quantity}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{item.color} · {item.originalSize}{item.requestedSize ? ` → ${item.requestedSize}` : ""}</p>
                    </div>
                    {item.requestedSize ? (
                      <div className="text-right text-xs">
                        <p className={item.replacementAvailable ? "font-semibold text-emerald-600" : "font-semibold text-red-500"}>{item.replacementAvailable ? "Stock available" : "Stock unavailable"}</p>
                        <p className="mt-1 font-mono text-[var(--muted)]">{item.requestedSku ?? "No SKU"}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            {request.evidence.length ? (
              <section className="border border-[var(--border)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">Customer evidence</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {request.evidence.map((item) => {
                    const url = `/api/admin/returns/${request.id}/evidence/${item.id}`;
                    return (
                      <a key={item.id} href={url} target="_blank" rel="noreferrer" className="group border border-[var(--border)] p-2">
                        <div className="relative aspect-square overflow-hidden bg-[var(--card)]">
                          <Image src={url} alt={item.originalName} fill unoptimized className="object-cover transition group-hover:scale-[1.02]" />
                        </div>
                        <p className="mt-2 truncate text-xs font-medium">{item.originalName}</p>
                        <p className="mt-1 text-[10px] text-[var(--muted)]">{formatBytes(item.sizeBytes)} · {item.uploadedBy}</p>
                        <p className={`mt-1 text-[10px] font-semibold uppercase ${item.scanStatus === "CLEAN" ? "text-emerald-600" : "text-amber-600"}`}>{item.scanStatus} · {item.scanProvider ?? "scanner"}</p>
                      </a>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {request.replacementOrder ? (
              <section className="border border-[var(--accent)] bg-[var(--card)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">Linked replacement order</h3>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold">{request.replacementOrder.orderNumber}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {request.replacementOrder.status} · {request.replacementOrder.fulfillmentStatus} · {request.replacementOrder.shipmentStatus ?? "shipment pending"}
                    </p>
                    {request.replacementOrder.trackingNo ? <p className="mt-1 font-mono text-xs">{request.replacementOrder.trackingNo}</p> : null}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">No-charge exchange</span>
                </div>
              </section>
            ) : null}

            {request.returnShipment ? (
              <section className="border border-[var(--border)] bg-[var(--card)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">Return shipment</h3>
                <p className="mt-3 text-sm font-semibold">{request.returnShipment.status.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  {request.returnShipment.pickupStart && request.returnShipment.pickupEnd
                    ? `${formatAdminDate(request.returnShipment.pickupStart)} - ${new Date(request.returnShipment.pickupEnd).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}`
                    : "Pickup window pending"}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">{request.returnShipment.carrier ?? "Carrier pending"}{request.returnShipment.trackingNo ? ` · ${request.returnShipment.trackingNo}` : ""}</p>
              </section>
            ) : null}

            {request.inspection ? (
              <section className="border border-[var(--border)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">Warehouse inspection</h3>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><p className="text-xs text-[var(--muted)]">Condition</p><p className="mt-1 font-semibold">{request.inspection.condition}</p></div>
                  <div><p className="text-xs text-[var(--muted)]">Disposition</p><p className="mt-1 font-semibold">{request.inspection.disposition}</p></div>
                </div>
                {request.inspection.notes ? <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{request.inspection.notes}</p> : null}
                <p className="mt-3 text-[10px] text-[var(--muted)]">{request.inspection.inspectedBy} · {formatAdminDate(request.inspection.inspectedAt)}</p>
              </section>
            ) : null}

            {request.integrationAttempts.length ? (
              <section className="border border-[var(--border)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">Carrier integration</h3>
                <div className="mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                  {request.integrationAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                      <div><p className="font-semibold">{attempt.action.replaceAll('_', ' ')} · {attempt.status}</p><p className="mt-1 text-[var(--muted)]">{attempt.provider} · attempt {attempt.attempts}{attempt.errorMessage ? ` · ${attempt.errorMessage}` : ''}</p></div>
                      {attempt.status === "FAILED" ? <button type="button" disabled={syncingCarrier} onClick={() => void syncCarrier(attempt.action as "SCHEDULE_PICKUP" | "CANCEL_PICKUP" | "REFRESH_STATUS", attempt.id)} className="border border-[var(--border)] px-3 py-2 font-semibold uppercase">Retry</button> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {request.refund ? (
              <section className="border border-[var(--accent)] bg-[var(--card)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">Refund reconciliation</h3>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                  <div><p className="font-semibold">AED {request.refund.amount.toFixed(2)}</p><p className="mt-1 text-xs text-[var(--muted)]">{request.refund.provider} · {request.refund.status.replaceAll('_', ' ')}</p></div>
                  {request.refund.providerRef ? <span className="font-mono text-xs text-[var(--muted)]">{request.refund.providerRef}</span> : null}
                </div>
                {request.refund.note ? <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{request.refund.note}</p> : null}
              </section>
            ) : null}

            <section className="border border-[var(--border)] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">Lifecycle history</h3>
              <ol className="mt-4 space-y-4">
                {request.events.length ? request.events.map((event) => (
                  <li key={event.id} className="grid grid-cols-[12px_minmax(0,1fr)] gap-3 text-sm">
                    <span className="mt-1.5 size-2 rounded-full bg-[var(--accent)]" />
                    <span><span className="font-semibold">{event.status.replaceAll("_", " ")}</span><span className="ml-2 text-xs text-[var(--muted)]">{formatAdminDate(event.createdAt)} · {event.actor}</span>{event.message ? <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{event.message}</span> : null}</span>
                  </li>
                )) : <li className="text-sm text-[var(--muted)]">No lifecycle events recorded.</li>}
              </ol>
            </section>
          </div>

          <form onSubmit={(event) => void update(event)} className="h-fit border border-[var(--border)] p-4">
            <h3 className="font-semibold">Operational update</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Only valid next states are available. Approval reserves replacement inventory.</p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Next status
              <select value={status} onChange={(event) => setStatus(event.target.value as ReturnRequestStatus)} disabled={!allowed.length} className={inputCls}>
                {allowed.length ? allowed.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>) : <option value={request.status}>{request.status.replaceAll("_", " ")}</option>}
              </select>
            </label>
            {status === "PICKUP_SCHEDULED" ? (
              <div className="mt-4 grid gap-3 border border-[var(--border)] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em]">Pickup window</p>
                <label className="text-xs text-[var(--muted)]">Start<input required type="datetime-local" value={pickupStart} onChange={(event) => setPickupStart(event.target.value)} className={inputCls} /></label>
                <label className="text-xs text-[var(--muted)]">End<input required type="datetime-local" value={pickupEnd} onChange={(event) => setPickupEnd(event.target.value)} className={inputCls} /></label>
                <label className="text-xs text-[var(--muted)]">Carrier<input required value={returnCarrier} onChange={(event) => setReturnCarrier(event.target.value)} className={inputCls} /></label>
                <label className="text-xs text-[var(--muted)]">Tracking number (optional)<input value={returnTrackingNo} onChange={(event) => setReturnTrackingNo(event.target.value)} className={inputCls} /></label>
              </div>
            ) : null}
            {status === "INSPECTED" ? (
              <div className="mt-4 grid gap-3 border border-[var(--border)] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em]">Warehouse inspection</p>
                <label className="text-xs text-[var(--muted)]">Condition
                  <select value={inspectionCondition} onChange={(event) => setInspectionCondition(event.target.value)} className={inputCls}>
                    {['UNOPENED', 'GOOD', 'DAMAGED', 'UNSELLABLE'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label className="text-xs text-[var(--muted)]">Disposition
                  <select value={disposition} onChange={(event) => setDisposition(event.target.value)} className={inputCls}>
                    {['RESTOCK', 'REFURBISH', 'QUARANTINE', 'DISPOSE', 'RETURN_TO_CUSTOMER'].map((value) => <option key={value}>{value.replaceAll('_', ' ')}</option>)}
                  </select>
                </label>
                <label className="text-xs text-[var(--muted)]">Inspection notes<textarea value={inspectionNotes} onChange={(event) => setInspectionNotes(event.target.value)} className="mt-2 min-h-20 w-full border border-[var(--border)] bg-[var(--card)] p-3 text-sm" /></label>
              </div>
            ) : null}
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Admin note
              <textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Decision, rejection reason, pickup details..." className="mt-2 min-h-28 w-full resize-y border border-[var(--border)] bg-[var(--card)] p-3 text-sm outline-none focus:border-[var(--accent)]" />
            </label>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">External reference
              <input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} placeholder="Warehouse or carrier reference" className={inputCls} />
            </label>
            {error ? <p role="alert" className="mt-3 text-xs text-red-500">{error}</p> : null}
            <button type="submit" disabled={saving || !allowed.length} className="mt-5 h-11 w-full bg-[var(--accent)] text-sm font-semibold uppercase tracking-[0.1em] text-[#17262D] disabled:opacity-40">
              {saving ? "Updating..." : allowed.length ? "Apply update" : "Request closed"}
            </button>
            {request.returnShipment?.pickupStart ? (
              <button type="button" onClick={() => void generateReturnLabel()} disabled={generatingLabel} className="mt-3 h-11 w-full border border-[var(--foreground)] text-xs font-semibold uppercase tracking-[0.1em] disabled:opacity-40">
                {generatingLabel ? "Generating..." : request.returnShipment.labelId ? "Reprint return label" : "Generate return label"}
              </button>
            ) : null}
            {request.returnShipment ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void syncCarrier("SCHEDULE_PICKUP")} disabled={syncingCarrier} className="h-10 border border-[var(--border)] text-[10px] font-semibold uppercase tracking-[0.08em] disabled:opacity-40">Sync pickup</button>
                <button type="button" onClick={() => void syncCarrier("REFRESH_STATUS")} disabled={syncingCarrier} className="h-10 border border-[var(--border)] text-[10px] font-semibold uppercase tracking-[0.08em] disabled:opacity-40">Refresh carrier</button>
              </div>
            ) : null}
            {request.status === "INSPECTED" && ["RETURN", "REFUND"].includes(request.resolution) && !request.refund ? (
              <div className="mt-3 border border-[var(--border)] p-3">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Refund amount (optional)
                  <input type="number" min="0.01" step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} placeholder="Selected item value" className={inputCls} />
                </label>
                <button type="button" onClick={() => void issueReturnRefund(false)} disabled={issuingRefund} className="mt-3 h-11 w-full bg-[var(--foreground)] text-xs font-semibold uppercase tracking-[0.1em] text-[var(--background)] disabled:opacity-40">
                  {issuingRefund ? "Submitting..." : "Submit refund"}
                </button>
              </div>
            ) : null}
            {request.refund?.status === "MANUAL_REQUIRED" ? (
              <button type="button" onClick={() => void issueReturnRefund(true)} disabled={issuingRefund} className="mt-3 h-11 w-full bg-[var(--foreground)] text-xs font-semibold uppercase tracking-[0.1em] text-[var(--background)] disabled:opacity-40">
                {issuingRefund ? "Confirming..." : "Confirm manual payout"}
              </button>
            ) : null}
          </form>
        </div>
      </div>
    </ModalShell>
  );
}

// ── AdminConsole ──────────────────────────────────────────────────────────────

export function AdminConsole({ access, catalog }: { access: AdminAccess; catalog: AdminCatalog }) {
  const router = useRouter();
  const canAccessSection = useCallback((section: Section) => {
    const required = sectionPermissionMap[section];
    return !required || access.permissions.includes("*") || access.permissions.includes(required);
  }, [access.permissions]);
  const visibleSections = useMemo(
    () => sections.filter(([key]) => canAccessSection(key)),
    [canAccessSection],
  );
  const canWriteSecurity = access.permissions.includes("*") || access.permissions.includes("security:write");
  const [active, setActive] = useState<Section>("overview");
  const [query, setQuery] = useState("");
  const [serverSearchResults, setServerSearchResults] = useState<AdminSearchResult[]>([]);
  const [serverSearchLoading, setServerSearchLoading] = useState(false);
  const [serverSearchOpen, setServerSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mutationCount, setMutationCount] = useState(0);

  // Overlay states
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | "new" | null>(null);
  const [editingCollection, setEditingCollection] = useState<AdminCollection | "new" | null>(null);
  const [editingColor, setEditingColor] = useState<AdminColor | "new" | null>(null);
  const [editingSize, setEditingSize] = useState<AdminSize | "new" | null>(null);
  const [editingTag, setEditingTag] = useState<AdminTag | "new" | null>(null);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [viewReturnId, setViewReturnId] = useState<string | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [addCouponOpen, setAddCouponOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);
  const [issueGiftCardOpen, setIssueGiftCardOpen] = useState(false);
  const [editingAdminUser, setEditingAdminUser] = useState<AdminUser | "new" | null>(null);
  const [editingHomepageSection, setEditingHomepageSection] = useState<AdminHomepageSection | "new" | null>(null);
  const [editingMediaAsset, setEditingMediaAsset] = useState<AdminMediaAsset | null>(null);
  const [inventoryLogVariantId, setInventoryLogVariantId] = useState<string | null>(null);
  const [viewCustomer, setViewCustomer] = useState<AdminCustomer | null>(null);
  const [generateDescOpen, setGenerateDescOpen] = useState(false);

  // Data state
  const [catalogProducts, setCatalogProducts] = useState(catalog.products);
  const [reviewRows, setReviewRows] = useState(catalog.reviews);
  const [moderatingReviewId, setModeratingReviewId] = useState<string | null>(null);
  const [returnRows, setReturnRows] = useState(catalog.returnRequests);
  const [categoryRows, setCategoryRows] = useState(catalog.categories);
  const [collectionRows, setCollectionRows] = useState(catalog.collections);
  const [colorRows, setColorRows] = useState(catalog.colors);
  const [sizeRows, setSizeRows] = useState(catalog.sizes);
  const [tagRows, setTagRows] = useState(catalog.tags);
  const [inventoryRowsState, setInventoryRowsState] = useState(catalog.inventory);
  const [inventoryAdjustmentReason, setInventoryAdjustmentReason] = useState("MANUAL_ADJUSTMENT");
  const [orderRows, setOrderRows] = useState(catalog.orders);
  const [customerRows, setCustomerRows] = useState(catalog.customers);
  const [activityLogs] = useState(catalog.activityLogs);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("PAID");
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState("paid");
  const [bulkFulfillmentStatus, setBulkFulfillmentStatus] = useState("fulfilled");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const [customerTagFilter, setCustomerTagFilter] = useState("All");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("All");
  const [customerLifecycleFilter, setCustomerLifecycleFilter] = useState("All");
  const [adminUsers, setAdminUsers] = useState(catalog.adminUsers);
  const [homepageSections, setHomepageSections] = useState(catalog.homepageSections);
  const [mediaAssets, setMediaAssets] = useState(catalog.mediaAssets);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [productStatuses, setProductStatuses] = useState<Record<string, AdminProduct["status"]>>({});
  const [coupons, setCoupons] = useState<AdminCoupon[]>(catalog.coupons);
  const [giftCards, setGiftCards] = useState<AdminGiftCard[]>(catalog.giftCards);
  const [emailIntegrations, setEmailIntegrations] = useState<AdminEmailIntegration[]>(catalog.emailIntegrations);
  const [automationWorkflows, setAutomationWorkflows] = useState<AdminAutomationWorkflow[]>(catalog.automationWorkflows);
  const [emailDeliveries, setEmailDeliveries] = useState<AdminEmailDelivery[]>(catalog.emailDeliveries);
  const [automationEvents, setAutomationEvents] = useState<AdminAutomationEvent[]>(catalog.automationEvents);
  const [emailProviderEvents] = useState<AdminEmailProviderEvent[]>(catalog.emailProviderEvents);
  const [paymentProviderEvents] = useState<AdminPaymentProviderEvent[]>(catalog.paymentProviderEvents);
  const [scheduledReports, setScheduledReports] = useState<AdminScheduledReport[]>(catalog.scheduledReports);
  const [checkoutSettings, setCheckoutSettings] = useState<AdminCheckoutSettings>(catalog.checkoutSettings);
  const [savingCheckoutSettings, setSavingCheckoutSettings] = useState(false);
  const [returnSettings, setReturnSettings] = useState<AdminReturnSettings>(catalog.returnSettings);
  const [savingReturnSettings, setSavingReturnSettings] = useState(false);
  const [recommendationSettings, setRecommendationSettings] = useState<AdminRecommendationSettings>(catalog.recommendationSettings);
  const [savingRecommendationSettings, setSavingRecommendationSettings] = useState(false);
  const [recommendationSourceId, setRecommendationSourceId] = useState(catalog.products.find((product) => product.status === "Published")?.id ?? "");
  const [searchMerchandisingSettings, setSearchMerchandisingSettings] =
    useState<AdminSearchMerchandisingSettings>(catalog.searchMerchandisingSettings);
  const [savingSearchMerchandisingSettings, setSavingSearchMerchandisingSettings] = useState(false);
  const [globalContentSettings, setGlobalContentSettings] = useState<AdminGlobalContentSettings>(catalog.globalContentSettings);
  const [savingGlobalContent, setSavingGlobalContent] = useState<"draft" | "publish" | null>(null);
  const [productAlertDeliveries, setProductAlertDeliveries] = useState(catalog.productAlertDeliveries);
  const [processingProductAlerts, setProcessingProductAlerts] = useState(false);
  const [orderFilter, setOrderFilter] = useState("All");
  const [returnStatusFilter, setReturnStatusFilter] = useState("All");
  const [returnResolutionFilter, setReturnResolutionFilter] = useState("All");
  const [orderTagFilter, setOrderTagFilter] = useState("All");
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [activityEntityFilter, setActivityEntityFilter] = useState("All");
  const [activityDateFilter, setActivityDateFilter] = useState("");
  const [mediaQuery, setMediaQuery] = useState("");
  const [translationEntity, setTranslationEntity] = useState<TranslationEntity>("product");
  const [translationOwnerId, setTranslationOwnerId] = useState(catalog.products[0]?.id ?? "");
  const [translationDraft, setTranslationDraft] = useState<TranslationDraft>(emptyTranslationDraft);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [savingTranslation, setSavingTranslation] = useState(false);

  // Confirm dialog
  const [confirmPending, setConfirmPending] = useState<ConfirmPending | null>(null);
  const askConfirm = (opts: ConfirmPending) => setConfirmPending(opts);

  // Pagination
  const PAGE_SIZE = 25;
  const [orderPage, setOrderPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [mediaPage, setMediaPage] = useState(1);

  const mediaUploadRef = useRef<HTMLInputElement>(null);
  const inventoryImportRef = useRef<HTMLInputElement>(null);
  const showToast = (msg: string) => setToast(msg);
  const globalContentDraft = globalContentSettings.draft;

  const updateGlobalDraft = (updater: (draft: GlobalContent) => GlobalContent) => {
    setGlobalContentSettings((current) => ({ ...current, draft: updater(current.draft) }));
  };

  const updateLocalizedText = (
    value: LocalizedText,
    locale: keyof LocalizedText,
    next: string,
  ): LocalizedText => ({ ...value, [locale]: next });

  const updateGlobalLink = (
    collection: "primaryNavigation" | "serviceLinks",
    id: string,
    updater: (item: GlobalLinkItem) => GlobalLinkItem,
  ) => {
    updateGlobalDraft((draft) => ({
      ...draft,
      [collection]: draft[collection].map((item) => (item.id === id ? updater(item) : item)),
    }));
  };

  const updateFooterGroup = (
    id: string,
    updater: (group: GlobalFooterGroup) => GlobalFooterGroup,
  ) => {
    updateGlobalDraft((draft) => ({
      ...draft,
      footerGroups: draft.footerGroups.map((group) => (group.id === id ? updater(group) : group)),
    }));
  };

  const translationOwnerOptions = useMemo(() => {
    if (translationEntity === "category") return categoryRows.map((item) => ({ id: item.id, label: item.name }));
    if (translationEntity === "collection") return collectionRows.map((item) => ({ id: item.id, label: item.name }));
    if (translationEntity === "homepageSection") return homepageSections.map((item) => ({ id: item.id, label: item.title }));
    return catalogProducts.map((item) => ({ id: item.id, label: item.name }));
  }, [catalogProducts, categoryRows, collectionRows, homepageSections, translationEntity]);

  const selectedTranslationOwner = useMemo(
    () => translationOwnerOptions.find((item) => item.id === translationOwnerId),
    [translationOwnerOptions, translationOwnerId],
  );

  const firstTranslationOwnerIdFor = (entity: TranslationEntity) => {
    if (entity === "category") return categoryRows[0]?.id ?? "";
    if (entity === "collection") return collectionRows[0]?.id ?? "";
    if (entity === "homepageSection") return homepageSections[0]?.id ?? "";
    return catalogProducts[0]?.id ?? "";
  };

  const updateTranslationField = (field: keyof TranslationDraft, value: string) => {
    setTranslationDraft((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (!translationOwnerId) return;

    const controller = new AbortController();
    fetch(`/api/admin/translations?entity=${translationEntity}&ownerId=${encodeURIComponent(translationOwnerId)}&locale=ar`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Unable to load translation");
        const translation = result.translation ?? {};
        setTranslationDraft({
          title: translation.title ?? "",
          name: translation.name ?? "",
          description: translation.description ?? "",
          summary: translation.summary ?? "",
          fabricDetails: translation.fabricDetails ?? "",
          careInstructions: translation.careInstructions ?? "",
          subtitle: translation.subtitle ?? "",
          body: translation.body ?? "",
          ctaLabel: translation.ctaLabel ?? "",
          ctaHref: translation.ctaHref ?? "",
          seoTitle: translation.seoTitle ?? "",
          seoDescription: translation.seoDescription ?? "",
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTranslationDraft(emptyTranslationDraft);
        showToast(error instanceof Error ? error.message : "Unable to load translation");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingTranslation(false);
      });

    return () => controller.abort();
  }, [translationEntity, translationOwnerId]);

  const saveTranslation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!translationOwnerId) return;

    setSavingTranslation(true);
    try {
      const response = await fetch("/api/admin/translations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: translationEntity,
          ownerId: translationOwnerId,
          locale: "ar",
          ...translationDraft,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save translation");
      showToast(`Arabic translation saved for ${selectedTranslationOwner?.label ?? "record"}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save translation");
    } finally {
      setSavingTranslation(false);
    }
  };

  const saveCheckoutSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingCheckoutSettings(true);
    try {
      const form = new FormData(event.currentTarget);
      const standardPrice = Number(form.get("standardShippingPrice") ?? 25);
      const standardFreeOverValue = String(form.get("standardShippingFreeOver") ?? "").trim();
      const expressPrice = Number(form.get("expressShippingPrice") ?? 40);
      const response = await fetch("/api/admin/settings/checkout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashOnDeliveryEnabled: form.get("cashOnDeliveryEnabled") === "on",
          cashOnDeliveryLabel: form.get("cashOnDeliveryLabel"),
          cashOnDeliveryInstructions: form.get("cashOnDeliveryInstructions"),
          addressAutocomplete: {
            provider: form.get("addressAutocompleteProvider"),
            enabled: form.get("addressAutocompleteEnabled") === "on",
            fallbackToLocal: form.get("addressAutocompleteFallbackToLocal") === "on",
            apiKeyConfigured: form.get("addressAutocompleteApiKeyConfigured") === "on",
          },
          expressCheckout: {
            enabled: form.get("expressCheckoutEnabled") === "on",
            applePay: form.get("expressCheckoutApplePay") === "on",
            googlePay: form.get("expressCheckoutGooglePay") === "on",
          },
          paymentMethods: [
            {
              id: "stripe",
              enabled: form.get("stripeEnabled") === "on",
              label: form.get("stripeLabel"),
              description: form.get("stripeDescription"),
              sortOrder: Number(form.get("stripeSortOrder") ?? 1),
            },
            {
              id: "cash_on_delivery",
              enabled: form.get("cashOnDeliveryEnabled") === "on",
              label: form.get("cashOnDeliveryLabel"),
              description: form.get("cashOnDeliveryInstructions"),
              sortOrder: Number(form.get("cashOnDeliverySortOrder") ?? 4),
            },
            {
              id: "paypal",
              enabled: form.get("paypalEnabled") === "on",
              label: form.get("paypalLabel"),
              description: form.get("paypalDescription"),
              sortOrder: Number(form.get("paypalSortOrder") ?? 2),
            },
            {
              id: "tabby",
              enabled: form.get("tabbyEnabled") === "on",
              label: form.get("tabbyLabel"),
              description: form.get("tabbyDescription"),
              sortOrder: Number(form.get("tabbySortOrder") ?? 3),
            },
          ],
          shippingZones: [
            {
              id: "uae",
              name: String(form.get("shippingZoneName") ?? "United Arab Emirates"),
              emirates: [
                "Abu Dhabi",
                "Dubai",
                "Sharjah",
                "Ajman",
                "Umm Al Quwain",
                "Ras Al Khaimah",
                "Fujairah",
              ],
              methods: [
                {
                  id: "standard",
                  label: form.get("standardShippingLabel"),
                  estimate: form.get("standardShippingEstimate"),
                  price: Number.isFinite(standardPrice) ? standardPrice : 25,
                  freeOver: standardFreeOverValue ? Number(standardFreeOverValue) : null,
                  enabled: form.get("standardShippingEnabled") === "on",
                },
                {
                  id: "express",
                  label: form.get("expressShippingLabel"),
                  estimate: form.get("expressShippingEstimate"),
                  price: Number.isFinite(expressPrice) ? expressPrice : 40,
                  freeOver: null,
                  enabled: form.get("expressShippingEnabled") === "on",
                },
              ],
            },
          ],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save checkout settings");
      setCheckoutSettings(result.settings);
      showToast("Checkout settings saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save checkout settings");
    } finally {
      setSavingCheckoutSettings(false);
    }
  };

  const saveReturnSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingReturnSettings(true);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/admin/settings/returns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnsEnabled: form.get("returnsEnabled") === "on",
          exchangesEnabled: form.get("exchangesEnabled") === "on",
          refundsEnabled: form.get("refundsEnabled") === "on",
          returnWindowDays: Number(form.get("returnWindowDays")),
          requireDeliveredOrder: form.get("requireDeliveredOrder") === "on",
          allowDefectClaimsOutsideWindow: form.get("allowDefectClaimsOutsideWindow") === "on",
          requireOriginalTags: form.get("requireOriginalTags") === "on",
          policySummary: form.get("policySummary"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save return settings");
      setReturnSettings(result.settings);
      showToast("Return policy settings saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save return settings");
    } finally {
      setSavingReturnSettings(false);
    }
  };

  const saveRecommendationSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingRecommendationSettings(true);
    try {
      const response = await fetch("/api/admin/settings/recommendations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recommendationSettings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save recommendation settings");
      setRecommendationSettings(result.settings);
      showToast("Recommendation settings saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save recommendation settings");
    } finally {
      setSavingRecommendationSettings(false);
    }
  };

  const saveSearchMerchandisingSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSearchMerchandisingSettings(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      synonyms: parseLines(String(form.get("synonyms") ?? ""), "list"),
      redirects: parseLines(String(form.get("redirects") ?? ""), "single"),
      pinnedProducts: parseLines(String(form.get("pinnedProducts") ?? ""), "list"),
      boostedProducts: parseLines(String(form.get("boostedProducts") ?? ""), "list"),
      buriedProducts: parseLines(String(form.get("buriedProducts") ?? ""), "list"),
    };
    try {
      const response = await fetch("/api/admin/settings/search-merchandising", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save search merchandising");
      setSearchMerchandisingSettings(result.settings);
      showToast("Search merchandising saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save search merchandising");
    } finally {
      setSavingSearchMerchandisingSettings(false);
    }
  };

  const saveGlobalContentSettings = async (action: "draft" | "publish") => {
    setSavingGlobalContent(action);
    try {
      const response = await fetch("/api/admin/settings/global-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, content: globalContentDraft }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save global storefront content");
      setGlobalContentSettings(result.settings);
      showToast(action === "publish" ? "Global storefront content published" : "Global storefront draft saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save global storefront content");
    } finally {
      setSavingGlobalContent(null);
    }
  };

  const handleCustomerUpdated = (customer: AdminCustomer) => {
    setCustomerRows((prev) => prev.map((item) => (item.id === customer.id ? customer : item)));
    setViewCustomer(customer);
  };

  const handleCustomerMerged = (customer: AdminCustomer, removedCustomerIds: string[]) => {
    setCustomerRows((prev) =>
      prev
        .filter((item) => !removedCustomerIds.includes(item.id))
        .map((item) => (item.id === customer.id ? customer : item))
        .sort((a, b) => {
          const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
          const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
          return bTime - aTime || b.lifetimeValue - a.lifetimeValue;
        }),
    );
    setViewCustomer(customer);
    showToast("Guest orders merged into the account customer");
  };

  useEffect(() => {
    const restoreSection = () => {
      const stored = getStoredAdminSection();
      setActive(canAccessSection(stored) ? stored : "overview");
    };
    restoreSection();
    window.addEventListener("hashchange", restoreSection);
    return () => window.removeEventListener("hashchange", restoreSection);
  }, [canAccessSection]);

  useEffect(() => {
    const originalFetch = window.fetch;
    const trackedFetch: typeof window.fetch = async (input, init) => {
      const request = input instanceof Request ? input : null;
      const url = request?.url ?? String(input);
      const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
      const isAdminMutation = url.includes("/api/admin/") && method !== "GET" && method !== "HEAD";

      if (isAdminMutation) setMutationCount((count) => count + 1);
      try {
        return await originalFetch(input, init);
      } finally {
        if (isAdminMutation) setMutationCount((count) => Math.max(0, count - 1));
      }
    };

    window.fetch = trackedFetch;
    return () => {
      if (window.fetch === trackedFetch) window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setServerSearchLoading(true);
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
        });
        const result = await response.json();
        if (response.ok) setServerSearchResults(result.results ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setServerSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setServerSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const navigateSection = (section: Section) => {
    if (!canAccessSection(section)) return;
    setActive(section);
    window.localStorage.setItem("velora-admin-section", section);
    window.history.replaceState(null, "", `${window.location.pathname}#${section}`);
  };

  // Filtered data
  const filteredProducts = useMemo(
    () =>
      catalogProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.sku.toLowerCase().includes(query.toLowerCase()) ||
          p.slug.toLowerCase().includes(query.toLowerCase()) ||
          p.tags.some((tag) => tag.name.toLowerCase().includes(query.toLowerCase()))
      ),
    [catalogProducts, query]
  );
  const filteredCategories = useMemo(
    () =>
      categoryRows.filter((category) =>
        `${category.name} ${category.slug} ${category.parentName ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [categoryRows, query],
  );
  const filteredCollections = useMemo(
    () =>
      collectionRows.filter((collection) =>
        `${collection.name} ${collection.slug} ${collection.summary}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [collectionRows, query],
  );
  const filteredColors = useMemo(
    () =>
      colorRows.filter((color) =>
        `${color.name} ${color.hex}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [colorRows, query],
  );
  const filteredSizes = useMemo(
    () => sizeRows.filter((size) => size.name.toLowerCase().includes(query.toLowerCase())),
    [sizeRows, query],
  );
  const filteredTags = useMemo(
    () => tagRows.filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase())),
    [tagRows, query],
  );
  const orderTagOptions = useMemo(
    () => ["All", ...Array.from(new Set(orderRows.flatMap((order) => order.orderTags))).sort()],
    [orderRows],
  );
  const filteredOrders = useMemo(
    () =>
      orderRows.filter((o) =>
        `${o.orderNumber} ${o.customerName} ${o.email} ${o.phone ?? ""} ${o.orderTags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [orderRows, query]
  );
  const displayOrders = useMemo(
    () =>
      filteredOrders.filter((o) => {
        if (orderFilter !== "All" && o.status !== orderFilter) return false;
        if (orderTagFilter !== "All" && !o.orderTags.some((tag) => tag === orderTagFilter)) return false;
        if (orderDateFrom || orderDateTo) {
          const d = o.createdAt.slice(0, 10); // "YYYY-MM-DD"
          if (orderDateFrom && d < orderDateFrom) return false;
          if (orderDateTo && d > orderDateTo) return false;
        }
        return true;
      }),
    [filteredOrders, orderFilter, orderTagFilter, orderDateFrom, orderDateTo]
  );
  const filteredReturns = useMemo(
    () => returnRows.filter((request) => {
      const matchesQuery = `${request.orderNumber} ${request.customerName} ${request.email} ${request.phone ?? ""} ${request.reason} ${request.resolution} ${request.status}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = returnStatusFilter === "All" || request.status === returnStatusFilter;
      const matchesResolution = returnResolutionFilter === "All" || request.resolution === returnResolutionFilter;
      return matchesQuery && matchesStatus && matchesResolution;
    }),
    [query, returnResolutionFilter, returnRows, returnStatusFilter],
  );
  const customerTagOptions = useMemo(
    () => [
      "All",
      ...Array.from(new Set(customerRows.flatMap((customer) => customer.tags))).sort(),
    ],
    [customerRows],
  );

  const filteredCustomers = useMemo(
    () =>
      customerRows.filter((c) => {
        const matchesQuery = `${c.name} ${c.email} ${c.phone ?? ""} ${c.type} ${c.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesTag =
          customerTagFilter === "All" || c.tags.some((tag) => tag === customerTagFilter);
        const matchesType = customerTypeFilter === "All" || c.type === customerTypeFilter;
        const matchesLifecycle =
          customerLifecycleFilter === "All" ||
          (customerLifecycleFilter === "VIP" && c.lifetimeValue >= 1000) ||
          (customerLifecycleFilter === "Returning" && c.orderCount >= 2) ||
          (customerLifecycleFilter === "New" && c.orderCount <= 1) ||
          (customerLifecycleFilter === "Active" && c.tags.includes("Active")) ||
          (customerLifecycleFilter === "At risk" && c.tags.some((tag) => tag.toLowerCase().includes("risk"))) ||
          (customerLifecycleFilter === "Has notes" && Boolean(c.notes?.trim()));
        return matchesQuery && matchesTag && matchesType && matchesLifecycle;
      }),
    [customerLifecycleFilter, customerRows, customerTagFilter, customerTypeFilter, query],
  );
  const filteredInventoryRows = useMemo(
    () =>
      inventoryRowsState.filter((row) =>
        `${row.productName} ${row.sku ?? ""} ${row.colorName} ${row.sizeName} ${row.status}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [inventoryRowsState, query],
  );
  const filteredMediaAssets = useMemo(
    () =>
      mediaAssets.filter((asset) => {
        const q = mediaQuery.trim().toLowerCase();
        if (!q) return true;
        return [
          asset.name,
          asset.originalName,
          asset.url,
          asset.mimeType,
          asset.folder ?? "",
          asset.altText ?? "",
          asset.tags.join(" "),
        ].some((value) => value.toLowerCase().includes(q));
      }),
    [mediaAssets, mediaQuery],
  );

  // Alert badge: low/out-of-stock variants + pending orders
  const alertCount = useMemo(
    () =>
      inventoryRowsState.filter((r) => r.status !== "In stock").length +
      orderRows.filter((o) => o.status === "PENDING" || o.status === "PROCESSING").length,
    [inventoryRowsState, orderRows],
  );

  // Live alerts derived from real inventory + order data
  const liveAlerts = useMemo<AdminAlert[]>(() => {
    const result: AdminAlert[] = [];

    const outOfStock = inventoryRowsState.filter((r) => r.stock === 0);
    const lowStock = inventoryRowsState.filter((r) => r.stock > 0 && r.stock <= 5);
    const pending = orderRows.filter((o) => o.status === "PENDING" || o.status === "PROCESSING");
    const drafts = catalogProducts.filter((p) => p.status === "Draft");

    if (outOfStock.length > 0) {
      result.push({
        type: "High",
        message: `${outOfStock.length} variant${outOfStock.length > 1 ? "s are" : " is"} out of stock and need immediate restocking.`,
      });
    }
    if (lowStock.length > 0) {
      const worst = lowStock.reduce((min, r) => (r.stock < min.stock ? r : min), lowStock[0]);
      result.push({
        type: "High",
        message: `${lowStock.length} SKU${lowStock.length > 1 ? "s have" : " has"} fewer than 5 units — critical: ${worst.productName} (${worst.colorName}/${worst.sizeName}) with ${worst.stock} left.`,
      });
    }
    if (pending.length > 0) {
      result.push({
        type: "High",
        message: `${pending.length} order${pending.length > 1 ? "s are" : " is"} pending or processing and await dispatch.`,
      });
    }
    if (drafts.length > 0) {
      result.push({
        type: "Low",
        message: `${drafts.length} product${drafts.length > 1 ? "s remain" : " remains"} in draft — review and publish when ready.`,
      });
    }
    if (result.length === 0) {
      result.push({ type: "Low", message: "All systems normal — no alerts at this time." });
    }
    return result;
  }, [inventoryRowsState, orderRows, catalogProducts]);

  // Analytics KPIs derived from real catalog data
  const analyticsData = useMemo(() => {
    const msPerDay = 86_400_000;
    const referenceTime = Math.max(
      0,
      ...orderRows.map((order) => new Date(order.createdAt).getTime()),
    );
    const weekAgo = referenceTime - 7 * msPerDay;

    const weekOrders = orderRows.filter((o) => new Date(o.createdAt).getTime() >= weekAgo);
    const weekRevenue = weekOrders.reduce((s, o) => s + o.total, 0);
    const avgOrderValue = weekOrders.length > 0 ? weekRevenue / weekOrders.length : 0;
    const monthAgo = referenceTime - 30 * msPerDay;
    const monthOrders = orderRows.filter((o) => new Date(o.createdAt).getTime() >= monthAgo);
    const monthRevenue = monthOrders.reduce((sum, order) => sum + order.total, 0);
    const dailyRevenue = Array.from({ length: 7 }, (_, index) => {
      const dayStart = weekAgo + index * msPerDay;
      const dayEnd = dayStart + msPerDay;
      const orders = orderRows.filter((order) => {
        const time = new Date(order.createdAt).getTime();
        return time >= dayStart && time < dayEnd;
      });
      return {
        date: new Date(dayStart).toISOString().slice(0, 10),
        orders: orders.length,
        revenue: orders.reduce((sum, order) => sum + order.total, 0),
      };
    });

    // Best seller (all-time by units)
    const sales = new Map<string, { title: string; qty: number }>();
    for (const order of orderRows) {
      for (const item of order.items) {
        const entry = sales.get(item.productId);
        if (entry) entry.qty += item.quantity;
        else sales.set(item.productId, { title: item.title, qty: item.quantity });
      }
    }
    const bestSeller = [...sales.values()].sort((a, b) => b.qty - a.qty)[0];

    const returningCount = customerRows.filter((c) => c.orderCount >= 2).length;
    const returningPct =
      customerRows.length > 0
        ? Math.round((returningCount / customerRows.length) * 100)
        : 0;
    const vipCount = customerRows.filter((c) => c.lifetimeValue >= 1000).length;

    const outOfStockCount = inventoryRowsState.filter((r) => r.stock === 0).length;
    const draftCount = catalogProducts.filter((p) => p.status === "Draft").length;
    const nowDate = new Date();
    const activeCoupons = coupons.filter(
      (c) => !c.expiresAt || new Date(c.expiresAt).getTime() > nowDate.getTime(),
    ).length;

    const pendingCount = orderRows.filter(
      (o) => o.status === "PENDING" || o.status === "PROCESSING",
    ).length;

    // Week label (Mon – Sun of current week)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const wFmt = new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric", year: "numeric" });
    const weekLabel = `Week of ${wFmt.format(monday)} – ${wFmt.format(sunday)}`;

    const cards: [string, string, string, string][] = [
      [
        "Cart conversion",
        `${catalog.cartAnalytics.conversionRate.toFixed(1)}%`,
        `${catalog.cartAnalytics.completedCarts} of ${catalog.cartAnalytics.cartsStarted} carts completed`,
        catalog.cartAnalytics.conversionRate >= 3 ? "up" : "down",
      ],
      [
        "Checkout conversion",
        `${catalog.cartAnalytics.checkoutConversionRate.toFixed(1)}%`,
        `${catalog.cartAnalytics.completedCarts} of ${catalog.cartAnalytics.checkoutsStarted} checkouts paid`,
        catalog.cartAnalytics.checkoutConversionRate >= 40 ? "up" : "warn",
      ],
      [
        "Abandoned carts",
        String(catalog.cartAnalytics.abandonedCarts),
        `${formatAdminMoney(catalog.cartAnalytics.abandonedValue)} recoverable value`,
        catalog.cartAnalytics.abandonedCarts > 0 ? "warn" : "up",
      ],
      [
        "Weekly revenue",
        weekRevenue > 0 ? `AED ${Math.round(weekRevenue).toLocaleString()}` : "AED 0",
        `${weekOrders.length} order${weekOrders.length !== 1 ? "s" : ""} this week`,
        weekRevenue > 0 ? "up" : "down",
      ],
      [
        "30-day revenue",
        `AED ${Math.round(monthRevenue).toLocaleString()}`,
        `${monthOrders.length} order${monthOrders.length !== 1 ? "s" : ""} in 30 days`,
        monthRevenue > 0 ? "up" : "down",
      ],
      [
        "Avg order value",
        weekOrders.length > 0 ? `AED ${Math.round(avgOrderValue).toLocaleString()}` : "—",
        weekOrders.length > 0 ? `Across ${weekOrders.length} this-week orders` : "No orders this week",
        weekOrders.length > 0 ? "up" : "down",
      ],
      [
        "Best seller",
        bestSeller ? bestSeller.title.split(" ").slice(0, 3).join(" ") : "—",
        bestSeller ? `${bestSeller.qty} unit${bestSeller.qty !== 1 ? "s" : ""} sold all-time` : "No sales yet",
        bestSeller ? "up" : "down",
      ],
      [
        "Returning customers",
        `${returningPct}%`,
        `${vipCount} VIP (≥ AED 1,000 lifetime)`,
        returningPct >= 30 ? "up" : "down",
      ],
      [
        "Pending orders",
        String(pendingCount),
        pendingCount > 0 ? "Awaiting fulfillment" : "All orders fulfilled",
        pendingCount > 0 ? "warn" : "up",
      ],
      [
        "Out-of-stock SKUs",
        String(outOfStockCount),
        outOfStockCount > 0 ? "Needs restocking" : "All variants in stock ✓",
        outOfStockCount > 0 ? "warn" : "up",
      ],
      [
        "Products in draft",
        String(draftCount),
        draftCount > 0 ? "Not yet published" : "All products published ✓",
        draftCount > 5 ? "warn" : "up",
      ],
      [
        "Active coupons",
        String(activeCoupons),
        `${coupons.length} total · ${activeCoupons} valid`,
        activeCoupons > 0 ? "up" : "down",
      ],
    ];

    const couponPerformance = [...coupons]
      .sort((a, b) => b.usageCount - a.usageCount)
      .map((coupon) => ({
        code: coupon.code,
        usageCount: coupon.usageCount,
        status: coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= nowDate.getTime() ? "Expired" : "Active",
      }));
    const inventoryRisk = [...inventoryRowsState]
      .filter((row) => row.status !== "In stock")
      .sort((a, b) => a.availableStock - b.availableStock)
      .slice(0, 10);

    return {
      weekLabel,
      cards,
      dailyRevenue,
      couponPerformance,
      inventoryRisk,
      summary: {
        weekRevenue,
        monthRevenue,
        avgOrderValue,
        returningPct,
        bestSeller: bestSeller ? `${bestSeller.title} (${bestSeller.qty} units)` : "No sales",
        conversionRate: catalog.cartAnalytics.conversionRate,
        abandonedCarts: catalog.cartAnalytics.abandonedCarts,
        abandonedValue: catalog.cartAnalytics.abandonedValue,
      },
    };
  }, [orderRows, customerRows, inventoryRowsState, catalogProducts, coupons, catalog.cartAnalytics]);

  // Activity log from persisted admin mutations
  const activityLogEntries = useMemo(() => {
    return catalog.activityLogs.filter((log) => {
      const matchesEntity = activityEntityFilter === "All" || log.entityType === activityEntityFilter;
      const matchesDate =
        !activityDateFilter ||
        new Date(log.createdAt).toISOString().slice(0, 10) === activityDateFilter;
      const haystack = `${log.actor} ${log.action} ${log.entityType}`.toLowerCase();
      return matchesEntity && matchesDate && haystack.includes(query.toLowerCase());
    }).slice(0, 50).map((log) => ({
        action: log.action,
        user: log.actor,
        entityType: log.entityType,
        createdAt: log.createdAt,
        time: new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(log.createdAt)),
      }));
  }, [activityDateFilter, activityEntityFilter, catalog.activityLogs, query]);

  const activityEntityOptions = useMemo(
    () => ["All", ...Array.from(new Set(catalog.activityLogs.map((log) => log.entityType))).sort()],
    [catalog.activityLogs],
  );

  // Paginated slices
  const orderTotalPages = Math.max(1, Math.ceil(displayOrders.length / PAGE_SIZE));
  const safeOrderPage = Math.min(orderPage, orderTotalPages);
  const pagedOrders = useMemo(
    () => displayOrders.slice((safeOrderPage - 1) * PAGE_SIZE, safeOrderPage * PAGE_SIZE),
    [displayOrders, safeOrderPage],
  );

  const customerTotalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safeCustomerPage = Math.min(customerPage, customerTotalPages);
  const pagedCustomers = useMemo(
    () => filteredCustomers.slice((safeCustomerPage - 1) * PAGE_SIZE, safeCustomerPage * PAGE_SIZE),
    [filteredCustomers, safeCustomerPage],
  );
  const productTotalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safeProductPage = Math.min(productPage, productTotalPages);
  const pagedProducts = useMemo(
    () => filteredProducts.slice((safeProductPage - 1) * PAGE_SIZE, safeProductPage * PAGE_SIZE),
    [filteredProducts, safeProductPage],
  );
  const mediaTotalPages = Math.max(1, Math.ceil(filteredMediaAssets.length / PAGE_SIZE));
  const safeMediaPage = Math.min(mediaPage, mediaTotalPages);
  const pagedMediaAssets = useMemo(
    () => filteredMediaAssets.slice((safeMediaPage - 1) * PAGE_SIZE, safeMediaPage * PAGE_SIZE),
    [filteredMediaAssets, safeMediaPage],
  );

  // CSV exports
  const exportProducts = () =>
    downloadCsv(
      "velora-products.csv",
      ["ID", "Name", "Category", "Collection", "Price", "Sale Price", "Stock", "Status"],
      filteredProducts.map((p) => [
        p.sku,
        p.name,
        p.category,
        p.collections.map((collection) => collection.name).join("; "),
        String(p.price),
        String(p.salePrice ?? ""),
        String(p.stock),
        productStatuses[p.id] ?? (p.stock < 20 ? "Low stock" : p.status),
      ])
    );

  const exportOrders = () =>
    downloadCsv(
      "velora-orders.csv",
      ["Order", "Customer", "Email", "Phone", "Total", "Status", "Payment", "Shipping", "Notes"],
      displayOrders.map((o) => [
        o.orderNumber,
        o.customerName,
        o.email,
        o.phone ?? "",
        String(o.total),
        o.status,
        o.paymentStatus,
        o.fulfillmentStatus,
        o.internalNote ?? "",
      ])
    );

  const exportCustomers = () => {
    const filters = [
      customerTypeFilter !== "All" ? `type-${customerTypeFilter}` : null,
      customerLifecycleFilter !== "All" ? `lifecycle-${customerLifecycleFilter}` : null,
      customerTagFilter !== "All" ? `tag-${customerTagFilter}` : null,
      query.trim() ? "search" : null,
    ].filter((filter): filter is string => Boolean(filter));
    const filterLabel = filters.length ? filters.join("; ") : "all customers";
    const filename = filters.length
      ? `velora-customers-${filters.join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}.csv`
      : "velora-customers.csv";

    downloadCsv(
      filename,
      ["Name", "Email", "Phone", "Type", "Orders", "Lifetime Value", "Last Order", "Addresses", "Tags", "Notes", "Export Scope"],
      filteredCustomers.map((c) => [
        c.name,
        c.email,
        c.phone ?? "",
        c.type,
        String(c.orderCount),
        String(c.lifetimeValue),
        c.lastOrderAt ?? "",
        c.addresses.join("; "),
        c.tags.join("; "),
        c.notes ?? "",
        filterLabel,
      ])
    );
  };

  const exportAnalytics = () =>
    downloadCsv(
      "velora-analytics-report.csv",
      ["Metric", "Value"],
      [
        ["Weekly revenue", `AED ${analyticsData.summary.weekRevenue.toFixed(2)}`],
        ["30-day revenue", `AED ${analyticsData.summary.monthRevenue.toFixed(2)}`],
        ["Average order value", `AED ${analyticsData.summary.avgOrderValue.toFixed(2)}`],
        ["Best seller", analyticsData.summary.bestSeller],
        ["Returning customers", `${analyticsData.summary.returningPct}%`],
        ["Cart conversion", `${analyticsData.summary.conversionRate.toFixed(1)}%`],
        ["Abandoned carts", String(analyticsData.summary.abandonedCarts)],
        ["Abandoned cart value", `AED ${analyticsData.summary.abandonedValue.toFixed(2)}`],
        ...analyticsData.dailyRevenue.map((day) => [
          `Revenue ${day.date}`,
          `AED ${day.revenue.toFixed(2)} (${day.orders} orders)`,
        ]),
        ...analyticsData.couponPerformance.map((coupon) => [
          `Coupon ${coupon.code}`,
          `${coupon.usageCount} uses · ${coupon.status}`,
        ]),
        ...analyticsData.inventoryRisk.map((row) => [
          `Inventory risk ${row.sku ?? row.productName}`,
          `${row.availableStock} available · ${row.status}`,
        ]),
      ]
    );

  // Drag-to-reorder for homepage sections
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...homepageSections];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setHomepageSections(next.map((section, sortOrder) => ({ ...section, sortOrder })));
    setDragIndex(targetIndex);
  };
  const handleDragEnd = async () => {
    setDragIndex(null);
    try {
      const response = await fetch("/api/admin/homepage-sections/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: homepageSections.map((section) => section.id) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save homepage order");
      showToast("Homepage order saved");
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save homepage order");
    }
  };

  const toggleProductStatus = async (productId: string) => {
    const currentReal: AdminProduct["status"] =
      productStatuses[productId] ??
      catalogProducts.find((p) => p.id === productId)?.status ??
      "Draft";
    const next: AdminProduct["status"] = currentReal === "Published" ? "Draft" : "Published";
    const apiStatus = next === "Published" ? "PUBLISHED" : "DRAFT";

    // Optimistic update
    setProductStatuses((prev) => ({ ...prev, [productId]: next }));

    try {
      const response = await fetch(`/api/admin/products/${productId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: apiStatus }),
      });
      if (!response.ok) {
        const result = await response.json();
        setProductStatuses((prev) => ({ ...prev, [productId]: currentReal }));
        showToast(result.message ?? "Failed to update status");
      } else {
        showToast(`Product set to ${next}`);
        router.refresh();
      }
    } catch {
      setProductStatuses((prev) => ({ ...prev, [productId]: currentReal }));
      showToast("Failed to update status");
    }
  };

  const deleteProduct = (product: AdminProduct) => {
    askConfirm({
      title: `Delete "${product.name}"?`,
      message:
        "This permanently removes the product only if it has no order, cart, wishlist, or review history. Products with history should be archived instead.",
      confirmLabel: "Delete product",
      danger: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result.message ?? "Unable to delete product");
          }

          setCatalogProducts((prev) => prev.filter((item) => item.id !== product.id));
          setProductStatuses((prev) => {
            const next = { ...prev };
            delete next[product.id];
            return next;
          });
          showToast(`Product "${product.name}" deleted`);
          router.refresh();
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Unable to delete product");
        }
      },
    });
  };

  const deleteCoupon = (coupon: AdminCoupon) => {
    askConfirm({
      title: `Delete coupon "${coupon.code}"?`,
      message: "This removes the coupon permanently. Orders that used it are not affected.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.message ?? "Unable to delete coupon");
          }
          setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
          showToast(`Coupon ${coupon.code} deleted`);
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Unable to delete coupon");
        }
      },
    });
  };

  const upsertCategoryRow = (category: AdminCategory) => {
    setCategoryRows((prev) => {
      const exists = prev.some((item) => item.id === category.id);
      const next = exists
        ? prev.map((item) => {
            if (item.id === category.id) return category;
            if (item.parentId === category.id) return { ...item, parentName: category.name };
            return item;
          })
        : [...prev, category];

      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    router.refresh();
  };

  const deleteCategory = (category: AdminCategory) => {
    askConfirm({
      title: `Delete "${category.name}"?`,
      message: `Products assigned to this category will need a new category. This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message ?? "Unable to delete category");
          setCategoryRows((prev) => prev.filter((item) => item.id !== category.id));
          showToast(`Category "${category.name}" deleted`);
          router.refresh();
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Unable to delete category");
        }
      },
    });
  };

  const upsertCollectionRow = (collection: AdminCollection) => {
    setCollectionRows((prev) => {
      const exists = prev.some((item) => item.id === collection.id);
      const next = exists
        ? prev.map((item) => (item.id === collection.id ? collection : item))
        : [...prev, collection];

      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    router.refresh();
  };

  const deleteCollection = (collection: AdminCollection) => {
    askConfirm({
      title: `Delete "${collection.name}"?`,
      message: "Products in this collection won't be deleted — they'll simply be unassigned from it.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/collections/${collection.id}`, { method: "DELETE" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message ?? "Unable to delete collection");
          setCollectionRows((prev) => prev.filter((item) => item.id !== collection.id));
          showToast(`Collection "${collection.name}" deleted`);
          router.refresh();
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Unable to delete collection");
        }
      },
    });
  };

  const upsertHomepageSection = (section: AdminHomepageSection) => {
    setHomepageSections((prev) => {
      const exists = prev.some((item) => item.id === section.id);
      const next = exists ? prev.map((item) => (item.id === section.id ? section : item)) : [...prev, section];
      return next.sort((a, b) => a.sortOrder - b.sortOrder);
    });
    router.refresh();
  };

  const deleteHomepageSection = (section: AdminHomepageSection) => {
    askConfirm({
      title: `Delete "${section.title}"?`,
      message: "This removes the homepage block from the storefront controls. Products and collections are not deleted.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/homepage-sections/${section.id}`, { method: "DELETE" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message ?? "Unable to delete homepage section");
          setHomepageSections((prev) => prev.filter((item) => item.id !== section.id));
          showToast(`Homepage section "${section.title}" deleted`);
          router.refresh();
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Unable to delete homepage section");
        }
      },
    });
  };

  const deleteMediaAsset = (asset: AdminMediaAsset) => {
    askConfirm({
      title: `Delete "${asset.name}"?`,
      message: asset.usageCount > 0
        ? `This asset is used ${asset.usageCount} time${asset.usageCount !== 1 ? "s" : ""}. The API will block deletion until references are removed.`
        : "This removes the asset record and local file from the media library.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/media-assets/${asset.id}`, { method: "DELETE" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message ?? "Unable to delete media asset");
          setMediaAssets((prev) => prev.filter((item) => item.id !== asset.id));
          setEditingMediaAsset(null);
          showToast(`Media asset "${asset.name}" deleted`);
          router.refresh();
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Unable to delete media asset");
        }
      },
    });
  };

  const upsertColorRow = (color: AdminColor) => {
    setColorRows((prev) => {
      const exists = prev.some((item) => item.id === color.id);
      const next = exists ? prev.map((item) => (item.id === color.id ? color : item)) : [...prev, color];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    router.refresh();
  };

  const upsertSizeRow = (size: AdminSize) => {
    setSizeRows((prev) => {
      const exists = prev.some((item) => item.id === size.id);
      const next = exists ? prev.map((item) => (item.id === size.id ? size : item)) : [...prev, size];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    router.refresh();
  };

  const upsertTagRow = (tag: AdminTag) => {
    setTagRows((prev) => {
      const exists = prev.some((item) => item.id === tag.id);
      const next = exists ? prev.map((item) => (item.id === tag.id ? tag : item)) : [...prev, tag];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    router.refresh();
  };

  const deleteColor = (color: AdminColor) => {
    askConfirm({
      title: `Delete color "${color.name}"?`,
      message: color.variantCount > 0
        ? `This color is used by ${color.variantCount} variant${color.variantCount !== 1 ? "s" : ""}. Deleting it may break those products.`
        : "This color has no variants. It will be permanently removed.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/colors/${color.id}`, { method: "DELETE" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message ?? "Unable to delete color");
          setColorRows((prev) => prev.filter((item) => item.id !== color.id));
          showToast(`Color "${color.name}" deleted`);
          router.refresh();
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Unable to delete color");
        }
      },
    });
  };

  const deleteSize = (size: AdminSize) => {
    askConfirm({
      title: `Delete size "${size.name}"?`,
      message: size.variantCount > 0
        ? `This size is used by ${size.variantCount} variant${size.variantCount !== 1 ? "s" : ""}. Deleting it may break those products.`
        : "This size has no variants. It will be permanently removed.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/sizes/${size.id}`, { method: "DELETE" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message ?? "Unable to delete size");
          setSizeRows((prev) => prev.filter((item) => item.id !== size.id));
          showToast(`Size "${size.name}" deleted`);
          router.refresh();
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Unable to delete size");
        }
      },
    });
  };

  const deleteTag = (tag: AdminTag) => {
    askConfirm({
      title: `Delete tag "${tag.name}"?`,
      message: tag.productCount > 0
        ? `This tag is assigned to ${tag.productCount} product${tag.productCount !== 1 ? "s" : ""}. Remove it from products before deleting.`
        : "This tag is not assigned to any products. It will be permanently removed.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/tags/${tag.id}`, { method: "DELETE" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message ?? "Unable to delete tag");
          setTagRows((prev) => prev.filter((item) => item.id !== tag.id));
          showToast(`Tag "${tag.name}" deleted`);
          router.refresh();
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Unable to delete tag");
        }
      },
    });
  };

  const updateInventoryStock = async (
    variantId: string,
    stock: number,
    note?: string,
    settings?: {
      reservedStock?: number;
      lowStockThreshold?: number;
      allowBackorder?: boolean;
      backorderLimit?: number | null;
      backorderShipsAt?: string | null;
      backorderMessage?: string | null;
      reason?: string;
    },
  ) => {
    try {
      const response = await fetch(`/api/admin/inventory/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock, note, ...settings }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message ?? "Unable to update stock");

      setInventoryRowsState((prev) =>
        prev.map((row) => (row.variantId === variantId ? result.inventory : row)),
      );
      showToast("Inventory updated");
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update stock");
    }
  };

  const exportInventory = () =>
    downloadCsv(
      "velora-inventory.csv",
      ["SKU", "Product", "Color", "Size", "Stock", "Reserved", "Available", "Low Stock Threshold", "Allow Backorder", "Status"],
      filteredInventoryRows.map((row) => [
        row.sku ?? "",
        row.productName,
        row.colorName,
        row.sizeName,
        String(row.stock),
        String(row.reservedStock),
        String(row.availableStock),
        String(row.lowStockThreshold),
        row.allowBackorder ? "true" : "false",
        row.status,
      ]),
    );

  const importInventory = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) throw new Error("Inventory CSV has no data rows");
      const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
      const indexOf = (name: string) => headers.indexOf(name.toLowerCase());
      const skuIndex = indexOf("sku");
      const stockIndex = indexOf("stock");
      const thresholdIndex = indexOf("low stock threshold");
      const backorderIndex = indexOf("allow backorder");
      if (skuIndex < 0 || stockIndex < 0) throw new Error("CSV must contain SKU and Stock columns");

      const rows = lines.slice(1).map((line) => {
        const cells = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
        return {
          sku: cells[skuIndex],
          stock: Number(cells[stockIndex]),
          lowStockThreshold: thresholdIndex >= 0 ? Number(cells[thresholdIndex]) : 5,
          allowBackorder: backorderIndex >= 0 && cells[backorderIndex].toLowerCase() === "true",
          reason: "CSV_IMPORT",
        };
      }).filter((row) => row.sku && Number.isInteger(row.stock) && row.stock >= 0);

      const response = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Inventory import failed");
      showToast(`Updated ${result.updated} variants${result.missingSkus.length ? `; ${result.missingSkus.length} SKUs not found` : ""}`);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Inventory import failed");
    }
  };

  const updateReviewStatus = async (id: string, status: AdminReview["status"]) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to update review");
      setReviewRows((current) => current.map((review) => review.id === id ? { ...review, status: result.review.status, updatedAt: result.review.updatedAt } : review));
      showToast(`Review ${status.toLowerCase()}`);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update review");
    }
  };

  const deleteReview = (review: AdminReview) => askConfirm({
    title: "Delete review?",
    message: `This permanently deletes “${review.title}” from ${review.productName}.`,
    confirmLabel: "Delete review",
    danger: true,
    onConfirm: async () => {
      const response = await fetch(`/api/admin/reviews/${review.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to delete review");
      setReviewRows((current) => current.filter((item) => item.id !== review.id));
      showToast("Review deleted");
      router.refresh();
    },
  });

  const orderStatuses = [
    "All",
    "PENDING",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ];
  const selectedInventoryRow = inventoryLogVariantId
    ? inventoryRowsState.find((row) => row.variantId === inventoryLogVariantId)
    : null;

  return (
    <div
      className="flex w-full"
      style={{ minHeight: "100vh" }}
    >
      <h1 className="sr-only">
        Velora admin {sections.find(([key]) => key === active)?.[1] ?? "Overview"}
      </h1>
      {/* Overlays */}
      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
      {mutationCount > 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-5 top-5 z-[80] inline-flex items-center gap-2 border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] shadow-xl"
        >
          <Loader2 className="size-4 animate-spin text-[var(--accent)]" />
          Saving changes
        </div>
      ) : null}
      {alertsOpen ? <LiveAlertsPanel alerts={liveAlerts} onClose={() => setAlertsOpen(false)} /> : null}
      {confirmPending ? (
        <ConfirmModal {...confirmPending} onClose={() => setConfirmPending(null)} />
      ) : null}
      {addProductOpen ? (
        <AddProductModal
          categories={categoryRows}
          collections={collectionRows}
          tags={tagRows}
          mediaAssets={mediaAssets}
          onClose={() => setAddProductOpen(false)}
          onCreated={(product) => {
            setCatalogProducts((prev) => [product, ...prev]);
            setProductStatuses((prev) => ({ ...prev, [product.id]: product.status }));
          }}
          onSuccess={(msg) => showToast(msg)}
        />
      ) : null}
      {editingCollection ? (
        <CollectionEditorModal
          collection={editingCollection === "new" ? undefined : editingCollection}
          products={catalogProducts}
          mediaAssets={mediaAssets}
          onClose={() => setEditingCollection(null)}
          onSaved={(collection) => {
            upsertCollectionRow(collection);
            showToast(`Collection "${collection.name}" saved`);
          }}
        />
      ) : null}
      {editingCategory ? (
        <CategoryEditorModal
          category={editingCategory === "new" ? undefined : editingCategory}
          categories={categoryRows}
          onClose={() => setEditingCategory(null)}
          onSaved={(category) => {
            upsertCategoryRow(category);
            showToast(`Category "${category.name}" saved`);
          }}
        />
      ) : null}
      {editingColor ? (
        <ColorEditorModal
          color={editingColor === "new" ? undefined : editingColor}
          onClose={() => setEditingColor(null)}
          onSaved={(color) => {
            upsertColorRow(color);
            showToast(`Color "${color.name}" saved`);
          }}
        />
      ) : null}
      {editingSize ? (
        <SizeEditorModal
          size={editingSize === "new" ? undefined : editingSize}
          onClose={() => setEditingSize(null)}
          onSaved={(size) => {
            upsertSizeRow(size);
            showToast(`Size "${size.name}" saved`);
          }}
        />
      ) : null}
      {editingTag ? (
        <TagEditorModal
          tag={editingTag === "new" ? undefined : editingTag}
          onClose={() => setEditingTag(null)}
          onSaved={(tag) => {
            upsertTagRow(tag);
            showToast(`Tag "${tag.name}" saved`);
          }}
        />
      ) : null}
      {reviewOrderId ? (
        <OrderReviewPanel
          order={orderRows.find((order) => order.id === reviewOrderId) ?? orderRows[0]}
          activityLogs={activityLogs}
          onClose={() => setReviewOrderId(null)}
          onAction={(msg) => showToast(msg)}
          onSaved={(order) => {
            setOrderRows((prev) => prev.map((row) => (row.id === order.id ? order : row)));
            router.refresh();
          }}
        />
      ) : null}
      {viewReturnId && returnRows.find((request) => request.id === viewReturnId) ? (
        <ReturnRequestPanel
          request={returnRows.find((request) => request.id === viewReturnId)!}
          onClose={() => setViewReturnId(null)}
          onUpdated={(updated) => {
            setReturnRows((current) => current.map((request) => request.id === updated.id ? updated : request));
            setViewReturnId(null);
            showToast(`Return request moved to ${updated.status.toLowerCase().replaceAll("_", " ")}`);
            router.refresh();
          }}
        />
      ) : null}
      {bulkUploadOpen ? (
        <BulkUploadModal
          onClose={() => setBulkUploadOpen(false)}
          onSuccess={(msg) => showToast(msg)}
          onProductsAdded={(products) =>
            setCatalogProducts((prev) => [...products, ...prev])
          }
        />
      ) : null}
      {scheduleOpen ? (
        <SchedulePublishModal
          products={filteredProducts}
          onClose={() => setScheduleOpen(false)}
          onSuccess={(msg) => showToast(msg)}
          onScheduled={(productIds) => {
            setProductStatuses((prev) => ({
              ...prev,
              ...Object.fromEntries(productIds.map((id) => [id, "Scheduled" as AdminProduct["status"]])),
            }));
          }}
        />
      ) : null}
      {addCouponOpen ? (
        <AddCouponModal
          coupon={editingCoupon ?? undefined}
          onClose={() => {
            setAddCouponOpen(false);
            setEditingCoupon(null);
          }}
          onAdd={(coupon) => {
            setCoupons((prev) => {
              const exists = prev.some((item) => item.id === coupon.id);
              return exists ? prev.map((item) => item.id === coupon.id ? coupon : item) : [coupon, ...prev];
            });
            showToast(`Coupon ${coupon.code} saved`);
          }}
        />
      ) : null}
      {issueGiftCardOpen ? (
        <IssueGiftCardModal
          onClose={() => setIssueGiftCardOpen(false)}
          onIssued={(giftCard, code) => {
            setGiftCards((prev) => [giftCard, ...prev]);
            showToast(`Gift card issued: ${code}`);
          }}
        />
      ) : null}
      {editingAdminUser ? (
        <AdminUserModal
          user={editingAdminUser === "new" ? undefined : editingAdminUser}
          onClose={() => setEditingAdminUser(null)}
          onSaved={(user) => {
            setAdminUsers((prev) => {
              const exists = prev.some((item) => item.id === user.id);
              return exists
                ? prev.map((item) => (item.id === user.id ? user : item))
                : [user, ...prev];
            });
            showToast(`Admin user ${user.email} saved`);
            router.refresh();
          }}
        />
      ) : null}
      {editingHomepageSection ? (
        <HomepageSectionModal
          section={editingHomepageSection === "new" ? undefined : editingHomepageSection}
          products={catalogProducts}
          collections={collectionRows}
          mediaAssets={mediaAssets}
          onClose={() => setEditingHomepageSection(null)}
          onSaved={(section) => {
            upsertHomepageSection(section);
            showToast(`Homepage section "${section.title}" saved`);
          }}
        />
      ) : null}
      {editingMediaAsset ? (
        <MediaAssetModal
          asset={editingMediaAsset}
          onClose={() => setEditingMediaAsset(null)}
          onSaved={(asset) => {
            setMediaAssets((prev) => prev.map((item) => (item.id === asset.id ? asset : item)));
            showToast(`Media asset "${asset.name}" saved`);
            router.refresh();
          }}
          onDelete={deleteMediaAsset}
        />
      ) : null}
      {selectedInventoryRow ? (
        <InventoryLogPanel
          row={selectedInventoryRow}
          onClose={() => setInventoryLogVariantId(null)}
        />
      ) : null}
      {viewCustomer ? (
        <CustomerProfilePanel
          customer={viewCustomer}
          customers={customerRows}
          onClose={() => setViewCustomer(null)}
          onSaved={handleCustomerUpdated}
          onMerged={handleCustomerMerged}
        />
      ) : null}
      {generateDescOpen ? (
        <GenerateDescModal onClose={() => setGenerateDescOpen(false)} />
      ) : null}

      {/* ── Dark sidebar ──────────────────────────────────── */}
      <aside
        className={`sticky top-0 self-start flex shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 ${
          sidebarCollapsed ? "w-14" : "w-[210px]"
        }`}
        style={{ height: "100vh" }}
      >
        {/* Sidebar header */}
        <div
          className={`flex h-11 shrink-0 items-center border-b border-[var(--border)] ${
            sidebarCollapsed ? "justify-center" : "justify-between px-4"
          }`}
        >
          {!sidebarCollapsed && (
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--muted)]">
              Velora Admin
            </span>
          )}
          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="grid size-7 place-items-center rounded text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronLeft className="size-3.5" />
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-1.5">
          {visibleSections.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => navigateSection(key)}
              title={sidebarCollapsed ? label : undefined}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                active === key
                  ? "bg-[var(--hover)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {label}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        {!sidebarCollapsed && (
          <div className="border-t border-[var(--border)] px-4 py-3">
            <p className="text-[9px] text-[var(--muted)]">
              {access.role.replace(/_/g, " ")} · v2.1
            </p>
          </div>
        )}
      </aside>

      {/* ── Main area ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex h-11 shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            {sections.find(([key]) => key === active)?.[1] ?? "Overview"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div
              className="relative"
              onBlur={() => window.setTimeout(() => setServerSearchOpen(false), 120)}
            >
              <div className="flex h-8 items-center gap-2 border border-[var(--border)] bg-[var(--card)] px-3">
                {serverSearchLoading ? (
                  <Loader2 className="size-3 animate-spin text-[var(--muted)]" />
                ) : (
                  <Search className="size-3 text-[var(--muted)]" />
                )}
                <input
                  value={query}
                  aria-label="Search admin records"
                  onFocus={() => setServerSearchOpen(true)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setQuery(value);
                    setServerSearchOpen(true);
                    if (value.trim().length < 2) {
                      setServerSearchResults([]);
                      setServerSearchLoading(false);
                    }
                    setOrderPage(1);
                    setCustomerPage(1);
                    setProductPage(1);
                    setMediaPage(1);
                  }}
                  placeholder="Search…"
                  className="h-full w-36 bg-transparent text-xs outline-none placeholder:text-[var(--muted)]"
                />
              </div>
              {serverSearchOpen && query.trim().length >= 2 ? (
                <div className="absolute right-0 top-10 z-40 max-h-96 w-96 overflow-y-auto border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                  <div className="border-b border-[var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Server search
                  </div>
                  {serverSearchResults.length ? (
                    serverSearchResults.map((result) => (
                      <button
                        key={`${result.section}-${result.id}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setServerSearchOpen(false);
                          if (result.href) {
                            router.push(result.href);
                            return;
                          }
                          navigateSection(result.section);
                          setQuery(result.title);
                        }}
                        className="flex w-full items-start justify-between gap-4 border-b border-[var(--border)] px-3 py-3 text-left last:border-0 hover:bg-[var(--hover)]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{result.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{result.subtitle}</span>
                        </span>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
                          {result.section}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                      {serverSearchLoading ? "Searching..." : "No matching records."}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
            <button
              onClick={() => setAlertsOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 bg-[var(--accent)] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#17262D]"
            >
              <Bell className="size-3" />
              Alerts
              {alertCount > 0 ? (
                <span className="grid h-4 min-w-4 place-items-center bg-[#991b1b] px-1 text-[10px] font-bold text-white">
                  {alertCount > 99 ? "99+" : alertCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Overview ──────────────────────────────── */}
          {active === "overview" ? (
            <OverviewDashboard
              orders={orderRows}
              customers={customerRows}
              products={catalogProducts}
              inventory={inventoryRowsState}
              cartAnalytics={catalog.cartAnalytics}
              activityLogs={catalog.activityLogs}
              adminName={access.name}
              onNavigate={(section) => navigateSection(section)}
            />
          ) : null}

          {/* ── Products ──────────────────────────────── */}
          {active === "products" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {(
                  [
                    [
                      "Add product",
                      Plus,
                      () => setAddProductOpen(true),
                    ],
                    [
                      "Bulk upload CSV",
                      Upload,
                      () => setBulkUploadOpen(true),
                    ],
                    [
                      "Draft / Publish all",
                      null,
                      () => {
                        const allDraft = filteredProducts.every(
                          (p) => (productStatuses[p.id] ?? p.status) !== "Published"
                        );
                        const nextStatus: AdminProduct["status"] = allDraft ? "Published" : "Draft";
                        const apiStatus = allDraft ? "PUBLISHED" : "DRAFT";
                        const count = filteredProducts.length;
                        askConfirm({
                          title: `${nextStatus === "Published" ? "Publish" : "Unpublish"} ${count} product${count !== 1 ? "s" : ""}?`,
                          message: `This will set all ${count} filtered product${count !== 1 ? "s" : ""} to "${nextStatus}" and affects the live storefront immediately.`,
                          confirmLabel: nextStatus === "Published" ? "Publish all" : "Draft all",
                          danger: nextStatus === "Draft",
                          onConfirm: async () => {
                            const next: Record<string, AdminProduct["status"]> = {};
                            filteredProducts.forEach((p) => (next[p.id] = nextStatus));
                            setProductStatuses((prev) => ({ ...prev, ...next }));
                            showToast(`Updating ${count} products…`);
                            const results = await Promise.allSettled(
                              filteredProducts.map((p) =>
                                fetch(`/api/admin/products/${p.id}/status`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: apiStatus }),
                                })
                              )
                            );
                            const failed = results.filter((r) => r.status === "rejected").length;
                            showToast(
                              failed
                                ? `${count - failed} updated, ${failed} failed`
                                : `All ${count} products set to ${nextStatus}`
                            );
                            router.refresh();
                          },
                        });
                      },
                    ],
                    [
                      "Schedule publishing",
                      null,
                      () => setScheduleOpen(true),
                    ],
                  ] as [string, typeof Plus | null, () => void][]
                ).map(([label, Icon, handler]) => (
                  <button
                    key={label}
                    onClick={handler}
                    className="flex items-center gap-2 border border-[var(--border)] bg-[var(--surface)] p-4 text-left text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--hover)]"
                  >
                    {Icon ? <Icon className="size-3.5" /> : null}
                    {label}
                  </button>
                ))}
              </div>
              <Panel
                title="Product catalog"
                action={
                  <button
                    onClick={exportProducts}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <FileDown className="size-3.5" />
                    Export CSV
                  </button>
                }
              >
                <AdminTable
                  headers={["Product", "SKU", "Price", "Variants", "Stock", "Status", ""]}
                  onRowClick={(index) => router.push(`/admin/products/${pagedProducts[index].id}`)}
                  rows={pagedProducts.map((p) => {
                    const status =
                      productStatuses[p.id] ??
                      (p.stock < 20 ? "Low stock" : p.status);
                    const isDraft = status === "Draft";
                    return [
                      <span key="n" className="font-medium">
                        {p.name}
                        <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
                          {p.category} · {p.collections.map((item) => item.name).join(", ") || "No collection"}
                        </span>
                        {status === "Scheduled" && p.scheduledAt ? (
                          <span className="mt-1 block text-xs font-normal text-blue-500">
                            Publishes {formatAdminDate(p.scheduledAt)}
                          </span>
                        ) : null}
                      </span>,
                      <span key="s" className="font-mono text-xs text-[var(--muted)]">
                        {p.sku}
                      </span>,
                      <span key="pr" className="text-sm">
                        {p.salePrice ? (
                          <>
                            <span className="font-semibold text-red-500">AED {p.salePrice}</span>
                            <span className="ml-1 text-xs line-through text-[var(--muted)]">AED {p.price}</span>
                          </>
                        ) : (
                          `AED ${p.price}`
                        )}
                      </span>,
                      `${p.variants.length} variants · ${p.colors.length} colors`,
                      <span
                        key="st"
                        className={p.stock < 20 ? "font-semibold text-red-500" : ""}
                      >
                        {p.stock}
                      </span>,
                      <StatusPill key="pill" label={status} />,
                      <span key="actions" className="inline-flex items-center gap-3">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/admin/products/${p.id}/preview`);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] underline"
                        >
                          <Eye className="size-3.5" />
                          Preview
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleProductStatus(p.id);
                          }}
                          className="text-xs font-semibold uppercase tracking-[0.1em] underline"
                        >
                          {isDraft ? "Publish" : "Set draft"}
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteProduct(p);
                          }}
                          className="text-xs font-semibold uppercase tracking-[0.1em] text-red-500 underline"
                        >
                          Delete
                        </button>
                      </span>,
                    ];
                  })}
                />
                <PaginationBar
                  page={safeProductPage}
                  totalPages={productTotalPages}
                  totalItems={filteredProducts.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setProductPage}
                />
              </Panel>
            </>
          ) : null}

          {/* ── Reviews ───────────────────────────────── */}
          {active === "reviews" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
                  <section key={status} className="border border-[var(--border)] bg-[var(--surface)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{status.toLowerCase()}</p>
                    <p className="mt-3 text-3xl font-semibold">{reviewRows.filter((review) => review.status === status).length}</p>
                  </section>
                ))}
              </div>
              {moderatingReviewId && reviewRows.find((review) => review.id === moderatingReviewId) ? (() => {
                const review = reviewRows.find((item) => item.id === moderatingReviewId)!;
                return (
                  <Panel title={`Moderate — ${review.title}`} action={<button type="button" onClick={() => setModeratingReviewId(null)} aria-label="Close moderation"><X className="size-4" /></button>}>
                    <form className="space-y-5" onSubmit={async (event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      const response = await fetch(`/api/admin/reviews/${review.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          status: form.get("status"),
                          adminResponse: form.get("adminResponse"),
                          media: review.media.map((media) => ({
                            id: media.id,
                            status: form.get(`media:${media.id}`),
                            altText: form.get(`alt:${media.id}`),
                          })),
                          reports: review.reports.map((report) => ({ id: report.id, status: form.get(`report:${report.id}`) })),
                        }),
                      });
                      const result = await response.json();
                      if (!response.ok) return showToast(result.message ?? "Unable to save moderation");
                      setReviewRows((current) => current.map((item) => item.id === review.id ? {
                        ...item,
                        status: result.review.status,
                        adminResponse: result.review.adminResponse ?? undefined,
                        respondedAt: result.review.respondedAt ?? undefined,
                        updatedAt: result.review.updatedAt,
                        media: item.media.map((media) => {
                          const updated = result.review.media.find((candidate: { id: string; status: string; altText?: string }) => candidate.id === media.id);
                          return updated ? { ...media, status: updated.status, altText: updated.altText ?? undefined } : media;
                        }),
                        reports: item.reports.map((report) => {
                          const updated = result.review.reports.find((candidate: { id: string; status: string }) => candidate.id === report.id);
                          return updated ? { ...report, status: updated.status } : report;
                        }),
                        events: result.review.events.map((audit: { id: string; action: string; actor: string; message?: string; createdAt: string }) => ({ ...audit, createdAt: String(audit.createdAt) })),
                      } : item));
                      showToast("Review moderation saved");
                    }}>
                      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                        <FieldLabel label="Review status">
                          <select name="status" defaultValue={review.status} className={inputCls}>
                            <option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
                          </select>
                        </FieldLabel>
                        <FieldLabel label="Public response">
                          <textarea name="adminResponse" rows={3} maxLength={1000} defaultValue={review.adminResponse ?? ""} className={`${inputCls} h-auto py-3`} placeholder="Optional response shown below the approved review" />
                        </FieldLabel>
                      </div>
                      {review.media.length ? (
                        <div>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em]">Customer media</p>
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {review.media.map((media) => (
                              <div key={media.id} className="border border-[var(--border)] p-3">
                                <div className="relative aspect-square overflow-hidden bg-[var(--card)]"><Image src={media.url} alt={media.altText ?? media.originalName} fill sizes="280px" className="object-cover" /></div>
                                <select name={`media:${media.id}`} defaultValue={media.status} className={`${inputCls} mt-3`}><option value="PENDING">Pending</option><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select>
                                <input name={`alt:${media.id}`} defaultValue={media.altText ?? ""} className={`${inputCls} mt-2`} placeholder="Public alt text" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {review.reports.length ? (
                        <div>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em]">Abuse reports</p>
                          <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                            {review.reports.map((report) => (
                              <div key={report.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_180px] sm:items-center">
                                <div><p className="text-sm font-medium">{report.reason.replaceAll("_", " ")}</p><p className="text-xs text-[var(--muted)]">{report.reporterEmail}{report.details ? ` · ${report.details}` : ""}</p></div>
                                <select name={`report:${report.id}`} defaultValue={report.status} className={inputCls}><option value="OPEN">Open</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option></select>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="flex justify-end"><button type="submit" className="h-11 bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#17262D]">Save moderation</button></div>
                    </form>
                  </Panel>
                );
              })() : null}
              <Panel title={`Product reviews — ${reviewRows.length}`}>
                <AdminTable
                  headers={["Review", "Product", "Customer", "Rating", "Status", "Actions"]}
                  rows={reviewRows.map((review) => [
                    <span key="review" className="block min-w-64 max-w-xl">
                      <span className="block font-semibold">{review.title}</span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[var(--muted)]">{review.body}</span>
                      <span className="mt-1 block text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">{formatAdminDate(review.createdAt)}</span>
                    </span>,
                    <span key="product"><span className="block font-medium">{review.productName}</span><span className="text-xs text-[var(--muted)]">/{review.productSlug}</span></span>,
                    <span key="customer"><span className="block">{review.customerName}</span><span className="text-xs text-[var(--muted)]">{review.customerEmail ?? "Deleted account"}</span>{review.verifiedPurchase ? <span className="mt-1 block text-[10px] font-semibold uppercase text-emerald-600">Verified purchase</span> : null}</span>,
                    <span key="rating" className="inline-flex items-center gap-1"><Star className="size-3.5 fill-current" /> {review.rating}/5</span>,
                    <StatusPill key="status" label={review.status === "PENDING" ? "Pending" : review.status === "APPROVED" ? "Approved" : "Rejected"} />,
                    <span key="actions" className="flex flex-wrap gap-3">
                      <button onClick={() => setModeratingReviewId(review.id)} className="text-xs font-semibold uppercase underline">Moderate</button>
                      {review.status !== "APPROVED" ? <button onClick={() => void updateReviewStatus(review.id, "APPROVED")} className="text-xs font-semibold uppercase underline">Approve</button> : null}
                      {review.status !== "REJECTED" ? <button onClick={() => void updateReviewStatus(review.id, "REJECTED")} className="text-xs font-semibold uppercase underline">Reject</button> : null}
                      {review.status !== "PENDING" ? <button onClick={() => void updateReviewStatus(review.id, "PENDING")} className="text-xs font-semibold uppercase underline">Reopen</button> : null}
                      <button onClick={() => deleteReview(review)} className="text-xs font-semibold uppercase text-red-500 underline">Delete</button>
                    </span>,
                  ])}
                />
              </Panel>
            </>
          ) : null}

          {/* ── Categories ───────────────────────────── */}
          {active === "categories" ? (
            <Panel
              title={`Category management — ${filteredCategories.length} categories`}
              action={
                <button
                  onClick={() => setEditingCategory("new")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                >
                  <Plus className="size-3.5" />
                  Add category
                </button>
              }
            >
              <AdminTable
                headers={["Category", "Slug", "Parent", "Products", "Children", "Actions"]}
                rows={filteredCategories.map((category) => [
                  <span key="name" className="font-medium">
                    {category.name}
                  </span>,
                  <span key="slug" className="font-mono text-xs text-[var(--muted)]">
                    {category.slug}
                  </span>,
                  category.parentName ?? <span key="none" className="text-[var(--muted)]">None</span>,
                  <span key="products" className={category.productCount ? "font-semibold" : "text-[var(--muted)]"}>
                    {category.productCount}
                  </span>,
                  <span key="children" className={category.childCount ? "font-semibold" : "text-[var(--muted)]"}>
                    {category.childCount}
                  </span>,
                  <span key="actions" className="inline-flex items-center gap-3">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="text-xs font-semibold uppercase tracking-[0.1em] underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCategory(category)}
                      className="text-[var(--muted)] transition hover:text-red-500"
                      title={
                        category.productCount || category.childCount
                          ? "Move products and children before deleting"
                          : "Delete category"
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>,
                ])}
              />
              {filteredCategories.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium">No categories found.</p>
                  <button
                    onClick={() => setEditingCategory("new")}
                    className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] underline"
                  >
                    Create the first category
                  </button>
                </div>
              ) : null}
            </Panel>
          ) : null}

          {/* ── Collections ──────────────────────────── */}
          {active === "collections" ? (
            <Panel
              title={`Collection management — ${filteredCollections.length} collections`}
              action={
                <button
                  onClick={() => setEditingCollection("new")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                >
                  <Plus className="size-3.5" />
                  Add collection
                </button>
              }
            >
              <AdminTable
                headers={["Collection", "Slug", "Status", "Banner", "Products", "SEO", "Actions"]}
                rows={filteredCollections.map((collection) => [
                  <span key="name" className="font-medium">
                    {collection.name}
                    <span className="mt-1 line-clamp-1 block max-w-md text-xs font-normal text-[var(--muted)]">
                      {collection.summary}
                    </span>
                  </span>,
                  <span key="slug" className="font-mono text-xs text-[var(--muted)]">
                    {collection.slug}
                  </span>,
                  <span key="status" className="text-xs text-[var(--muted)]">
                    {collection.status === "SCHEDULED" && collection.scheduledAt
                      ? `Scheduled · ${formatAdminDate(collection.scheduledAt)}`
                      : collection.status === "PUBLISHED"
                      ? "Published"
                      : "Draft"}
                  </span>,
                  collection.bannerImage ? (
                    <span key="banner" className="inline-flex items-center gap-2 text-xs">
                      <span className="relative block size-10 overflow-hidden border border-[var(--border)] bg-[var(--card)]">
                        <Image src={collection.bannerImage} alt={collection.name} fill sizes="40px" className="object-cover" />
                      </span>
                      Uploaded
                    </span>
                  ) : (
                    <span key="banner-missing" className="text-xs text-[var(--muted)]">Missing</span>
                  ),
                  <span key="products" className={collection.productCount ? "font-semibold" : "text-[var(--muted)]"}>
                    {collection.productCount}
                  </span>,
                  <span key="seo" className={collection.seoTitle && collection.seoDescription ? "text-emerald-600" : "text-[var(--muted)]"}>
                    {collection.seoTitle && collection.seoDescription ? "Ready" : "Missing"}
                  </span>,
                  <span key="actions" className="inline-flex items-center gap-3">
                    <button
                      onClick={() => setEditingCollection(collection)}
                      className="text-xs font-semibold uppercase tracking-[0.1em] underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCollection(collection)}
                      className="text-[var(--muted)] transition hover:text-red-500"
                      title={collection.productCount ? "Remove products before deleting" : "Delete collection"}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>,
                ])}
              />
              {filteredCollections.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium">No collections found.</p>
                  <button
                    onClick={() => setEditingCollection("new")}
                    className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] underline"
                  >
                    Create the first collection
                  </button>
                </div>
              ) : null}
            </Panel>
          ) : null}

          {/* ── Attributes ───────────────────────────── */}
          {active === "attributes" ? (
            <div className="grid gap-6 xl:grid-cols-3">
              <Panel
                title={`Colors — ${filteredColors.length}`}
                action={
                  <button
                    onClick={() => setEditingColor("new")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <Plus className="size-3.5" />
                    Add color
                  </button>
                }
              >
                <AdminTable
                  headers={["Color", "Hex", "Usage", "Actions"]}
                  rows={filteredColors.map((color) => [
                    <span key="name" className="inline-flex items-center gap-3 font-medium">
                      <span className="size-7 border border-[var(--border)]" style={{ backgroundColor: color.hex }} />
                      {color.name}
                    </span>,
                    <span key="hex" className="font-mono text-xs text-[var(--muted)]">{color.hex}</span>,
                    <span key="usage" className={color.variantCount ? "font-semibold" : "text-[var(--muted)]"}>
                      {color.variantCount} variants
                    </span>,
                    <span key="actions" className="inline-flex items-center gap-3">
                      <button
                        onClick={() => setEditingColor(color)}
                        className="text-xs font-semibold uppercase tracking-[0.1em] underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteColor(color)}
                        className="text-[var(--muted)] transition hover:text-red-500"
                        title={color.variantCount ? "Color is used by variants" : "Delete color"}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>,
                  ])}
                />
              </Panel>

              <Panel
                title={`Sizes — ${filteredSizes.length}`}
                action={
                  <button
                    onClick={() => setEditingSize("new")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <Ruler className="size-3.5" />
                    Add size
                  </button>
                }
              >
                <AdminTable
                  headers={["Size", "Usage", "Actions"]}
                  rows={filteredSizes.map((size) => [
                    <span key="name" className="font-semibold">{size.name}</span>,
                    <span key="usage" className={size.variantCount ? "font-semibold" : "text-[var(--muted)]"}>
                      {size.variantCount} variants
                    </span>,
                    <span key="actions" className="inline-flex items-center gap-3">
                      <button
                        onClick={() => setEditingSize(size)}
                        className="text-xs font-semibold uppercase tracking-[0.1em] underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSize(size)}
                        className="text-[var(--muted)] transition hover:text-red-500"
                        title={size.variantCount ? "Size is used by variants" : "Delete size"}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>,
                  ])}
                />
              </Panel>

              <Panel
                title={`Tags — ${filteredTags.length}`}
                action={
                  <button
                    onClick={() => setEditingTag("new")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <Plus className="size-3.5" />
                    Add tag
                  </button>
                }
              >
                <AdminTable
                  headers={["Tag", "Usage", "Actions"]}
                  rows={filteredTags.map((tag) => [
                    <span key="name" className="font-semibold">{tag.name}</span>,
                    <span key="usage" className={tag.productCount ? "font-semibold" : "text-[var(--muted)]"}>
                      {tag.productCount} products
                    </span>,
                    <span key="actions" className="inline-flex items-center gap-3">
                      <button
                        onClick={() => setEditingTag(tag)}
                        className="text-xs font-semibold uppercase tracking-[0.1em] underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTag(tag)}
                        className="text-[var(--muted)] transition hover:text-red-500"
                        title={tag.productCount ? "Tag is assigned to products" : "Delete tag"}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>,
                  ])}
                />
              </Panel>
            </div>
          ) : null}

          {/* ── Orders ────────────────────────────────── */}
          {active === "orders" ? (
            <Panel
              title={`Order dashboard — ${displayOrders.length} order${displayOrders.length !== 1 ? "s" : ""}`}
              action={
                <button
                  onClick={exportOrders}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                >
                  <FileDown className="size-3.5" />
                  Export CSV
                </button>
              }
            >
              {/* Status filter tabs */}
              <div className="mb-4 flex flex-wrap gap-2">
                {orderStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => setOrderFilter(s)}
                    className={`h-8 border px-3 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                      orderFilter === s
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[#17262D]"
                        : "border-[var(--border)] hover:bg-[var(--hover)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Date range filter */}
              <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--muted)]">From</label>
                  <input
                    aria-label="Order date from"
                    type="date"
                    value={orderDateFrom}
                    max={orderDateTo || undefined}
                    onChange={(e) => setOrderDateFrom(e.target.value)}
                    className="h-8 border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--muted)]">To</label>
                  <input
                    aria-label="Order date to"
                    type="date"
                    value={orderDateTo}
                    min={orderDateFrom || undefined}
                    onChange={(e) => setOrderDateTo(e.target.value)}
                    className="h-8 border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--muted)]">Tags</label>
                  <select
                    aria-label="Order tag filter"
                    value={orderTagFilter}
                    onChange={(e) => setOrderTagFilter(e.target.value)}
                    className="h-8 border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none focus:border-[var(--accent)]"
                  >
                    {orderTagOptions.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
                {(orderDateFrom || orderDateTo) ? (
                  <button
                    onClick={() => { setOrderDateFrom(""); setOrderDateTo(""); }}
                    className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)] underline"
                  >
                    Clear dates
                  </button>
                ) : null}
              </div>
              {selectedOrderIds.length ? (
                <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold">{selectedOrderIds.length} order{selectedOrderIds.length === 1 ? "" : "s"} selected</p>
                    <button
                      type="button"
                      onClick={() => setSelectedOrderIds([])}
                      className="text-xs uppercase tracking-[0.1em] text-[var(--muted)] underline"
                    >
                      Clear selection
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <label className="block text-[var(--muted)] text-xs">
                      Status
                      <select
                        value={bulkStatus}
                        onChange={(e) => setBulkStatus(e.target.value)}
                        className="mt-1 h-9 w-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs outline-none focus:border-[var(--accent)]"
                      >
                        {[
                          "PENDING",
                          "PAID",
                          "PROCESSING",
                          "SHIPPED",
                          "DELIVERED",
                          "CANCELLED",
                          "REFUNDED",
                        ].map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[var(--muted)] text-xs">
                      Payment
                      <select
                        value={bulkPaymentStatus}
                        onChange={(e) => setBulkPaymentStatus(e.target.value)}
                        className="mt-1 h-9 w-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs outline-none focus:border-[var(--accent)]"
                      >
                        {["pending", "paid", "refunded", "partial_refund", "failed"].map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[var(--muted)] text-xs">
                      Fulfillment
                      <select
                        value={bulkFulfillmentStatus}
                        onChange={(e) => setBulkFulfillmentStatus(e.target.value)}
                        className="mt-1 h-9 w-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs outline-none focus:border-[var(--accent)]"
                      >
                        {["unfulfilled", "processing", "fulfilled", "shipped", "delivered", "returned", "cancelled"].map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedOrderIds.length) return;
                        setBulkUpdating(true);
                        setBulkFeedback(null);
                        try {
                          const response = await fetch("/api/admin/orders", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              ids: selectedOrderIds,
                              status: bulkStatus,
                              paymentStatus: bulkPaymentStatus,
                              fulfillmentStatus: bulkFulfillmentStatus,
                            }),
                          });
                          const result = await response.json();
                          if (!response.ok) throw new Error(result.message ?? "Bulk update failed");
                          setOrderRows((prev) =>
                            prev.map((order) =>
                              selectedOrderIds.includes(order.id)
                                ? {
                                    ...order,
                                    status: bulkStatus,
                                    paymentStatus: bulkPaymentStatus,
                                    fulfillmentStatus: bulkFulfillmentStatus,
                                  }
                                : order,
                            ),
                          );
                          setSelectedOrderIds([]);
                          setBulkFeedback(`Updated ${result.count} orders successfully.`);
                        } catch (error) {
                          setBulkFeedback(error instanceof Error ? error.message : "Bulk update failed");
                        } finally {
                          setBulkUpdating(false);
                        }
                      }}
                      disabled={bulkUpdating}
                      className="mt-6 h-9 rounded-xl bg-[var(--accent)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#17262D] disabled:opacity-50"
                    >
                      {bulkUpdating ? "Updating..." : "Apply bulk update"}
                    </button>
                  </div>
                  {bulkFeedback ? (
                    <p className="mt-3 text-xs text-[var(--muted)]">{bulkFeedback}</p>
                  ) : null}
                </div>
              ) : null}
              <AdminTable
                headers={[
                  "Select",
                  "Order",
                  "Customer",
                  "Tags",
                  "Phone",
                  "Total",
                  "Refund",
                  "Status",
                  "Payment",
                  "Action",
                ]}
                rows={pagedOrders.map((order) => [
                  <span key="id" className="font-mono font-semibold">
                    {order.orderNumber}
                  </span>,
                  <span key="c">
                    {order.customerName}
                    <span className="block text-xs text-[var(--muted)]">
                      {order.email}
                    </span>
                  </span>,
                  <span key="tags" className="flex flex-wrap gap-1">
                    {order.orderTags.length ? (
                      order.orderTags.map((tag) => (
                        <span key={tag} className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--muted)]">No tags</span>
                    )}
                  </span>,
                  order.phone ?? "—",
                  <span key="t" className="font-medium">
                    AED {order.total}
                  </span>,
                  <span key="refund" className="font-medium text-[var(--muted)]">
                    {order.refundAmount != null ? `AED ${order.refundAmount.toFixed(2)}` : "—"}
                  </span>,
                  <StatusPill key="s" label={order.status} />,
                  <StatusPill key="p" label={order.paymentStatus} />,
                  <button
                    key="action"
                    onClick={() => setReviewOrderId(order.id)}
                    className="text-xs font-semibold uppercase tracking-[0.1em] underline"
                  >
                    Review
                  </button>,
                ])}
              />
              {displayOrders.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--muted)]">
                  No orders match this filter.
                </p>
              ) : null}
              {displayOrders.length > PAGE_SIZE ? (
                <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs">
                  <span className="text-[var(--muted)]">
                    Showing {(safeOrderPage - 1) * PAGE_SIZE + 1}–{Math.min(safeOrderPage * PAGE_SIZE, displayOrders.length)} of {displayOrders.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                      disabled={safeOrderPage === 1}
                      className="h-8 border border-[var(--border)] px-3 font-semibold uppercase tracking-[0.1em] disabled:opacity-40 hover:bg-[var(--hover)]"
                    >
                      ← Prev
                    </button>
                    <span className="grid h-8 place-items-center px-3 font-semibold">
                      {safeOrderPage} / {orderTotalPages}
                    </span>
                    <button
                      onClick={() => setOrderPage((p) => Math.min(orderTotalPages, p + 1))}
                      disabled={safeOrderPage === orderTotalPages}
                      className="h-8 border border-[var(--border)] px-3 font-semibold uppercase tracking-[0.1em] disabled:opacity-40 hover:bg-[var(--hover)]"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              ) : null}
            </Panel>
          ) : null}

          {/* ── Returns & exchanges ─────────────────── */}
          {active === "returns" ? (
            <>
              <Panel title="Return policy and eligibility">
                <form onSubmit={saveReturnSettings} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["returnsEnabled", "Online requests", "Allow customers to start return requests.", returnSettings.returnsEnabled],
                      ["exchangesEnabled", "Exchanges", "Allow replacement-size requests.", returnSettings.exchangesEnabled],
                      ["refundsEnabled", "Refund reviews", "Allow refund review as a resolution.", returnSettings.refundsEnabled],
                      ["requireDeliveredOrder", "Require delivery", "Block new requests until delivery completes.", returnSettings.requireDeliveredOrder],
                      ["allowDefectClaimsOutsideWindow", "Late defect claims", "Review damaged, wrong, or missing items after the standard window.", returnSettings.allowDefectClaimsOutsideWindow],
                      ["requireOriginalTags", "Original tags", "Show original-tag requirement to customers.", returnSettings.requireOriginalTags],
                    ].map(([name, label, description, checked]) => (
                      <label key={String(name)} className="flex items-start justify-between gap-3 border border-[var(--border)] bg-[var(--card)] p-3">
                        <span><span className="block text-sm font-semibold">{String(label)}</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{String(description)}</span></span>
                        <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="mt-1 size-4 accent-[var(--accent)]" />
                      </label>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <FieldLabel label="Return window (days)">
                      <input name="returnWindowDays" type="number" min={1} max={90} defaultValue={returnSettings.returnWindowDays} className={inputCls} />
                    </FieldLabel>
                    <FieldLabel label="Customer policy summary">
                      <textarea name="policySummary" rows={5} defaultValue={returnSettings.policySummary} className={`${inputCls} h-auto py-3`} />
                    </FieldLabel>
                    <button type="submit" disabled={savingReturnSettings} className="h-11 w-full bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#17262D] disabled:opacity-50">
                      {savingReturnSettings ? "Saving..." : "Save return policy"}
                    </button>
                  </div>
                </form>
              </Panel>

              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ["Open", returnRows.filter((request) => !["COMPLETED", "REJECTED", "CANCELLED"].includes(request.status)).length],
                  ["Pending review", returnRows.filter((request) => request.status === "PENDING").length],
                  ["In transit", returnRows.filter((request) => ["PICKUP_SCHEDULED", "PICKED_UP"].includes(request.status)).length],
                  ["Closed", returnRows.filter((request) => ["COMPLETED", "REJECTED", "CANCELLED"].includes(request.status)).length],
                ].map(([label, value]) => (
                  <section key={label} className="border border-[var(--border)] bg-[var(--surface)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                    <p className="mt-3 text-3xl font-semibold">{value}</p>
                  </section>
                ))}
              </div>

              <Panel title={`Returns and exchanges — ${filteredReturns.length} requests`}>
                <div className="mb-5 flex flex-wrap gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Status
                    <select value={returnStatusFilter} onChange={(event) => setReturnStatusFilter(event.target.value)} className="ml-2 h-9 border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--foreground)] outline-none">
                      {['All', 'PENDING', 'AWAITING_CUSTOMER', 'APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED', 'INSPECTED', 'REFUND_PROCESSING', 'REPLACEMENT_CREATED', 'COMPLETED', 'REJECTED', 'CANCELLED'].map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Resolution
                    <select value={returnResolutionFilter} onChange={(event) => setReturnResolutionFilter(event.target.value)} className="ml-2 h-9 border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--foreground)] outline-none">
                      {['All', 'RETURN', 'EXCHANGE', 'REFUND'].map((resolution) => <option key={resolution} value={resolution}>{resolution}</option>)}
                    </select>
                  </label>
                </div>
                <AdminTable
                  headers={["Request", "Customer", "Resolution", "Items", "Status", "Submitted", "Action"]}
                  emptyMessage="No return requests match these filters."
                  rows={filteredReturns.map((request) => [
                    <span key="request"><span className="block font-mono font-semibold">{request.orderNumber}</span><span className="mt-1 block text-xs text-[var(--muted)]">{request.reason}</span></span>,
                    <span key="customer"><span className="block font-medium">{request.customerName}</span><span className="text-xs text-[var(--muted)]">{request.email}</span></span>,
                    <span key="resolution" className="font-semibold">{request.resolution}</span>,
                    <span key="items"><span className="block font-medium">{request.items.length} line{request.items.length === 1 ? "" : "s"}</span><span className="text-xs text-[var(--muted)]">{request.items.reduce((sum, item) => sum + item.quantity, 0)} units</span></span>,
                    <StatusPill key="status" label={request.status} />,
                    <span key="created" className="text-xs text-[var(--muted)]">{formatAdminDate(request.createdAt)}</span>,
                    <button key="action" type="button" onClick={() => setViewReturnId(request.id)} className="text-xs font-semibold uppercase tracking-[0.1em] underline">Review</button>,
                  ])}
                />
              </Panel>
            </>
          ) : null}

          {/* ── Customers ─────────────────────────────── */}
          {active === "customers" ? (
            <Panel
              title={`Customer management — ${filteredCustomers.length} customers`}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Type
                  </label>
                  <select
                    value={customerTypeFilter}
                    onChange={(event) => {
                      setCustomerTypeFilter(event.target.value);
                      setCustomerPage(1);
                    }}
                    className="h-9 rounded border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none focus:border-[var(--accent)]"
                  >
                    {["All", "Account", "Guest"].map((segment) => (
                      <option key={segment} value={segment}>
                        {segment}
                      </option>
                    ))}
                  </select>
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Lifecycle
                  </label>
                  <select
                    value={customerLifecycleFilter}
                    onChange={(event) => {
                      setCustomerLifecycleFilter(event.target.value);
                      setCustomerPage(1);
                    }}
                    className="h-9 rounded border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none focus:border-[var(--accent)]"
                  >
                    {["All", "VIP", "Returning", "New", "Active", "At risk", "Has notes"].map((segment) => (
                      <option key={segment} value={segment}>
                        {segment}
                      </option>
                    ))}
                  </select>
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Tag
                  </label>
                  <select
                    value={customerTagFilter}
                    onChange={(event) => {
                      setCustomerTagFilter(event.target.value);
                      setCustomerPage(1);
                    }}
                    className="h-9 rounded border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none focus:border-[var(--accent)]"
                  >
                    {customerTagOptions.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={exportCustomers}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <FileDown className="size-3.5" />
                    Export filtered CSV
                  </button>
                  {customerTypeFilter !== "All" || customerLifecycleFilter !== "All" || customerTagFilter !== "All" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerTypeFilter("All");
                        setCustomerLifecycleFilter("All");
                        setCustomerTagFilter("All");
                        setCustomerPage(1);
                      }}
                      className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)] underline"
                    >
                      Reset filters
                    </button>
                  ) : null}
                </div>
              }
            >
              <div className="mb-5 grid gap-3 md:grid-cols-4">
                {[
                  ["Total customers", customerRows.length],
                  ["Accounts", customerRows.filter((customer) => customer.type === "Account").length],
                  ["VIP", customerRows.filter((customer) => customer.lifetimeValue >= 1000).length],
                  ["At risk", customerRows.filter((customer) =>
                    customer.tags.some((tag) => tag.toLowerCase().includes("risk"))
                  ).length],
                ].map(([label, value]) => (
                  <div key={label} className="border border-[var(--border)] bg-[var(--card)] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <AdminTable
                headers={[
                  "Customer",
                  "Type",
                  "Orders",
                  "LTV",
                  "Last order",
                  "Phone",
                  "Tags",
                  "",
                ]}
                rows={pagedCustomers.map((c) => [
                  <div key="n">
                    <button
                      onClick={() => setViewCustomer(c)}
                      className="text-left font-medium underline"
                    >
                      {c.name}
                    </button>
                    <p className="text-xs text-[var(--muted)]">{c.email}</p>
                  </div>,
                  <StatusPill key="ty" label={c.type} />,
                  <span key="o" className="font-semibold">
                    {c.orderCount}
                  </span>,
                  <span key="l" className="font-medium">
                    {formatAdminMoney(c.lifetimeValue)}
                  </span>,
                  <span key="d" className="text-[var(--muted)]">
                    {formatAdminDate(c.lastOrderAt)}
                  </span>,
                  <span key="ph" className="text-[var(--muted)]">
                    {c.phone ?? "—"}
                  </span>,
                  <span key="t" className="inline-flex flex-wrap gap-1">
                    {c.tags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>,
                  <button
                    key="p"
                    onClick={() => setViewCustomer(c)}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] underline"
                  >
                    <UserCheck className="size-3.5" />
                    View
                  </button>,
                ])}
              />
              {filteredCustomers.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--muted)]">
                  No customers match this search.
                </p>
              ) : null}
              {filteredCustomers.length > PAGE_SIZE ? (
                <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs">
                  <span className="text-[var(--muted)]">
                    Showing {(safeCustomerPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCustomerPage * PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                      disabled={safeCustomerPage === 1}
                      className="h-8 border border-[var(--border)] px-3 font-semibold uppercase tracking-[0.1em] disabled:opacity-40 hover:bg-[var(--hover)]"
                    >
                      ← Prev
                    </button>
                    <span className="grid h-8 place-items-center px-3 font-semibold">
                      {safeCustomerPage} / {customerTotalPages}
                    </span>
                    <button
                      onClick={() => setCustomerPage((p) => Math.min(customerTotalPages, p + 1))}
                      disabled={safeCustomerPage === customerTotalPages}
                      className="h-8 border border-[var(--border)] px-3 font-semibold uppercase tracking-[0.1em] disabled:opacity-40 hover:bg-[var(--hover)]"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              ) : null}
            </Panel>
          ) : null}

          {/* ── Marketing ─────────────────────────────── */}
          {active === "marketing" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel
                title="Discount & coupon system"
                action={
                  <button
                    onClick={() => setAddCouponOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <Plus className="size-3.5" />
                    Add coupon
                  </button>
                }
              >
                <AdminTable
                  headers={["Code", "Type", "Value", "Minimum", "Expiry", "Usage", ""]}
                  rows={coupons.map((coupon) => {
                    const typeLabel =
                      coupon.type === "PERCENTAGE"
                        ? "Percentage"
                        : coupon.type === "FIXED"
                        ? "Fixed"
                        : "Free shipping";
                    const valueDisplay =
                      coupon.type === "PERCENTAGE"
                        ? `${coupon.value}%`
                        : coupon.type === "FIXED"
                        ? `AED ${coupon.value}`
                        : "—";
                    const expiryDisplay = coupon.expiresAt
                      ? new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(
                          new Date(coupon.expiresAt),
                        )
                      : "No expiry";
                    const usageDisplay = coupon.usageLimit
                      ? `${coupon.usageCount} / ${coupon.usageLimit}`
                      : `${coupon.usageCount} / ∞`;

                    return [
                      <span key="c" className="font-mono font-semibold">
                        {coupon.code}
                      </span>,
                      typeLabel,
                      valueDisplay,
                      coupon.minimumAmount ? `AED ${coupon.minimumAmount}` : "None",
                      expiryDisplay,
                      usageDisplay,
                      <span key="actions" className="inline-flex items-center gap-3">
                        <button
                          onClick={() => {
                            setEditingCoupon(coupon);
                            setAddCouponOpen(true);
                          }}
                          className="text-xs font-semibold uppercase underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCoupon(coupon)}
                          className="text-[var(--muted)] transition hover:text-red-500"
                          title="Delete coupon"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>,
                    ];
                  })}
                />
              </Panel>
              <Panel
                title={`Gift cards — ${giftCards.length}`}
                action={
                  <button
                    onClick={() => setIssueGiftCardOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <Plus className="size-3.5" />
                    Issue gift card
                  </button>
                }
              >
                <AdminTable
                  headers={["Card", "Balance", "Recipient", "Expiry", "Recent ledger"]}
                  rows={giftCards.map((card) => [
                    <div key="card">
                      <p className="font-mono font-semibold">•••• {card.codeLast4}</p>
                      <p className="text-xs text-[var(--muted)]">{card.status}</p>
                    </div>,
                    <div key="bal">
                      <p className="font-semibold">{formatAdminMoney(card.balance)}</p>
                      <p className="text-xs text-[var(--muted)]">Issued {formatAdminMoney(card.initialBalance)}</p>
                    </div>,
                    <span key="rec" className="text-xs text-[var(--muted)]">
                      {card.recipientEmail ?? "Not assigned"}
                    </span>,
                    card.expiresAt ? formatAdminDate(card.expiresAt) : "No expiry",
                    <div key="ledger" className="space-y-1 text-xs text-[var(--muted)]">
                      {card.ledgerEntries.slice(0, 2).map((entry) => (
                        <p key={entry.id}>
                          {entry.type.toLowerCase()} {formatAdminMoney(entry.amount)}
                          {entry.orderNumber ? ` · ${entry.orderNumber}` : ""}
                        </p>
                      ))}
                      {card.ledgerEntries.length === 0 ? "No ledger entries" : null}
                    </div>,
                  ])}
                />
                {giftCards.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--muted)]">No gift cards have been issued.</p>
                ) : null}
              </Panel>
              <Panel
                title={`Newsletter subscribers — ${catalog.newsletterSubscribers.length}`}
                action={
                  <button
                    onClick={() =>
                      downloadCsv(
                        "velora-newsletter-subscribers.csv",
                        ["Email", "Locale", "Source", "Status", "Subscribed"],
                        catalog.newsletterSubscribers.map((subscriber) => [
                          subscriber.email,
                          subscriber.locale,
                          subscriber.source,
                          subscriber.status,
                          subscriber.subscribedAt,
                        ]),
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <FileDown className="size-3.5" />
                    Export CSV
                  </button>
                }
              >
                {catalog.newsletterSubscribers.length ? (
                  <AdminTable
                    headers={["Email", "Locale", "Source", "Status", "Subscribed"]}
                    rows={catalog.newsletterSubscribers.map((subscriber) => [
                      subscriber.email,
                      subscriber.locale.toUpperCase(),
                      subscriber.source,
                      <StatusPill key="status" label={subscriber.status} />,
                      formatAdminDate(subscriber.subscribedAt),
                    ])}
                  />
                ) : (
                  <p className="text-sm text-[var(--muted)]">No newsletter subscribers yet.</p>
                )}
              </Panel>
              <Panel
                title={`Homepage sections — ${homepageSections.length}`}
                action={
                  <button
                    onClick={() => setEditingHomepageSection("new")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <Plus className="size-3.5" />
                    Add section
                  </button>
                }
              >
                <p className="mb-4 text-xs text-[var(--muted)]">
                  Drag rows to persist storefront order. Edit a row to control text, images, products, CTA, collection, and visibility.
                </p>
                <div className="grid gap-2">
                  {homepageSections.map((section, index) => (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`grid cursor-grab gap-3 border border-[var(--border)] bg-[var(--card)] p-3 transition active:cursor-grabbing sm:grid-cols-[auto_1fr_auto] sm:items-center ${
                        dragIndex === index ? "opacity-40" : "hover:bg-[var(--hover)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="size-4 shrink-0 text-[var(--muted)]" />
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{section.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {homepageSectionTypeLabels[section.type]} · {section.status === "PUBLISHED" ? "Published" : section.status === "SCHEDULED" ? "Scheduled" : "Draft preview"} · {section.enabled ? "Enabled" : "Hidden"}
                          {section.status === "SCHEDULED" && section.scheduledAt ? ` · Publishes ${formatAdminDate(section.scheduledAt)}` : ""}
                          {section.collectionName ? ` · ${section.collectionName}` : ""}
                          {section.productCount ? ` · ${section.productCount} products` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingHomepageSection(section)}
                          className="text-xs font-bold uppercase tracking-[0.12em] underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteHomepageSection(section)}
                          className="text-[var(--muted)] transition hover:text-red-500"
                          title="Delete section"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {homepageSections.length === 0 ? (
                    <div className="border border-dashed border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[var(--muted)]">
                      No homepage sections yet. Add a section to start controlling the storefront homepage from admin.
                    </div>
                  ) : null}
                </div>
              </Panel>
            </div>
          ) : null}

          {/* ── Inventory ─────────────────────────────── */}
          {active === "inventory" ? (
            <Panel
              title={`Inventory management — ${filteredInventoryRows.length} variants`}
              action={
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--muted)]">
                    {filteredInventoryRows.filter((row) => row.status !== "In stock").length} alerts
                  </span>
                  <select
                    value={inventoryAdjustmentReason}
                    onChange={(event) => setInventoryAdjustmentReason(event.target.value)}
                    aria-label="Inventory adjustment reason"
                    className="h-8 border border-[var(--border)] bg-[var(--card)] px-2 text-xs"
                  >
                    {[
                      ["MANUAL_ADJUSTMENT", "Manual adjustment"],
                      ["STOCK_RECEIVED", "Stock received"],
                      ["CUSTOMER_RETURN", "Customer return"],
                      ["DAMAGE_OR_LOSS", "Damage / loss"],
                      ["CYCLE_COUNT", "Cycle count"],
                    ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <input
                    ref={inventoryImportRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (file) void importInventory(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => inventoryImportRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <Upload className="size-3.5" />
                    Import CSV
                  </button>
                  <button
                    type="button"
                    onClick={exportInventory}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <FileDown className="size-3.5" />
                    Export CSV
                  </button>
                </div>
              }
            >
              <div className="mb-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  ["Total units", inventoryRowsState.reduce((sum, row) => sum + row.stock, 0)],
                  ["Low stock", inventoryRowsState.filter((row) => row.status === "Low stock").length],
                  ["Out of stock", inventoryRowsState.filter((row) => row.status === "Out of stock").length],
                  ["Reserved units", catalog.cartReservationSummary.reservedUnits],
                  ["Active carts", catalog.cartReservationSummary.activeCarts + catalog.cartReservationSummary.checkoutCarts],
                  ["Expiring soon", catalog.cartReservationSummary.expiringSoonCarts],
                ].map(([label, value]) => (
                  <div key={label} className="border border-[var(--border)] bg-[var(--card)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              {catalog.cartReservationSummary.oldestExpiresAt ? (
                <p className="mb-5 text-xs text-[var(--muted)]">
                  Oldest active reservation expires {new Date(catalog.cartReservationSummary.oldestExpiresAt).toLocaleString()}.
                  {catalog.cartReservationSummary.expiringSoonUnits
                    ? ` ${catalog.cartReservationSummary.expiringSoonUnits} units expire within 10 minutes.`
                    : " No reserved units expire within 10 minutes."}
                </p>
              ) : null}
              {catalog.inventoryAnomalies.length ? (
                <div className="mb-5 border border-red-500/40 bg-red-500/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-500">
                    Inventory anomalies
                  </p>
                  <div className="mt-3 grid gap-2">
                    {catalog.inventoryAnomalies.slice(0, 6).map((anomaly) => (
                      <div key={`${anomaly.variantId}-${anomaly.message}`} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <span>
                          <span className="font-semibold">{anomaly.productName}</span>{" "}
                          <span className="text-[var(--muted)]">{anomaly.variantLabel}</span>
                          <span className="block text-xs text-[var(--muted)]">
                            {anomaly.sku ?? "No SKU"} · {anomaly.message}
                          </span>
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.1em]">
                          Reserved {anomaly.reservedStock} / Capacity {anomaly.sellableCapacity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <AdminTable
                headers={["SKU", "Product", "Variant", "Stock", "Reserved", "Available", "Threshold", "Backorder", "Status", "Action"]}
                rows={filteredInventoryRows.map((row) => [
                  <span key="sku" className="font-mono text-xs text-[var(--muted)]">
                    {row.sku ?? "No SKU"}
                  </span>,
                  <span key="product" className="font-medium">
                    {row.productName}
                    <span className="block text-xs text-[var(--muted)]">/{row.productSlug}</span>
                  </span>,
                  <span key="variant" className="inline-flex items-center gap-2">
                    <span className="size-5 border border-[var(--border)]" style={{ backgroundColor: row.colorHex }} />
                    {row.colorName} / {row.sizeName}
                  </span>,
                  <input
                    key="stock"
                    type="number"
                    min="0"
                    defaultValue={row.stock}
                    onBlur={(event) => {
                      const next = Number(event.currentTarget.value);
                      if (Number.isInteger(next) && next >= 0 && next !== row.stock) {
                        updateInventoryStock(row.variantId, next, "Manual stock correction", { reason: inventoryAdjustmentReason });
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                    className="h-9 w-24 border border-[var(--border)] bg-[var(--card)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                  />,
                  <input
                    key="reserved"
                    type="number"
                    min="0"
                    defaultValue={row.reservedStock}
                    onBlur={(event) => {
                      const next = Number(event.currentTarget.value);
                      if (Number.isInteger(next) && next >= 0 && next !== row.reservedStock) {
                        updateInventoryStock(row.variantId, row.stock, "Reserved stock updated", {
                          reservedStock: next,
                          reason: "RESERVATION_ADJUSTMENT",
                        });
                      }
                    }}
                    className="h-9 w-20 border border-[var(--border)] bg-[var(--card)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                  />,
                  <span key="available" className="font-semibold">{row.availableStock}</span>,
                  <input
                    key="threshold"
                    type="number"
                    min="0"
                    defaultValue={row.lowStockThreshold}
                    onBlur={(event) => {
                      const next = Number(event.currentTarget.value);
                      if (Number.isInteger(next) && next >= 0 && next !== row.lowStockThreshold) {
                        updateInventoryStock(row.variantId, row.stock, "Low-stock threshold updated", {
                          lowStockThreshold: next,
                          reason: "SETTINGS_CHANGE",
                        });
                      }
                    }}
                    className="h-9 w-20 border border-[var(--border)] bg-[var(--card)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                  />,
                  <div key="backorder" className="grid min-w-52 gap-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
                      <input
                        type="checkbox"
                        checked={row.allowBackorder}
                        onChange={(event) =>
                          updateInventoryStock(row.variantId, row.stock, "Backorder setting updated", {
                            allowBackorder: event.currentTarget.checked,
                            reason: "SETTINGS_CHANGE",
                          })
                        }
                        className="size-4 accent-[var(--accent)]"
                      />
                      Allow
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Limit"
                        defaultValue={row.backorderLimit ?? ""}
                        onBlur={(event) => {
                          const value = event.currentTarget.value.trim();
                          const next = value === "" ? null : Number(value);
                          if (next === null || (Number.isInteger(next) && next >= 0)) {
                            updateInventoryStock(row.variantId, row.stock, "Backorder limit updated", {
                              backorderLimit: next,
                              reason: "SETTINGS_CHANGE",
                            });
                          }
                        }}
                        className="h-8 border border-[var(--border)] bg-[var(--card)] px-2 text-xs outline-none focus:border-[var(--accent)]"
                      />
                      <input
                        type="date"
                        defaultValue={row.backorderShipsAt ? row.backorderShipsAt.slice(0, 10) : ""}
                        onBlur={(event) => {
                          const value = event.currentTarget.value;
                          updateInventoryStock(row.variantId, row.stock, "Backorder ship date updated", {
                            backorderShipsAt: value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null,
                            reason: "SETTINGS_CHANGE",
                          });
                        }}
                        className="h-8 border border-[var(--border)] bg-[var(--card)] px-2 text-xs outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Customer message"
                      defaultValue={row.backorderMessage ?? ""}
                      onBlur={(event) =>
                        updateInventoryStock(row.variantId, row.stock, "Backorder message updated", {
                          backorderMessage: event.currentTarget.value.trim() || null,
                          reason: "SETTINGS_CHANGE",
                        })
                      }
                      className="h-8 border border-[var(--border)] bg-[var(--card)] px-2 text-xs outline-none focus:border-[var(--accent)]"
                    />
                  </div>,
                  <StatusPill key="status" label={row.status} />,
                  <span key="actions" className="inline-flex items-center gap-3">
                    <button
                      onClick={() => updateInventoryStock(row.variantId, row.stock + 1, "Quick increment", { reason: inventoryAdjustmentReason })}
                      className="text-xs font-semibold uppercase tracking-[0.1em] underline"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => row.stock > 0 ? updateInventoryStock(row.variantId, row.stock - 1, "Quick decrement", { reason: inventoryAdjustmentReason }) : undefined}
                      className="text-xs font-semibold uppercase tracking-[0.1em] underline disabled:opacity-40"
                      disabled={row.stock <= 0}
                    >
                      -1
                    </button>
                    <button
                      onClick={() => setInventoryLogVariantId(row.variantId)}
                      className="text-xs font-semibold uppercase tracking-[0.1em] underline"
                    >
                      Log
                    </button>
                  </span>,
                ])}
              />
            </Panel>
          ) : null}

          {/* ── Analytics ─────────────────────────────── */}
          {active === "analytics" ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {analyticsData.weekLabel}
                </p>
                <button
                  onClick={exportAnalytics}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                >
                  <FileDown className="size-3.5" />
                  Export report
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {analyticsData.cards.map(([label, value, detail, tone]) => (
                  <div
                    key={label}
                    className="border border-[var(--border)] bg-[var(--surface)] p-5"
                  >
                    <p className="text-xs text-[var(--muted)]">{label}</p>
                    <p className="mt-3 text-2xl font-semibold">{value}</p>
                    <p
                      className={`mt-1 text-xs ${
                        tone === "down"
                          ? "text-red-500"
                          : tone === "warn"
                          ? "text-amber-500"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid gap-6 xl:grid-cols-3">
                <Panel title="Revenue by day">
                  <AdminTable
                    headers={["Date", "Orders", "Revenue"]}
                    rows={analyticsData.dailyRevenue.map((day) => [
                      day.date,
                      String(day.orders),
                      formatAdminMoney(day.revenue),
                    ])}
                  />
                </Panel>
                <Panel title="Coupon performance">
                  {analyticsData.couponPerformance.length ? (
                    <AdminTable
                      headers={["Code", "Uses", "Status"]}
                      rows={analyticsData.couponPerformance.map((coupon) => [
                        <span key="code" className="font-mono font-semibold">{coupon.code}</span>,
                        String(coupon.usageCount),
                        <StatusPill key="status" label={coupon.status} />,
                      ])}
                    />
                  ) : (
                    <p className="text-sm text-[var(--muted)]">No coupons have been created.</p>
                  )}
                </Panel>
                <Panel title="Inventory risk">
                  {analyticsData.inventoryRisk.length ? (
                    <AdminTable
                      headers={["SKU", "Variant", "Available"]}
                      rows={analyticsData.inventoryRisk.map((row) => [
                        row.sku ?? "No SKU",
                        `${row.productName} · ${row.colorName}/${row.sizeName}`,
                        <span key="available" className="font-semibold text-red-500">{row.availableStock}</span>,
                      ])}
                    />
                  ) : (
                    <p className="text-sm text-[var(--muted)]">No inventory risk detected.</p>
                  )}
                </Panel>
              </div>
              <Panel title={`Recent abandoned carts — ${catalog.cartAnalytics.recentAbandoned.length}`}>
                <AdminTable
                  headers={["Customer", "Items", "Value", "Last activity", "Status"]}
                  emptyMessage="No abandoned carts have been detected."
                  rows={catalog.cartAnalytics.recentAbandoned.map((cart) => [
                    cart.email ?? "Guest shopper",
                    String(cart.itemCount),
                    formatAdminMoney(cart.value),
                    new Date(cart.updatedAt).toLocaleString(),
                    <StatusPill key="status" label={cart.status} />,
                  ])}
                />
              </Panel>
              <div className="grid gap-6 xl:grid-cols-3">
                <Panel title="Event diagnostics">
                  <AdminTable
                    headers={["Signal", "Last 30 days"]}
                    rows={[
                      ["Searches", String(catalog.eventDiagnostics.searchEvents)],
                      ["Zero-result searches", String(catalog.eventDiagnostics.zeroResultSearches)],
                      ["Search clicks", String(catalog.eventDiagnostics.searchClicks)],
                      ["Search conversions", String(catalog.eventDiagnostics.searchConversions)],
                      ["Search revenue", formatAdminMoney(catalog.eventDiagnostics.searchConversionValue)],
                      ["Filter events", String(catalog.eventDiagnostics.filterEvents)],
                      ["Recommendation events", String(catalog.eventDiagnostics.recommendationEvents)],
                    ]}
                  />
                </Panel>
                <Panel title="Top searches">
                  <AdminTable
                    headers={["Query", "Searches", "CTR", "Conv.", "Revenue"]}
                    emptyMessage="No search events recorded."
                    rows={catalog.eventDiagnostics.topSearches.map((row) => [
                      row.query,
                      String(row.count),
                      `${row.clickThroughRate.toFixed(1)}%`,
                      `${row.conversions} · ${row.conversionRate.toFixed(1)}%`,
                      formatAdminMoney(row.conversionValue),
                    ])}
                  />
                </Panel>
                <Panel title="Zero-result searches">
                  <AdminTable
                    headers={["Query", "Count"]}
                    emptyMessage="No zero-result searches recorded."
                    rows={catalog.eventDiagnostics.zeroResultQueries.map((row) => [
                      row.query,
                      String(row.count),
                    ])}
                  />
                </Panel>
              </div>
              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <Panel title="Top filters">
                  <AdminTable
                    headers={["Filter", "Uses", "Avg results"]}
                    emptyMessage="No filter events recorded."
                    rows={catalog.eventDiagnostics.topFilters.map((row) => [
                      `${row.filterKey}: ${row.value}`,
                      String(row.count),
                      row.avgResultCount.toFixed(1),
                    ])}
                  />
                </Panel>
              </div>
              <Panel title="Recommendation diagnostics">
                <AdminTable
                  headers={["Event", "Count"]}
                  emptyMessage="No recommendation events recorded."
                  rows={catalog.eventDiagnostics.recommendationSummary.map((row) => [
                    row.eventType.replaceAll("_", " ").toLowerCase(),
                    String(row.count),
                  ])}
                />
              </Panel>
            </>
          ) : null}

          {/* ── Security ──────────────────────────────── */}
          {active === "security" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel
                title={`Admin users — ${adminUsers.length}`}
                action={
                  canWriteSecurity ? (
                    <button
                      onClick={() => setEditingAdminUser("new")}
                      className="inline-flex items-center gap-2 bg-[var(--accent)] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#17262D]"
                    >
                      <Plus className="size-3.5" />
                      Add admin user
                    </button>
                  ) : null
                }
              >
                <div className="mb-4 grid gap-3 border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                    <div>
                      <p className="text-sm font-semibold">{access.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {access.email} · {adminRoleLabels[access.role as AdminUser["role"]] ?? access.role}
                      </p>
                    </div>
                  </div>
                  {access.isDevelopmentFallback ? (
                    <p className="text-xs text-[var(--muted)]">
                      Development fallback is active because no admin session is signed in.
                    </p>
                  ) : null}
                </div>

                {adminUsers.length > 0 ? (
                  <AdminTable
                    headers={["User", "Role", "Created", "Updated", "Action"]}
                    rows={adminUsers.map((user) => [
                      <span key="user" className="font-medium">
                        {user.name}
                        <span className="block text-xs text-[var(--muted)]">{user.email}</span>
                      </span>,
                      <span key="role" className="text-sm">
                        {adminRoleLabels[user.role]}
                        {user.adminRoleName ? (
                          <span className="block text-xs text-[var(--muted)]">{user.adminRoleName}</span>
                        ) : null}
                      </span>,
                      <span key="created" className="text-xs text-[var(--muted)]">
                        {formatAdminDate(user.createdAt)}
                      </span>,
                      <span key="updated" className="text-xs text-[var(--muted)]">
                        {formatAdminDate(user.updatedAt)}
                      </span>,
                      canWriteSecurity ? (
                        <button
                          key="edit"
                          onClick={() => setEditingAdminUser(user)}
                          className="text-xs font-bold uppercase tracking-[0.12em] underline"
                        >
                          Edit
                        </button>
                      ) : (
                        <span key="locked" className="text-xs text-[var(--muted)]">
                          Locked
                        </span>
                      ),
                    ])}
                  />
                ) : (
                  <p className="text-sm text-[var(--muted)]">No admin users found.</p>
                )}

                <div className="mt-5 grid gap-2">
                  {[
                    ["Super admin", "Full access to every admin section, settings, exports, and role changes."],
                    ["Manager", "Catalog, orders, customers, inventory, analytics, media, and marketing operations."],
                    ["Support", "Order handling, payment status, shipping status, refunds, and customer notes."],
                    ["Content editor", "Products, categories, collections, banners, homepage content, and media."],
                  ].map(([role, detail]) => (
                    <div
                      key={role}
                      className="border border-[var(--border)] bg-[var(--card)] p-3"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.12em]">{role}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel
                title="Activity log"
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={activityEntityFilter}
                      onChange={(event) => setActivityEntityFilter(event.target.value)}
                      className="h-9 border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold uppercase tracking-[0.1em] outline-none"
                    >
                      {activityEntityOptions.map((entity) => (
                        <option key={entity} value={entity}>
                          {entity}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={activityDateFilter}
                      onChange={(event) => setActivityDateFilter(event.target.value)}
                      className="h-9 border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold uppercase tracking-[0.1em] outline-none"
                    />
                    {(activityEntityFilter !== "All" || activityDateFilter) ? (
                      <button
                        onClick={() => {
                          setActivityEntityFilter("All");
                          setActivityDateFilter("");
                        }}
                        className="text-xs font-semibold uppercase tracking-[0.1em] underline"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                }
              >
                <div className="grid gap-3">
                  {activityLogEntries.length > 0 ? (
                    activityLogEntries.map((log, i) => (
                      <div
                        key={`${log.user}-${log.createdAt}-${i}`}
                        className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"
                      >
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {log.user} · {log.time}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted)]">No activity recorded yet.</p>
                  )}
                </div>
              </Panel>
            </div>
          ) : null}

          {/* ── Media ─────────────────────────────────── */}
          {active === "media" ? (
            <Panel
              title={`Media library — ${filteredMediaAssets.length} assets`}
              action={
                <>
                  <input
                    ref={mediaUploadRef}
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    multiple
                    className="hidden"
                    onChange={async (event) => {
                      const input = event.currentTarget;
                      const files = Array.from(input.files ?? []);
                      if (!files.length) return;
                      try {
                        const body = new FormData();
                        files.forEach((file) => body.append("files", file));
                        const response = await fetch("/api/admin/uploads", { method: "POST", body });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message ?? "Unable to upload media");
                        const uploaded = (result.files ?? []).map((file: {
                          id: string;
                          name: string;
                          originalName: string;
                          url: string;
                          originalUrl?: string;
                          type: string;
                          mediaType: "IMAGE" | "VIDEO";
                          sizeBytes: number;
                          width?: number;
                          height?: number;
                          aspectRatio?: number;
                          optimizedFormat?: string;
                          responsiveWidths?: number[];
                          derivativeManifest?: Array<{ width: number; url: string; format?: string }>;
                          optimizationNotes?: string;
                          focalPointX?: number;
                          focalPointY?: number;
                          createdAt: string;
                        }): AdminMediaAsset => ({
                          id: file.id,
                          name: file.name,
                          originalName: file.originalName,
                          url: file.url,
                          originalUrl: file.originalUrl,
                          mimeType: file.type,
                          mediaType: file.mediaType,
                          sizeBytes: file.sizeBytes,
                          width: file.width,
                          height: file.height,
                          aspectRatio: file.aspectRatio,
                          optimizedFormat: file.optimizedFormat,
                          responsiveWidths: file.responsiveWidths ?? [],
                          derivativeManifest: file.derivativeManifest ?? [],
                          optimizationNotes: file.optimizationNotes,
                          focalPointX: file.focalPointX ?? 0.5,
                          focalPointY: file.focalPointY ?? 0.5,
                          tags: [],
                          uploadedBy: access.name,
                          usageCount: 0,
                          createdAt: file.createdAt,
                          updatedAt: file.createdAt,
                        }));
                        setMediaAssets((prev) => [...uploaded, ...prev]);
                        showToast(`${uploaded.length} media asset${uploaded.length !== 1 ? "s" : ""} uploaded`);
                        router.refresh();
                      } catch (error) {
                        showToast(error instanceof Error ? error.message : "Unable to upload media");
                      } finally {
                        input.value = "";
                      }
                    }}
                  />
                  <button
                    onClick={() => mediaUploadRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline"
                  >
                    <Upload className="size-3.5" />
                    Upload media
                  </button>
                </>
              }
            >
              <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="flex h-11 items-center gap-2 border border-[var(--border)] bg-[var(--card)] px-3">
                  <Search className="size-4 text-[var(--muted)]" />
                  <input
                    aria-label="Search media assets"
                    value={mediaQuery}
                    onChange={(event) => setMediaQuery(event.target.value)}
                    placeholder="Search filename, folder, tag, mime type..."
                    className="h-full w-full bg-transparent text-sm outline-none"
                  />
                </label>
                <div className="grid grid-cols-4 border border-[var(--border)] bg-[var(--card)] text-center text-xs">
                  <div className="px-3 py-2">
                    <span className="block font-semibold">{mediaAssets.length}</span>
                    <span className="text-[var(--muted)]">Assets</span>
                  </div>
                  <div className="border-x border-[var(--border)] px-3 py-2">
                    <span className="block font-semibold">{mediaAssets.filter((asset) => asset.mediaType === "IMAGE").length}</span>
                    <span className="text-[var(--muted)]">Images</span>
                  </div>
                  <div className="px-3 py-2">
                    <span className="block font-semibold">{mediaAssets.filter((asset) => asset.mediaType === "VIDEO").length}</span>
                    <span className="text-[var(--muted)]">Videos</span>
                  </div>
                  <div className="border-l border-[var(--border)] px-3 py-2">
                    <span className="block font-semibold">
                      {mediaAssets.filter((asset) => asset.width && asset.height).length}
                    </span>
                    <span className="text-[var(--muted)]">Optimized</span>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pagedMediaAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="border border-[var(--border)] bg-[var(--card)] p-3 transition hover:shadow-md"
                  >
                    <button
                      type="button"
                      aria-label={`Edit media asset ${asset.name}`}
                      onClick={() => setEditingMediaAsset(asset)}
                      className="relative block aspect-square w-full overflow-hidden bg-stone-100 text-left"
                    >
                      {asset.mediaType === "IMAGE" ? (
                        <Image
                          src={asset.url}
                          alt={asset.altText ?? asset.name}
                          fill
                          sizes="220px"
                          className="object-cover"
                        />
                      ) : (
                        <video src={asset.url} className="h-full w-full object-cover" muted playsInline />
                      )}
                    </button>
                    <p className="mt-2 truncate text-xs font-medium" title={asset.originalName}>{asset.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.mediaType.toLowerCase()} · {formatBytes(asset.sizeBytes)} · used {asset.usageCount}x
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.width && asset.height ? `${asset.width} x ${asset.height}` : "Dimensions pending"}
                      {asset.optimizedFormat ? ` · ${asset.optimizedFormat}` : ""}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">
                      {asset.folder ? `/${asset.folder}` : "No folder"}
                      {asset.tags.length ? ` · ${asset.tags.join(", ")}` : ""}
                    </p>
                    <p className="mt-1 truncate font-mono text-[10px] text-[var(--muted)]" title={asset.url}>
                      {asset.url}
                    </p>
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => setEditingMediaAsset(asset)}
                        className="text-xs font-bold uppercase tracking-[0.12em] underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMediaAsset(asset)}
                        className="text-xs font-bold uppercase tracking-[0.12em] text-red-500 underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {filteredMediaAssets.length === 0 ? (
                  <div className="col-span-full border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
                    No media assets found.
                  </div>
                ) : null}
              </div>
              <PaginationBar
                page={safeMediaPage}
                totalPages={mediaTotalPages}
                totalItems={filteredMediaAssets.length}
                pageSize={PAGE_SIZE}
                onPageChange={setMediaPage}
              />
            </Panel>
          ) : null}

          {/* ── Automation ────────────────────────────── */}
          {active === "automation" ? (
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-3 flex flex-wrap items-center justify-between gap-3 border border-[var(--border)] bg-[var(--surface)] p-4">
                <div>
                  <p className="text-sm font-semibold">Automation runner</p>
                  <p className="text-xs text-[var(--muted)]">Processes due enabled workflows once. Duplicate events are skipped automatically.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/admin/email-templates")}
                    className="h-10 border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.12em]"
                  >
                    Template editor
                  </button>
                  <button
                    onClick={async () => {
                      const response = await fetch("/api/admin/automation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ entity: "run" }),
                      });
                    const result = await response.json();
                    if (!response.ok) return showToast(result.message ?? "Unable to run automation");
                    setEmailDeliveries(result.deliveries ?? []);
                    setAutomationEvents(result.events ?? []);
                    showToast(`${result.sent} processed, ${result.retried ?? 0} retried, ${result.skipped} duplicates skipped`);
                  }}
                    className="h-10 bg-[var(--accent)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#17262D]"
                  >
                    Run due workflows
                  </button>
                </div>
              </div>
              <div className="xl:col-span-3">
                <Panel
                  title={`Product alert queue — ${productAlertDeliveries.length}`}
                  action={<Bell className="size-4 text-[var(--accent)]" />}
                >
                  <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      ["Queued", productAlertDeliveries.filter((item) => item.status === "QUEUED").length],
                      ["Sent", productAlertDeliveries.filter((item) => item.status === "SENT").length],
                      ["Failed", productAlertDeliveries.filter((item) => ["FAILED", "EXHAUSTED"].includes(item.status)).length],
                      ["Clicked", productAlertDeliveries.filter((item) => item.clickedAt).length],
                      ["Converted", productAlertDeliveries.filter((item) => item.convertedAt).length],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="border border-[var(--border)] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                        <p className="mt-1 text-xl font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      Stock alerts are queued only when available stock crosses above zero. Price alerts are queued only when a saved target is reached.
                    </p>
                    <button
                      type="button"
                      disabled={processingProductAlerts}
                      onClick={async () => {
                        setProcessingProductAlerts(true);
                        try {
                          const response = await fetch("/api/admin/product-alerts", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "run" }),
                          });
                          const result = await response.json();
                          if (!response.ok) throw new Error(result.message ?? "Unable to process product alerts");
                          setProductAlertDeliveries(result.deliveries ?? []);
                          showToast(`${result.sent} alerts sent, ${result.failed} failed`);
                        } catch (error) {
                          showToast(error instanceof Error ? error.message : "Unable to process product alerts");
                        } finally {
                          setProcessingProductAlerts(false);
                        }
                      }}
                      className="h-10 bg-[var(--accent)] px-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#17262D] disabled:opacity-50"
                    >
                      {processingProductAlerts ? "Processing" : "Run product alerts"}
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-[var(--border)]">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead className="bg-[var(--card)] text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                        <tr>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Alert</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Attempts</th>
                          <th className="px-4 py-3">Engagement</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productAlertDeliveries.length ? productAlertDeliveries.map((delivery) => (
                          <tr key={delivery.id} className="border-t border-[var(--border)] align-top">
                            <td className="px-4 py-3">
                              <p className="font-medium">{delivery.email}</p>
                              <p className="mt-1 text-xs text-[var(--muted)]">{new Date(delivery.createdAt).toLocaleString()}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{delivery.productName}</p>
                              <p className="mt-1 text-xs text-[var(--muted)]">{delivery.type.replaceAll("_", " ")}{delivery.variantLabel ? ` · ${delivery.variantLabel}` : ""}</p>
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill label={delivery.status} />
                              {delivery.suppressionReason ? <p className="mt-2 text-xs text-[var(--muted)]">{delivery.suppressionReason}</p> : null}
                              {delivery.error ? <p className="mt-2 max-w-xs text-xs text-red-500">{delivery.error}</p> : null}
                            </td>
                            <td className="px-4 py-3">{delivery.attempts} / {delivery.maxAttempts}</td>
                            <td className="px-4 py-3 text-xs">
                              <p>{delivery.sentAt ? "Sent" : "Not sent"}</p>
                              <p className="mt-1 text-[var(--muted)]">{delivery.convertedAt ? "Converted" : delivery.clickedAt ? "Product opened" : "No click"}</p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {["FAILED", "EXHAUSTED"].includes(delivery.status) ? (
                                <button
                                  type="button"
                                  className="text-xs font-semibold uppercase underline underline-offset-4"
                                  onClick={async () => {
                                    const response = await fetch("/api/admin/product-alerts", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "retry", deliveryId: delivery.id }),
                                    });
                                    const result = await response.json();
                                    if (!response.ok) return showToast(result.message ?? "Unable to retry alert");
                                    setProductAlertDeliveries(result.deliveries ?? []);
                                    showToast(result.sent ? "Alert delivered" : "Alert retry processed");
                                  }}
                                >
                                  Retry
                                </button>
                              ) : <span className="text-xs text-[var(--muted)]">—</span>}
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--muted)]">No product alerts have been triggered.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </div>
              <div className="xl:col-span-3">
                <Panel
                  title="Automation performance — last 90 days"
                  action={<BarChart3 className="size-4 text-[var(--accent)]" />}
                >
                  <div className="overflow-x-auto border border-[var(--border)]">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead className="bg-[var(--card)] text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                        <tr>
                          <th className="px-4 py-3">Workflow</th>
                          <th className="px-4 py-3">Sent</th>
                          <th className="px-4 py-3">Suppressed</th>
                          <th className="px-4 py-3">Failed</th>
                          <th className="px-4 py-3">Clicks</th>
                          <th className="px-4 py-3">Conversions</th>
                          <th className="px-4 py-3 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.automationReport.length ? catalog.automationReport.map((row) => (
                          <tr key={row.type} className="border-t border-[var(--border)] align-top">
                            <td className="px-4 py-3">
                              <p className="font-semibold">{row.type.replaceAll("_", " ").toLowerCase()}</p>
                              <p className="mt-1 text-xs text-[var(--muted)]">Lifecycle attributed delivery</p>
                            </td>
                            <td className="px-4 py-3 font-medium">{row.sent}</td>
                            <td className="px-4 py-3">{row.suppressed}</td>
                            <td className="px-4 py-3">{row.failed}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{row.clicked}</p>
                              <p className="mt-1 text-xs text-[var(--muted)]">{row.clickRate.toFixed(1)}%</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{row.converted}</p>
                              <p className="mt-1 text-xs text-[var(--muted)]">{row.conversionRate.toFixed(1)}%</p>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{formatAdminMoney(row.revenue)}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                              No lifecycle email performance has been recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </div>
              <Panel
                title="AI description generator"
                action={<Sparkles className="size-4 text-[var(--accent)]" />}
              >
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Draft product descriptions from name, fabric, fit notes, and SEO
                  keywords — in seconds.
                </p>
                <button
                  onClick={() => setGenerateDescOpen(true)}
                  className="mt-5 h-10 w-full bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.12em] text-[#17262D]"
                >
                  Open generator
                </button>
              </Panel>
              <Panel
                title="Email integrations"
                action={<Mail className="size-4 text-[var(--accent)]" />}
              >
                <div className="space-y-3">
                  {["KLAVIYO", "MAILCHIMP"].map((provider) => {
                    const integration = emailIntegrations.find((item) => item.provider === provider);
                    return (
                      <form
                        key={provider}
                        className="grid gap-3 border border-[var(--border)] p-3"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          const response = await fetch("/api/admin/automation", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              entity: "integration",
                              provider,
                              enabled: integration?.enabled ?? false,
                              listId: form.get("listId"),
                              apiKeyEnv: form.get("apiKeyEnv"),
                            }),
                          });
                          const result = await response.json();
                          if (!response.ok) return showToast(result.message ?? "Unable to save integration");
                          setEmailIntegrations((prev) => [...prev.filter((item) => item.provider !== provider), result.integration]);
                          showToast(`${provider} configuration saved`);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                          <p className="text-sm font-semibold">{provider}</p>
                            <p className="text-xs text-[var(--muted)]">{integration?.enabled ? "Enabled" : "Disabled"}</p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const response = await fetch("/api/admin/automation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ entity: "integration", provider, enabled: !integration?.enabled }),
                              });
                              const result = await response.json();
                              if (!response.ok) return showToast(result.message ?? "Unable to update integration");
                              setEmailIntegrations((prev) => [...prev.filter((item) => item.provider !== provider), result.integration]);
                              showToast(`${provider} ${result.integration.enabled ? "enabled" : "disabled"}`);
                            }}
                            className="text-xs font-semibold uppercase underline"
                          >
                            {integration?.enabled ? "Disable" : "Enable"}
                          </button>
                        </div>
                        <input name="listId" defaultValue={integration?.listId ?? ""} className={inputCls} placeholder="Audience / list ID" />
                        <input name="apiKeyEnv" defaultValue={integration?.apiKeyEnv ?? `${provider}_API_KEY`} className={inputCls} placeholder="Environment variable name" />
                        <button
                          type="submit"
                          className="h-9 border border-[var(--border)] text-xs font-semibold uppercase"
                        >
                          Save configuration
                        </button>
                      </form>
                    );
                  })}
                </div>
              </Panel>
              <Panel
                title="Email workflows"
                action={<Sparkles className="size-4 text-[var(--accent)]" />}
              >
                <div className="space-y-3">
                  {[
                    ["WELCOME", "Welcome email", 0],
                    ["ABANDONED_CART", "Abandoned cart", 4],
                    ["POST_PURCHASE", "Post-purchase", 24],
                    ["REVIEW_REQUEST", "Review request", 72],
                  ].map(([type, name, delay]) => {
                    const workflow = automationWorkflows.find((item) => item.type === type);
                    return (
                      <div key={String(type)} className="flex items-center justify-between border border-[var(--border)] p-3">
                        <div>
                          <p className="text-sm font-semibold">{name}</p>
                          <p className="text-xs text-[var(--muted)]">{workflow?.delayHours ?? delay} hour delay</p>
                        </div>
                        <button
                          onClick={async () => {
                            const response = await fetch("/api/admin/automation", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                entity: "workflow",
                                type,
                                enabled: !workflow?.enabled,
                                delayHours: workflow?.delayHours ?? delay,
                                provider: "KLAVIYO",
                              }),
                            });
                            const result = await response.json();
                            if (!response.ok) return showToast(result.message ?? "Unable to update workflow");
                            setAutomationWorkflows((prev) => [...prev.filter((item) => item.type !== type), result.workflow]);
                          }}
                          className="text-xs font-semibold uppercase underline"
                        >
                          {workflow?.enabled ? "Disable" : "Enable"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Panel>
              <Panel title={`Scheduled reports — ${scheduledReports.length}`} action={<FileDown className="size-4 text-[var(--accent)]" />}>
                <button
                  onClick={async () => {
                    const response = await fetch("/api/admin/automation", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        entity: "report",
                        name: "Weekly sales report",
                        reportType: "SALES",
                        frequency: "WEEKLY",
                        recipients: "admin@velora.ae",
                      }),
                    });
                    const result = await response.json();
                    if (!response.ok) return showToast(result.message ?? "Unable to schedule report");
                    setScheduledReports((prev) => [result.report, ...prev]);
                    showToast("Weekly sales report scheduled");
                  }}
                  className="mb-4 h-10 w-full border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em]"
                >
                  Schedule weekly sales report
                </button>
                {scheduledReports.map((report) => (
                  <div key={report.id} className="border-t border-[var(--border)] py-3 text-sm">
                    <p className="font-semibold">{report.name}</p>
                    <p className="text-xs text-[var(--muted)]">{report.frequency} · {report.recipients}</p>
                  </div>
                ))}
              </Panel>
              <Panel
                title={`Lifecycle event queue — ${automationEvents.length}`}
                action={<Sparkles className="size-4 text-[var(--accent)]" />}
              >
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Pending", automationEvents.filter((item) => item.status === "PENDING").length],
                    ["Processed", automationEvents.filter((item) => item.status === "PROCESSED").length],
                    ["Skipped", automationEvents.filter((item) => item.status.startsWith("SKIPPED")).length],
                    ["Failed", automationEvents.filter((item) => item.status === "FAILED").length],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="border border-[var(--border)] p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                      <p className="mt-1 text-lg font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="max-h-[360px] space-y-3 overflow-y-auto">
                  {automationEvents.length ? automationEvents.map((event) => (
                    <div key={event.id} className="border border-[var(--border)] p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{event.type.replaceAll("_", " ").toLowerCase()}</p>
                          <p className="truncate text-xs text-[var(--muted)]">{event.recipient}</p>
                        </div>
                        <StatusPill label={event.status} />
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Scheduled {new Date(event.scheduledAt).toLocaleString()}
                        {event.processedAt ? ` · Processed ${new Date(event.processedAt).toLocaleString()}` : ""}
                        {event.skippedAt ? ` · Skipped ${new Date(event.skippedAt).toLocaleString()}` : ""}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">{event.sourceKey}</p>
                      {event.error ? <p className="mt-2 text-xs text-red-500">{event.error}</p> : null}
                    </div>
                  )) : <p className="text-sm text-[var(--muted)]">No lifecycle events have been queued yet.</p>}
                </div>
              </Panel>
              <Panel
                title={`Provider reconciliation — ${emailProviderEvents.length}`}
                action={<ShieldCheck className="size-4 text-[var(--accent)]" />}
              >
                <div className="mb-6 border border-[var(--border)] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Payment provider events</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Stripe checkout, refund, failed payment, and dispute events reconciled from webhooks.
                      </p>
                    </div>
                    <StatusPill label={`${paymentProviderEvents.length} events`} />
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["Action required", paymentProviderEvents.filter((item) => item.status === "ACTION_REQUIRED").length],
                      ["Failed", paymentProviderEvents.filter((item) => item.status === "FAILED" || item.severity === "ERROR").length],
                      ["Disputes", paymentProviderEvents.filter((item) => item.eventType.includes("dispute")).length],
                      ["Processed", paymentProviderEvents.filter((item) => item.status === "PROCESSED").length],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="border border-[var(--border)] p-3">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                        <p className="mt-1 text-lg font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="max-h-[300px] space-y-3 overflow-y-auto">
                    {paymentProviderEvents.length ? paymentProviderEvents.map((event) => (
                      <div key={event.id} className="border border-[var(--border)] p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{event.provider} · {event.eventType.replaceAll("_", " ").toLowerCase()}</p>
                            <p className="truncate font-mono text-xs text-[var(--muted)]">{event.paymentRef ?? event.providerEventId}</p>
                          </div>
                          <StatusPill label={event.status === "ACTION_REQUIRED" ? "REVIEW" : event.status} />
                        </div>
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          Occurred {new Date(event.occurredAt).toLocaleString()}
                          {event.processedAt ? ` · Processed ${new Date(event.processedAt).toLocaleString()}` : ""}
                          {event.orderNumber ? ` · ${event.orderNumber}` : ""}
                        </p>
                        {event.message ? <p className="mt-2 text-xs text-red-500">{event.message}</p> : null}
                      </div>
                    )) : <p className="text-sm text-[var(--muted)]">No payment provider events have been reconciled yet.</p>}
                  </div>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Open alerts", emailProviderEvents.filter((item) => item.alertStatus === "OPEN").length],
                    ["Bounces", emailProviderEvents.filter((item) => item.eventType.includes("BOUNCE")).length],
                    ["Complaints", emailProviderEvents.filter((item) => item.eventType.includes("COMPLAINT")).length],
                    ["Unsubscribes", emailProviderEvents.filter((item) => item.eventType.includes("UNSUB")).length],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="border border-[var(--border)] p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                      <p className="mt-1 text-lg font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="max-h-[360px] space-y-3 overflow-y-auto">
                  {emailProviderEvents.length ? emailProviderEvents.map((event) => (
                    <div key={event.id} className="border border-[var(--border)] p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{event.provider} · {event.eventType.replaceAll("_", " ").toLowerCase()}</p>
                          <p className="truncate text-xs text-[var(--muted)]">{event.recipient}</p>
                        </div>
                        <StatusPill label={event.alertStatus === "OPEN" ? "ALERT" : event.severity} />
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Occurred {new Date(event.occurredAt).toLocaleString()}
                        {event.sourceKey ? ` · ${event.sourceKey}` : ""}
                      </p>
                      {event.message ? <p className="mt-2 text-xs text-red-500">{event.message}</p> : null}
                    </div>
                  )) : <p className="text-sm text-[var(--muted)]">No provider events have been reconciled yet.</p>}
                </div>
              </Panel>
              <Panel
                title={`Email delivery log — ${emailDeliveries.length}`}
                action={<Mail className="size-4 text-[var(--accent)]" />}
              >
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Sent", emailDeliveries.filter((item) => ["SENT", "DRY_RUN"].includes(item.status)).length],
                    ["Queued", emailDeliveries.filter((item) => ["QUEUED", "PROCESSING", "RETRYING"].includes(item.status)).length],
                    ["Suppressed", emailDeliveries.filter((item) => item.status === "SUPPRESSED").length],
                    ["Failed", emailDeliveries.filter((item) => item.status === "FAILED").length],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="border border-[var(--border)] p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                      <p className="mt-1 text-lg font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="max-h-[430px] space-y-3 overflow-y-auto">
                  {emailDeliveries.length ? emailDeliveries.map((delivery) => (
                    <div key={delivery.id} className="border border-[var(--border)] p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{delivery.subject}</p>
                          <p className="truncate text-xs text-[var(--muted)]">{delivery.recipient}</p>
                        </div>
                        <StatusPill label={delivery.status} />
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {delivery.workflowName ?? "Transactional"} · {delivery.provider}
                        {delivery.orderNumber ? ` · ${delivery.orderNumber}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Attempts {delivery.attempts}/{delivery.maxAttempts}
                        {delivery.nextAttemptAt ? ` · Retry ${new Date(delivery.nextAttemptAt).toLocaleString()}` : ""}
                      </p>
                      {delivery.suppressionReason ? <p className="mt-2 text-xs text-amber-600">Suppressed: {delivery.suppressionReason.replaceAll("_", " ").toLowerCase()}</p> : null}
                      {delivery.error ? <p className="mt-2 text-xs text-red-500">{delivery.error}</p> : null}
                      {["FAILED", "RETRYING"].includes(delivery.status) ? (
                        <button
                          type="button"
                          className="mt-3 text-xs font-semibold uppercase underline underline-offset-4"
                          onClick={async () => {
                            const response = await fetch("/api/admin/automation", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ entity: "retry-delivery", deliveryId: delivery.id }),
                            });
                            const result = await response.json();
                            if (!response.ok) return showToast(result.message ?? "Unable to retry delivery");
                            setEmailDeliveries((current) => current.map((item) => item.id === delivery.id ? {
                              ...item,
                              ...result.delivery,
                              nextAttemptAt: result.delivery.nextAttemptAt ?? undefined,
                              suppressionReason: result.delivery.suppressionReason ?? undefined,
                            } : item));
                            showToast(`Delivery ${result.delivery.status.toLowerCase()}`);
                          }}
                        >
                          Retry now
                        </button>
                      ) : null}
                    </div>
                  )) : <p className="text-sm text-[var(--muted)]">No email attempts have been recorded.</p>}
                </div>
              </Panel>
            </div>
          ) : null}

          {active === "content" ? (
            <div className="grid gap-6">
              <Panel title="Storefront content">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <h2 className="text-xl font-semibold">Structured page manager</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Create and manage editorial, FAQ, guide, policy, support, and legal pages with typed blocks, preview, publication scheduling, version history, and rollback.</p>
                  </div>
                  <button type="button" onClick={() => router.push("/admin/content")} className="h-11 bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#17262D]">Open content manager</button>
                </div>
              </Panel>

              <Panel title="Arabic translation editor">
                <form onSubmit={(event) => void saveTranslation(event)} className="grid gap-5">
                  <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_120px] lg:items-end">
                    <FieldLabel label="Entity">
                      <select
                        value={translationEntity}
                        onChange={(event) => {
                          const nextEntity = event.target.value as TranslationEntity;
                          setTranslationEntity(nextEntity);
                          setTranslationOwnerId(firstTranslationOwnerIdFor(nextEntity));
                          setTranslationDraft(emptyTranslationDraft);
                          setLoadingTranslation(true);
                        }}
                        className={inputCls}
                      >
                        <option value="product">Product</option>
                        <option value="category">Category</option>
                        <option value="collection">Collection</option>
                        <option value="homepageSection">Homepage section</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel label="Record">
                      <select
                        value={translationOwnerId}
                        onChange={(event) => {
                          setTranslationOwnerId(event.target.value);
                          setLoadingTranslation(true);
                        }}
                        className={inputCls}
                      >
                        {translationOwnerOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </FieldLabel>
                    <button
                      type="submit"
                      disabled={!translationOwnerId || savingTranslation || loadingTranslation}
                      className="h-11 bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#17262D] disabled:opacity-50"
                    >
                      {savingTranslation ? "Saving" : "Save"}
                    </button>
                  </div>

                  <div className="border border-[var(--border)] bg-[var(--card)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{selectedTranslationOwner?.label ?? "No record selected"}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">Locale: Arabic · {loadingTranslation ? "Loading saved copy" : "Ready to edit"}</p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">RTL content</span>
                    </div>

                    <div dir="rtl" className="mt-5 grid gap-4">
                      {translationEntity === "product" || translationEntity === "homepageSection" ? (
                        <FieldLabel label="Arabic title">
                          <input value={translationDraft.title} onChange={(event) => updateTranslationField("title", event.target.value)} className={inputCls} />
                        </FieldLabel>
                      ) : null}

                      {translationEntity === "category" || translationEntity === "collection" ? (
                        <FieldLabel label="Arabic name">
                          <input value={translationDraft.name} onChange={(event) => updateTranslationField("name", event.target.value)} className={inputCls} />
                        </FieldLabel>
                      ) : null}

                      {translationEntity === "product" || translationEntity === "category" ? (
                        <FieldLabel label="Arabic description">
                          <textarea rows={5} value={translationDraft.description} onChange={(event) => updateTranslationField("description", event.target.value)} className={`${inputCls} h-auto min-h-28 py-3 leading-6`} />
                        </FieldLabel>
                      ) : null}

                      {translationEntity === "collection" ? (
                        <FieldLabel label="Arabic summary">
                          <textarea rows={5} value={translationDraft.summary} onChange={(event) => updateTranslationField("summary", event.target.value)} className={`${inputCls} h-auto min-h-28 py-3 leading-6`} />
                        </FieldLabel>
                      ) : null}

                      {translationEntity === "product" ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <FieldLabel label="Arabic fabric details">
                            <textarea rows={4} value={translationDraft.fabricDetails} onChange={(event) => updateTranslationField("fabricDetails", event.target.value)} className={`${inputCls} h-auto min-h-24 py-3 leading-6`} />
                          </FieldLabel>
                          <FieldLabel label="Arabic care instructions">
                            <textarea rows={4} value={translationDraft.careInstructions} onChange={(event) => updateTranslationField("careInstructions", event.target.value)} className={`${inputCls} h-auto min-h-24 py-3 leading-6`} />
                          </FieldLabel>
                        </div>
                      ) : null}

                      {translationEntity === "homepageSection" ? (
                        <>
                          <div className="grid gap-4 lg:grid-cols-2">
                            <FieldLabel label="Arabic subtitle">
                              <input value={translationDraft.subtitle} onChange={(event) => updateTranslationField("subtitle", event.target.value)} className={inputCls} />
                            </FieldLabel>
                            <FieldLabel label="Arabic CTA label">
                              <input value={translationDraft.ctaLabel} onChange={(event) => updateTranslationField("ctaLabel", event.target.value)} className={inputCls} />
                            </FieldLabel>
                          </div>
                          <FieldLabel label="Arabic body">
                            <textarea rows={5} value={translationDraft.body} onChange={(event) => updateTranslationField("body", event.target.value)} className={`${inputCls} h-auto min-h-28 py-3 leading-6`} />
                          </FieldLabel>
                          <FieldLabel label="Localized CTA href">
                            <input dir="ltr" value={translationDraft.ctaHref} onChange={(event) => updateTranslationField("ctaHref", event.target.value)} className={inputCls} placeholder="/ar/shop" />
                          </FieldLabel>
                        </>
                      ) : null}
                    </div>

                    {translationEntity !== "homepageSection" ? (
                      <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 lg:grid-cols-2">
                        <FieldLabel label="Arabic SEO title">
                          <input value={translationDraft.seoTitle} onChange={(event) => updateTranslationField("seoTitle", event.target.value)} className={inputCls} />
                        </FieldLabel>
                        <FieldLabel label="Arabic SEO description">
                          <textarea rows={3} value={translationDraft.seoDescription} onChange={(event) => updateTranslationField("seoDescription", event.target.value)} className={`${inputCls} h-auto min-h-20 py-3 leading-6`} />
                        </FieldLabel>
                      </div>
                    ) : null}
                  </div>
                </form>
              </Panel>

              <Panel title={`Arabic translation coverage — ${catalog.translationCoverage.overallPercent}%`}>
                <div className="grid gap-4 lg:grid-cols-4">
                  {catalog.translationCoverage.entities.map((entity) => (
                    <div key={entity.entity} className="border border-[var(--border)] bg-[var(--card)] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold">{entity.entity}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{entity.translated}/{entity.total} translated</p>
                        </div>
                        <span className="text-lg font-semibold">{entity.percent}%</span>
                      </div>
                      <div className="mt-4 h-1.5 bg-[var(--surface)]">
                        <div className="h-full bg-[var(--accent)]" style={{ width: `${entity.percent}%` }} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-semibold">{entity.missing}</p>
                          <p className="text-[var(--muted)]">Missing</p>
                        </div>
                        <div>
                          <p className="font-semibold">{entity.stale}</p>
                          <p className="text-[var(--muted)]">Needs review</p>
                        </div>
                      </div>
                      {entity.missingItems.length || entity.staleItems.length ? (
                        <p className="mt-4 line-clamp-3 text-xs leading-5 text-[var(--muted)]">
                          {[...entity.missingItems, ...entity.staleItems].slice(0, 4).join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          ) : null}

          {active === "support" ? (
            <Panel title="Customer support">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><h2 className="text-xl font-semibold">Support case queue</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Review contact requests, linked orders, priorities, ownership, and internal resolution notes.</p></div><button type="button" onClick={() => router.push("/admin/support")} className="h-11 bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#17262D]">Open support queue</button></div>
            </Panel>
          ) : null}

          {/* ── Settings ──────────────────────────────── */}
          {active === "settings" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="xl:col-span-2">
                <Panel title="Global storefront content">
                  <div className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                      <div>
                        <h2 className="text-xl font-semibold">Shared shell content</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                          Manage announcement messages, primary navigation, support links, footer groups, and newsletter copy. Save draft keeps edits private; publish updates the storefront shell.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                          <StatusPill label={globalContentSettings.publishedAt ? "Published" : "Default content"} />
                          {globalContentSettings.publishedAt ? <span>Published {formatAdminDate(globalContentSettings.publishedAt)}</span> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          type="button"
                          disabled={savingGlobalContent !== null}
                          onClick={() => saveGlobalContentSettings("draft")}
                          className="h-11 border border-[var(--border)] px-5 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                        >
                          {savingGlobalContent === "draft" ? "Saving" : "Save draft"}
                        </button>
                        <button
                          type="button"
                          disabled={savingGlobalContent !== null}
                          onClick={() => saveGlobalContentSettings("publish")}
                          className="h-11 bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#17262D] disabled:opacity-60"
                        >
                          {savingGlobalContent === "publish" ? "Publishing" : "Publish"}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 border border-[var(--border)] bg-[var(--card)] p-4">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={globalContentDraft.announcementEnabled}
                          onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, announcementEnabled: event.target.checked }))}
                          className="size-4 accent-[var(--accent)]"
                        />
                        Announcement bar enabled
                      </label>
                      <div className="grid gap-3">
                        {globalContentDraft.announcements.map((item) => (
                          <div key={item.id} className="grid gap-3 border border-[var(--border)] bg-[var(--surface)] p-3 lg:grid-cols-[96px_1fr_1fr_1fr_96px] lg:items-center">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
                              <input
                                type="checkbox"
                                checked={item.enabled}
                                onChange={(event) => updateGlobalDraft((draft) => ({
                                  ...draft,
                                  announcements: draft.announcements.map((row) => row.id === item.id ? { ...row, enabled: event.target.checked } : row),
                                }))}
                                className="size-4 accent-[var(--accent)]"
                              />
                              Active
                            </label>
                            <input
                              value={item.message.en}
                              onChange={(event) => updateGlobalDraft((draft) => ({
                                ...draft,
                                announcements: draft.announcements.map((row) => row.id === item.id ? { ...row, message: updateLocalizedText(row.message, "en", event.target.value) } : row),
                              }))}
                              className={inputCls}
                              aria-label={`${item.id} English announcement`}
                            />
                            <input
                              value={item.message.ar}
                              onChange={(event) => updateGlobalDraft((draft) => ({
                                ...draft,
                                announcements: draft.announcements.map((row) => row.id === item.id ? { ...row, message: updateLocalizedText(row.message, "ar", event.target.value) } : row),
                              }))}
                              className={inputCls}
                              aria-label={`${item.id} Arabic announcement`}
                              dir="rtl"
                            />
                            <input
                              value={item.href ?? ""}
                              onChange={(event) => updateGlobalDraft((draft) => ({
                                ...draft,
                                announcements: draft.announcements.map((row) => row.id === item.id ? { ...row, href: event.target.value } : row),
                              }))}
                              className={inputCls}
                              aria-label={`${item.id} announcement link`}
                              placeholder="/shipping"
                            />
                            <input
                              type="number"
                              value={item.sortOrder}
                              onChange={(event) => updateGlobalDraft((draft) => ({
                                ...draft,
                                announcements: draft.announcements.map((row) => row.id === item.id ? { ...row, sortOrder: Number(event.target.value) || 0 } : row),
                              }))}
                              className={inputCls}
                              aria-label={`${item.id} announcement sort order`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {([
                        ["primaryNavigation", "Primary navigation"],
                        ["serviceLinks", "Mobile service links"],
                      ] as const).map(([collection, title]) => (
                        <div key={collection} className="border border-[var(--border)] bg-[var(--card)] p-4">
                          <p className="text-sm font-semibold">{title}</p>
                          <div className="mt-4 grid gap-3">
                            {globalContentDraft[collection].map((item) => (
                              <div key={item.id} className="grid gap-2 border border-[var(--border)] bg-[var(--surface)] p-3">
                                <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
                                  <input
                                    type="checkbox"
                                    checked={item.enabled}
                                    onChange={(event) => updateGlobalLink(collection, item.id, (row) => ({ ...row, enabled: event.target.checked }))}
                                    className="size-4 accent-[var(--accent)]"
                                  />
                                  Enabled
                                </label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <input value={item.label.en} onChange={(event) => updateGlobalLink(collection, item.id, (row) => ({ ...row, label: updateLocalizedText(row.label, "en", event.target.value) }))} className={inputCls} aria-label={`${item.id} English label`} />
                                  <input value={item.label.ar} onChange={(event) => updateGlobalLink(collection, item.id, (row) => ({ ...row, label: updateLocalizedText(row.label, "ar", event.target.value) }))} className={inputCls} aria-label={`${item.id} Arabic label`} dir="rtl" />
                                </div>
                                <div className="grid gap-2 sm:grid-cols-[1fr_96px]">
                                  <input value={item.href} onChange={(event) => updateGlobalLink(collection, item.id, (row) => ({ ...row, href: event.target.value }))} className={inputCls} aria-label={`${item.id} link`} />
                                  <input type="number" value={item.sortOrder} onChange={(event) => updateGlobalLink(collection, item.id, (row) => ({ ...row, sortOrder: Number(event.target.value) || 0 }))} className={inputCls} aria-label={`${item.id} sort order`} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {globalContentDraft.footerGroups.map((group) => (
                        <div key={group.id} className="border border-[var(--border)] bg-[var(--card)] p-4">
                          <label className="inline-flex items-center gap-2 text-sm font-semibold">
                            <input
                              type="checkbox"
                              checked={group.enabled}
                              onChange={(event) => updateFooterGroup(group.id, (row) => ({ ...row, enabled: event.target.checked }))}
                              className="size-4 accent-[var(--accent)]"
                            />
                            Footer group
                          </label>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <input value={group.title.en} onChange={(event) => updateFooterGroup(group.id, (row) => ({ ...row, title: updateLocalizedText(row.title, "en", event.target.value) }))} className={inputCls} aria-label={`${group.id} English title`} />
                            <input value={group.title.ar} onChange={(event) => updateFooterGroup(group.id, (row) => ({ ...row, title: updateLocalizedText(row.title, "ar", event.target.value) }))} className={inputCls} aria-label={`${group.id} Arabic title`} dir="rtl" />
                          </div>
                          <div className="mt-4 grid gap-2">
                            {group.links.map((link) => (
                              <div key={link.id} className="grid gap-2 border border-[var(--border)] bg-[var(--surface)] p-3">
                                <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
                                  <input
                                    type="checkbox"
                                    checked={link.enabled}
                                    onChange={(event) => updateFooterGroup(group.id, (row) => ({
                                      ...row,
                                      links: row.links.map((item) => item.id === link.id ? { ...item, enabled: event.target.checked } : item),
                                    }))}
                                    className="size-4 accent-[var(--accent)]"
                                  />
                                  Enabled
                                </label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <input value={link.label.en} onChange={(event) => updateFooterGroup(group.id, (row) => ({
                                    ...row,
                                    links: row.links.map((item) => item.id === link.id ? { ...item, label: updateLocalizedText(item.label, "en", event.target.value) } : item),
                                  }))} className={inputCls} aria-label={`${link.id} English footer label`} />
                                  <input value={link.label.ar} onChange={(event) => updateFooterGroup(group.id, (row) => ({
                                    ...row,
                                    links: row.links.map((item) => item.id === link.id ? { ...item, label: updateLocalizedText(item.label, "ar", event.target.value) } : item),
                                  }))} className={inputCls} aria-label={`${link.id} Arabic footer label`} dir="rtl" />
                                </div>
                                <input value={link.href} onChange={(event) => updateFooterGroup(group.id, (row) => ({
                                  ...row,
                                  links: row.links.map((item) => item.id === link.id ? { ...item, href: event.target.value } : item),
                                }))} className={inputCls} aria-label={`${link.id} footer link`} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="grid gap-3 border border-[var(--border)] bg-[var(--card)] p-4">
                        <label className="inline-flex items-center gap-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={globalContentDraft.newsletter.enabled}
                            onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, newsletter: { ...draft.newsletter, enabled: event.target.checked } }))}
                            className="size-4 accent-[var(--accent)]"
                          />
                          Newsletter block enabled
                        </label>
                        <input value={globalContentDraft.newsletter.eyebrow.en} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, newsletter: { ...draft.newsletter, eyebrow: updateLocalizedText(draft.newsletter.eyebrow, "en", event.target.value) } }))} className={inputCls} aria-label="Newsletter eyebrow English" />
                        <input value={globalContentDraft.newsletter.eyebrow.ar} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, newsletter: { ...draft.newsletter, eyebrow: updateLocalizedText(draft.newsletter.eyebrow, "ar", event.target.value) } }))} className={inputCls} aria-label="Newsletter eyebrow Arabic" dir="rtl" />
                        <input value={globalContentDraft.newsletter.headline.en} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, newsletter: { ...draft.newsletter, headline: updateLocalizedText(draft.newsletter.headline, "en", event.target.value) } }))} className={inputCls} aria-label="Newsletter headline English" />
                        <input value={globalContentDraft.newsletter.headline.ar} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, newsletter: { ...draft.newsletter, headline: updateLocalizedText(draft.newsletter.headline, "ar", event.target.value) } }))} className={inputCls} aria-label="Newsletter headline Arabic" dir="rtl" />
                        <input value={globalContentDraft.newsletter.placeholder.en} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, newsletter: { ...draft.newsletter, placeholder: updateLocalizedText(draft.newsletter.placeholder, "en", event.target.value) } }))} className={inputCls} aria-label="Newsletter placeholder English" />
                        <input value={globalContentDraft.newsletter.placeholder.ar} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, newsletter: { ...draft.newsletter, placeholder: updateLocalizedText(draft.newsletter.placeholder, "ar", event.target.value) } }))} className={inputCls} aria-label="Newsletter placeholder Arabic" dir="rtl" />
                      </div>
                      <div className="grid gap-3 border border-[var(--border)] bg-[var(--card)] p-4">
                        <p className="text-sm font-semibold">Footer brand copy</p>
                        <textarea value={globalContentDraft.footer.body.en} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, footer: { ...draft.footer, body: updateLocalizedText(draft.footer.body, "en", event.target.value) } }))} rows={4} className={`${inputCls} h-auto py-3`} aria-label="Footer body English" />
                        <textarea value={globalContentDraft.footer.body.ar} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, footer: { ...draft.footer, body: updateLocalizedText(draft.footer.body, "ar", event.target.value) } }))} rows={4} className={`${inputCls} h-auto py-3`} aria-label="Footer body Arabic" dir="rtl" />
                        <input value={globalContentDraft.footer.location.en} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, footer: { ...draft.footer, location: updateLocalizedText(draft.footer.location, "en", event.target.value) } }))} className={inputCls} aria-label="Footer location English" />
                        <input value={globalContentDraft.footer.location.ar} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, footer: { ...draft.footer, location: updateLocalizedText(draft.footer.location, "ar", event.target.value) } }))} className={inputCls} aria-label="Footer location Arabic" dir="rtl" />
                        <input value={globalContentDraft.footer.copyright.en} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, footer: { ...draft.footer, copyright: updateLocalizedText(draft.footer.copyright, "en", event.target.value) } }))} className={inputCls} aria-label="Footer copyright English" />
                        <input value={globalContentDraft.footer.copyright.ar} onChange={(event) => updateGlobalDraft((draft) => ({ ...draft, footer: { ...draft.footer, copyright: updateLocalizedText(draft.footer.copyright, "ar", event.target.value) } }))} className={inputCls} aria-label="Footer copyright Arabic" dir="rtl" />
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
              <div className="xl:col-span-2">
                <Panel title="Product recommendations">
                  <form onSubmit={saveRecommendationSettings} className="space-y-5">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <label className="flex items-start justify-between gap-4 border border-[var(--border)] bg-[var(--card)] p-4">
                        <span>
                          <span className="block text-sm font-semibold">Storefront recommendations</span>
                          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Show the recommendation rail on product pages.</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={recommendationSettings.enabled}
                          onChange={(event) => setRecommendationSettings((current) => ({ ...current, enabled: event.target.checked }))}
                          className="mt-1 size-5 accent-[var(--accent)]"
                        />
                      </label>
                      <FieldLabel label="Default ranking strategy">
                        <select
                          value={recommendationSettings.strategy}
                          onChange={(event) => setRecommendationSettings((current) => ({
                            ...current,
                            strategy: event.target.value as AdminRecommendationSettings["strategy"],
                          }))}
                          className={inputCls}
                        >
                          <option value="BALANCED">Balanced relevance</option>
                          <option value="SAME_CATEGORY">Prioritize same category</option>
                          <option value="SAME_COLLECTION">Prioritize same collection</option>
                          <option value="BEST_SELLERS">Prioritize best sellers</option>
                        </select>
                      </FieldLabel>
                      <FieldLabel label="Products shown">
                        <input
                          type="number"
                          min={2}
                          max={8}
                          value={recommendationSettings.maxItems}
                          onChange={(event) => setRecommendationSettings((current) => ({
                            ...current,
                            maxItems: Math.max(2, Math.min(8, Number(event.target.value) || 2)),
                          }))}
                          className={inputCls}
                        />
                      </FieldLabel>
                    </div>

                    <div className="border border-[var(--border)]">
                      <div className="grid gap-4 border-b border-[var(--border)] p-4 lg:grid-cols-[minmax(240px,0.7fr)_1fr_auto] lg:items-end">
                        <FieldLabel label="Manual override for">
                          <select
                            value={recommendationSourceId}
                            onChange={(event) => setRecommendationSourceId(event.target.value)}
                            className={inputCls}
                          >
                            {catalog.products.filter((product) => product.status === "Published").map((product) => (
                              <option key={product.id} value={product.id}>{product.name}</option>
                            ))}
                          </select>
                        </FieldLabel>
                        <p className="text-xs leading-5 text-[var(--muted)]">
                          Selected products appear first in selection order. Empty overrides use the default ranking strategy.
                        </p>
                        <button
                          type="button"
                          disabled={!recommendationSourceId || !(recommendationSettings.manualOverrides[recommendationSourceId]?.length)}
                          onClick={() => setRecommendationSettings((current) => {
                            const manualOverrides = { ...current.manualOverrides };
                            delete manualOverrides[recommendationSourceId];
                            return { ...current, manualOverrides };
                          })}
                          className="h-10 px-3 text-xs font-semibold uppercase tracking-[0.1em] underline underline-offset-4 disabled:opacity-40"
                        >
                          Clear override
                        </button>
                      </div>
                      <div className="grid max-h-72 gap-px overflow-y-auto bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-3">
                        {catalog.products
                          .filter((product) => product.status === "Published" && product.id !== recommendationSourceId)
                          .map((product) => {
                            const selectedIds = recommendationSettings.manualOverrides[recommendationSourceId] ?? [];
                            const selectedIndex = selectedIds.indexOf(product.id);
                            const selected = selectedIndex >= 0;
                            const atLimit = selectedIds.length >= recommendationSettings.maxItems;
                            return (
                              <label key={product.id} className="flex min-h-16 items-center gap-3 bg-[var(--surface)] px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={!selected && atLimit}
                                  onChange={(event) => setRecommendationSettings((current) => {
                                    const currentIds = current.manualOverrides[recommendationSourceId] ?? [];
                                    const nextIds = event.target.checked
                                      ? [...currentIds, product.id].slice(0, current.maxItems)
                                      : currentIds.filter((id) => id !== product.id);
                                    const manualOverrides = { ...current.manualOverrides };
                                    if (nextIds.length) manualOverrides[recommendationSourceId] = nextIds;
                                    else delete manualOverrides[recommendationSourceId];
                                    return { ...current, manualOverrides };
                                  })}
                                  className="size-4 accent-[var(--accent)]"
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium">{product.name}</span>
                                  <span className="block text-xs text-[var(--muted)]">
                                    {selected ? `Position ${selectedIndex + 1}` : product.category}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="text-xs text-[var(--muted)]">
                        {Object.keys(recommendationSettings.manualOverrides).length} product-specific override{Object.keys(recommendationSettings.manualOverrides).length === 1 ? "" : "s"}
                      </p>
                      <button
                        type="submit"
                        disabled={savingRecommendationSettings}
                        className="h-11 bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#17262D] disabled:opacity-60"
                      >
                        {savingRecommendationSettings ? "Saving" : "Save recommendation settings"}
                      </button>
                    </div>
                  </form>
                </Panel>
              </div>
              <div className="xl:col-span-2">
                <Panel title="Search merchandising">
                  <form onSubmit={saveSearchMerchandisingSettings} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <FieldLabel label="Synonyms">
                        <textarea
                          name="synonyms"
                          rows={6}
                          defaultValue={recordToLines(searchMerchandisingSettings.synonyms)}
                          className={`${inputCls} h-auto py-3 font-mono text-xs leading-5`}
                          placeholder="yoga pants => leggings, flares"
                        />
                      </FieldLabel>
                      <FieldLabel label="Redirects">
                        <textarea
                          name="redirects"
                          rows={6}
                          defaultValue={recordToLines(searchMerchandisingSettings.redirects)}
                          className={`${inputCls} h-auto py-3 font-mono text-xs leading-5`}
                          placeholder="returns => /returns"
                        />
                      </FieldLabel>
                      <FieldLabel label="Pinned product IDs">
                        <textarea
                          name="pinnedProducts"
                          rows={6}
                          defaultValue={recordToLines(searchMerchandisingSettings.pinnedProducts)}
                          className={`${inputCls} h-auto py-3 font-mono text-xs leading-5`}
                          placeholder="leggings => product_id_1, product_id_2"
                        />
                      </FieldLabel>
                      <FieldLabel label="Boosted product IDs">
                        <textarea
                          name="boostedProducts"
                          rows={6}
                          defaultValue={recordToLines(searchMerchandisingSettings.boostedProducts)}
                          className={`${inputCls} h-auto py-3 font-mono text-xs leading-5`}
                          placeholder="black set => product_id_3"
                        />
                      </FieldLabel>
                      <FieldLabel label="Buried product IDs">
                        <textarea
                          name="buriedProducts"
                          rows={6}
                          defaultValue={recordToLines(searchMerchandisingSettings.buriedProducts)}
                          className={`${inputCls} h-auto py-3 font-mono text-xs leading-5`}
                          placeholder="sale => product_id_4"
                        />
                      </FieldLabel>
                      <div className="grid content-between gap-4 border border-[var(--border)] bg-[var(--card)] p-4">
                        <div>
                          <p className="text-sm font-semibold">Rule format</p>
                          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                            Add one query rule per line using <span className="font-mono">query =&gt; value</span>. Product rules accept comma-separated product IDs in display priority order.
                          </p>
                        </div>
                        <button
                          type="submit"
                          disabled={savingSearchMerchandisingSettings}
                          className="h-11 bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#17262D] disabled:opacity-60"
                        >
                          {savingSearchMerchandisingSettings ? "Saving" : "Save search merchandising"}
                        </button>
                      </div>
                    </div>

                    <aside className="border border-[var(--border)] bg-[var(--card)] p-4">
                      <p className="text-sm font-semibold">Published product IDs</p>
                      <div className="mt-3 grid max-h-[28rem] gap-px overflow-y-auto bg-[var(--border)]">
                        {catalog.products
                          .filter((product) => product.status === "Published")
                          .slice(0, 24)
                          .map((product) => (
                            <div key={product.id} className="min-w-0 bg-[var(--surface)] p-3">
                              <p className="truncate text-sm font-medium">{product.name}</p>
                              <p className="mt-1 break-all font-mono text-[11px] leading-4 text-[var(--muted)]">{product.id}</p>
                            </div>
                          ))}
                      </div>
                    </aside>
                  </form>
                </Panel>
              </div>
              <Panel title="Checkout payment settings">
                <form onSubmit={saveCheckoutSettings} className="space-y-5">
                  {(() => {
                    const zone = checkoutSettings.shippingZones[0];
                    const standard = zone?.methods.find((method) => method.id === "standard");
                    const express = zone?.methods.find((method) => method.id === "express");
                    return (
                      <div className="grid gap-4 border border-[var(--border)] bg-[var(--card)] p-4">
                        <div>
                          <p className="text-sm font-semibold">Shipping zone and methods</p>
                          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                            Configure checkout delivery labels, rates, free-delivery threshold, and customer-facing estimates.
                          </p>
                        </div>
                        <FieldLabel label="Zone name">
                          <input
                            name="shippingZoneName"
                            defaultValue={zone?.name ?? "United Arab Emirates"}
                            className={inputCls}
                          />
                        </FieldLabel>
                        <div className="grid gap-3 xl:grid-cols-2">
                          <div className="grid gap-3 border border-[var(--border)] p-3">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
                              <input
                                name="standardShippingEnabled"
                                type="checkbox"
                                defaultChecked={standard?.enabled ?? true}
                                className="size-4 accent-[var(--accent)]"
                              />
                              Standard delivery
                            </label>
                            <input name="standardShippingLabel" defaultValue={standard?.label ?? "Standard delivery"} className={inputCls} />
                            <input name="standardShippingEstimate" defaultValue={standard?.estimate ?? "2-4 business days"} className={inputCls} />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input name="standardShippingPrice" type="number" min="0" step="1" defaultValue={standard?.price ?? 25} className={inputCls} />
                              <input name="standardShippingFreeOver" type="number" min="0" step="1" defaultValue={standard?.freeOver ?? 300} className={inputCls} />
                            </div>
                          </div>
                          <div className="grid gap-3 border border-[var(--border)] p-3">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
                              <input
                                name="expressShippingEnabled"
                                type="checkbox"
                                defaultChecked={express?.enabled ?? true}
                                className="size-4 accent-[var(--accent)]"
                              />
                              Express delivery
                            </label>
                            <input name="expressShippingLabel" defaultValue={express?.label ?? "Express delivery"} className={inputCls} />
                            <input name="expressShippingEstimate" defaultValue={express?.estimate ?? "Next business day in major cities"} className={inputCls} />
                            <input name="expressShippingPrice" type="number" min="0" step="1" defaultValue={express?.price ?? 40} className={inputCls} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {(() => {
                    const stripe = checkoutSettings.paymentMethods.find((method) => method.id === "stripe");
                    const paypal = checkoutSettings.paymentMethods.find((method) => method.id === "paypal");
                    const tabby = checkoutSettings.paymentMethods.find((method) => method.id === "tabby");
                    const cod = checkoutSettings.paymentMethods.find((method) => method.id === "cash_on_delivery");
                    return (
                      <div className="grid gap-4 border border-[var(--border)] bg-[var(--card)] p-4">
                        <div>
                          <p className="text-sm font-semibold">Payment method display</p>
                          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                            Control checkout payment visibility, order, and customer-facing copy.
                          </p>
                        </div>
                        <div className="grid gap-3 xl:grid-cols-2">
                          <div className="grid gap-3 border border-[var(--border)] p-3">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
                              <input name="stripeEnabled" type="checkbox" defaultChecked={stripe?.enabled ?? true} className="size-4 accent-[var(--accent)]" />
                              Stripe / card
                            </label>
                            <input name="stripeLabel" defaultValue={stripe?.label ?? "Secure card payment"} className={inputCls} />
                            <textarea name="stripeDescription" rows={3} defaultValue={stripe?.description ?? "Pay securely online by card, Apple Pay, or Google Pay where supported."} className={`${inputCls} h-auto py-3`} />
                            <input name="stripeSortOrder" type="number" min="0" step="1" defaultValue={stripe?.sortOrder ?? 1} className={inputCls} />
                          </div>
                          <div className="grid gap-3 border border-[var(--border)] p-3">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
                              <input name="paypalEnabled" type="checkbox" defaultChecked={paypal?.enabled ?? false} className="size-4 accent-[var(--accent)]" />
                              PayPal
                            </label>
                            <input name="paypalLabel" defaultValue={paypal?.label ?? "PayPal"} className={inputCls} />
                            <textarea name="paypalDescription" rows={3} defaultValue={paypal?.description ?? "Pay with your PayPal account or a saved PayPal payment method."} className={`${inputCls} h-auto py-3`} />
                            <input name="paypalSortOrder" type="number" min="0" step="1" defaultValue={paypal?.sortOrder ?? 2} className={inputCls} />
                          </div>
                          <div className="grid gap-3 border border-[var(--border)] p-3">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
                              <input name="tabbyEnabled" type="checkbox" defaultChecked={tabby?.enabled ?? false} className="size-4 accent-[var(--accent)]" />
                              Tabby
                            </label>
                            <input name="tabbyLabel" defaultValue={tabby?.label ?? "Tabby"} className={inputCls} />
                            <textarea name="tabbyDescription" rows={3} defaultValue={tabby?.description ?? "Split eligible orders into installments with Tabby."} className={`${inputCls} h-auto py-3`} />
                            <input name="tabbySortOrder" type="number" min="0" step="1" defaultValue={tabby?.sortOrder ?? 3} className={inputCls} />
                          </div>
                          <div className="grid gap-3 border border-[var(--border)] p-3">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
                              <input name="cashOnDeliveryEnabled" type="checkbox" defaultChecked={cod?.enabled ?? checkoutSettings.cashOnDeliveryEnabled} className="size-4 accent-[var(--accent)]" />
                              Cash on delivery
                            </label>
                            <input name="cashOnDeliveryLabel" defaultValue={cod?.label ?? checkoutSettings.cashOnDeliveryLabel} className={inputCls} />
                            <textarea name="cashOnDeliveryInstructions" rows={3} defaultValue={cod?.description ?? checkoutSettings.cashOnDeliveryInstructions} className={`${inputCls} h-auto py-3`} />
                            <input name="cashOnDeliverySortOrder" type="number" min="0" step="1" defaultValue={cod?.sortOrder ?? 4} className={inputCls} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="grid gap-4 border border-[var(--border)] bg-[var(--card)] p-4">
                    <div>
                      <p className="text-sm font-semibold">Express checkout</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        Show wallet shortcuts that continue through Stripe Checkout when the customer&apos;s device and browser support them.
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      <label className="inline-flex items-center gap-2">
                        <input name="expressCheckoutEnabled" type="checkbox" defaultChecked={checkoutSettings.expressCheckout.enabled} className="size-4 accent-[var(--accent)]" />
                        Enabled
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input name="expressCheckoutApplePay" type="checkbox" defaultChecked={checkoutSettings.expressCheckout.applePay} className="size-4 accent-[var(--accent)]" />
                        Apple Pay
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input name="expressCheckoutGooglePay" type="checkbox" defaultChecked={checkoutSettings.expressCheckout.googlePay} className="size-4 accent-[var(--accent)]" />
                        Google Pay
                      </label>
                    </div>
                  </div>
                  <div className="grid gap-4 border border-[var(--border)] bg-[var(--card)] p-4">
                    <div>
                      <p className="text-sm font-semibold">Address autocomplete</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        Use local UAE suggestions now, or prepare a third-party provider with local fallback.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldLabel label="Provider">
                        <select
                          name="addressAutocompleteProvider"
                          defaultValue={checkoutSettings.addressAutocomplete.provider}
                          className={inputCls}
                        >
                          <option value="LOCAL">Local UAE fallback</option>
                          <option value="GOOGLE_PLACES">Google Places</option>
                          <option value="MAPBOX">Mapbox</option>
                        </select>
                      </FieldLabel>
                      <div className="grid gap-2 text-sm">
                        <label className="inline-flex items-center gap-2">
                          <input name="addressAutocompleteEnabled" type="checkbox" defaultChecked={checkoutSettings.addressAutocomplete.enabled} className="size-4 accent-[var(--accent)]" />
                          Enabled
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input name="addressAutocompleteFallbackToLocal" type="checkbox" defaultChecked={checkoutSettings.addressAutocomplete.fallbackToLocal} className="size-4 accent-[var(--accent)]" />
                          Fall back to local UAE suggestions
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input name="addressAutocompleteApiKeyConfigured" type="checkbox" defaultChecked={checkoutSettings.addressAutocomplete.apiKeyConfigured} className="size-4 accent-[var(--accent)]" />
                          External API key configured
                        </label>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingCheckoutSettings}
                    className="h-11 bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#17262D] disabled:opacity-60"
                  >
                    {savingCheckoutSettings ? "Saving" : "Save checkout settings"}
                  </button>
                </form>
              </Panel>
              <Panel title="Current payment setup">
                <div className="space-y-3 text-sm">
                  {[...checkoutSettings.paymentMethods].sort((a, b) => a.sortOrder - b.sortOrder).map((method) => (
                    <div key={method.id} className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3">
                      <span>
                        <span className="block text-[var(--muted)]">{method.label}</span>
                        <span className="block text-xs text-[var(--muted)]">{method.description}</span>
                      </span>
                      <StatusPill label={method.enabled ? "Enabled" : "Disabled"} />
                    </div>
                  ))}
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    COD orders are created as processing orders, inventory is committed immediately, and payment remains marked as cod_pending until the admin collects or updates it.
                  </p>
                </div>
              </Panel>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
