"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ArrowRight, ClipboardList, Download, Heart, LogOut, MapPin, MonitorSmartphone, Pencil, Plus, RotateCcw, ShieldAlert, ShoppingBag, Trash2, Truck, UserRound } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { accountCopy, localeFromPathname } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n-shell";
import { useStore, type WishlistIntent } from "@/lib/store";
import { getPaymentStatusLabel } from "@/lib/payment-display";
import { formatAed } from "@/lib/utils";
import { WishlistProductCard } from "@/components/auth/wishlist-product-card";
import { AccountNavigation } from "@/components/auth/account-navigation";

export type Address = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  country: string;
  postalCode?: string | null;
};

function createWishlistKey(slugs: string[], intents: Record<string, WishlistIntent>) {
  return [...slugs].sort().map((slug) => `${slug}:${intents[slug]?.variantId ?? ""}:${intents[slug]?.color ?? ""}:${intents[slug]?.size ?? ""}`).join("|");
}

function createWishlistPayload(slugs: string[], intents: Record<string, WishlistIntent>) {
  return slugs.map((slug) => ({ slug, ...intents[slug] }));
}

function mapWishlistIntents(items: Array<{ slug: string; variantId?: string | null; color?: string | null; size?: string | null }> = []) {
  return Object.fromEntries(items.map((item) => [item.slug, { variantId: item.variantId ?? undefined, color: item.color ?? undefined, size: item.size ?? undefined }]));
}

export type AccountOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentProvider?: string | null;
  fulfillmentStatus: string;
  total: number;
  createdAt: string;
  itemCount: number;
  items: Array<{ title: string; quantity: number; size: string; color: string; unitPrice: number }>;
  trackingNo?: string | null;
};

export type AccountReturn = {
  id: string;
  orderNumber: string;
  resolution: string;
  reason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    title: string;
    color: string;
    originalSize: string;
    requestedSize: string | null;
    quantity: number;
  }>;
};

export type AccountUser = {
  name?: string | null;
  email: string;
  createdAt: string;
  marketingEmails: boolean;
  productAlertEmails: boolean;
  postPurchaseEmails: boolean;
  preferredSize?: string | null;
  fitPreference?: string | null;
  compressionPreference?: string | null;
  hasPassword: boolean;
};

export type AccountSession = {
  sessionToken: string;
  deviceLabel: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string | null;
  revokedReason?: string | null;
  current: boolean;
};

export type AccountDashboardProps = {
  section?: "overview" | "orders" | "returns" | "wishlist" | "addresses" | "settings";
  initialUser: AccountUser;
  initialAddresses: Address[];
  initialOrders: AccountOrder[];
  initialReturns: AccountReturn[];
  initialWishlistSlugs: string[];
  initialWishlistIntents: Record<string, { variantId?: string; color?: string; size?: string }>;
  catalogProducts: Product[];
};

const emptyAddress = {
  id: "",
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "Dubai",
  country: "United Arab Emirates",
  postalCode: "",
};

function statusClass(value: string) {
  const normalized = value.toLowerCase();
  if (["paid", "delivered", "shipped"].includes(normalized)) return "bg-[var(--accent-soft)] text-[var(--accent-text)] ring-1 ring-emerald-500/20";
  if (["cancelled", "refunded"].includes(normalized)) return "bg-red-500/10 text-[var(--sale)] ring-1 ring-red-500/20";
  if (["pending", "confirmed", "processing", "partially_fulfilled"].includes(normalized)) return "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300";
  return "bg-[var(--hover)] text-[var(--muted)] ring-1 ring-[var(--border)]";
}

function readableStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const formFieldClass = "storefront-action h-11 min-w-0 border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition focus:border-[var(--accent)] motion-reduce:transition-none";
const secondaryActionClass = "storefront-action h-11 border border-[var(--border)] text-sm font-semibold transition hover:border-[var(--foreground)] hover:bg-[var(--hover)] motion-reduce:transition-none";

function returnProgress(status: string, resolution: string, copy: (typeof accountCopy)["en"]) {
  const normalized = status.toUpperCase();
  if (normalized === "REJECTED") {
    return [
      { label: copy.submitted, complete: true },
      { label: copy.notApproved, complete: true, rejected: true },
    ];
  }
  const labels = resolution.toUpperCase() === "EXCHANGE"
    ? [copy.submitted, copy.approved, copy.pickup, copy.received, copy.inspected, copy.replacement, copy.complete]
    : [copy.submitted, copy.approved, copy.pickup, copy.received, copy.inspected, copy.refund, copy.complete];
  const rank: Record<string, number> = {
    PENDING: 0,
    APPROVED: 1,
    PICKUP_SCHEDULED: 2,
    PICKED_UP: 2,
    RECEIVED: 3,
    INSPECTED: 4,
    REFUND_PROCESSING: 5,
    REPLACEMENT_CREATED: 5,
    COMPLETED: labels.length - 1,
  };
  const current = rank[normalized] ?? 0;
  return labels.map((label, index) => ({ label, complete: index <= current, rejected: false }));
}

export function AccountDashboard({
  section = "overview",
  initialUser,
  initialAddresses,
  initialOrders,
  initialReturns,
  initialWishlistSlugs,
  initialWishlistIntents,
  catalogProducts,
}: AccountDashboardProps) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const copy = accountCopy[locale];
  const dateLocale = locale === "ar" ? "ar-AE" : "en-AE";
  const [name, setName] = useState(initialUser.name ?? "");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    marketingEmails: initialUser.marketingEmails,
    productAlertEmails: initialUser.productAlertEmails,
    postPurchaseEmails: initialUser.postPurchaseEmails,
  });
  const [preferencesMessage, setPreferencesMessage] = useState<string | null>(null);
  const [deletionPassword, setDeletionPassword] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [fitPreferences, setFitPreferences] = useState({
    preferredSize: initialUser.preferredSize ?? "",
    fitPreference: initialUser.fitPreference ?? "TRUE_TO_SIZE",
    compressionPreference: initialUser.compressionPreference ?? "MEDIUM",
  });
  const [fitMessage, setFitMessage] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [sessionsMessage, setSessionsMessage] = useState<string | null>(null);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editingAddress, setEditingAddress] = useState<Address>(emptyAddress);
  const [addressMessage, setAddressMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const wishlist = useStore((state) => state.wishlist);
  const wishlistIntents = useStore((state) => state.wishlistIntents);
  const setWishlist = useStore((state) => state.setWishlist);
  const [wishlistMessage, setWishlistMessage] = useState<string | null>(null);
  const wishlistReady = useRef(false);
  const previousWishlistKey = useRef("");
  const activeOrder = useMemo(
    () => initialOrders.find((order) => !["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status.toUpperCase())),
    [initialOrders],
  );
  const wishlistProducts = useMemo(
    () => catalogProducts.filter((product) => wishlist.includes(product.slug)),
    [catalogProducts, wishlist],
  );

  useEffect(() => {
    if (section !== "overview" && section !== "wishlist") return;
    const mergeWishlist = () => {
      const localWishlist = useStore.getState().wishlist;
      const localIntents = useStore.getState().wishlistIntents;
      const merged = Array.from(new Set([...initialWishlistSlugs, ...localWishlist]));
      const mergedIntents = { ...initialWishlistIntents, ...localIntents };
      const key = createWishlistKey(merged, mergedIntents);
      previousWishlistKey.current = key;
      setWishlist(merged, mergedIntents);
      wishlistReady.current = true;

      if (key !== createWishlistKey(initialWishlistSlugs, initialWishlistIntents)) {
        void fetch("/api/account/wishlist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: createWishlistPayload(merged, mergedIntents) }),
        })
          .then((response) => response.json())
          .then((result) => {
            if (Array.isArray(result.slugs)) {
              const intents = mapWishlistIntents(result.items);
              previousWishlistKey.current = createWishlistKey(result.slugs, intents);
              setWishlist(result.slugs, intents);
            }
          })
          .catch(() => undefined);
      }
    };

    const persistApi = useStore.persist;
    if (!persistApi || persistApi.hasHydrated()) {
      mergeWishlist();
      return;
    }

    return persistApi.onFinishHydration(mergeWishlist);
  }, [initialWishlistIntents, initialWishlistSlugs, section, setWishlist]);

  useEffect(() => {
    if (section !== "overview" && section !== "wishlist") return;
    if (!wishlistReady.current) return;
    const key = createWishlistKey(wishlist, wishlistIntents);
    if (key === previousWishlistKey.current) return;

    const timeout = window.setTimeout(() => {
      setWishlistMessage(copy.savingWishlist);
      void fetch("/api/account/wishlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: createWishlistPayload(wishlist, wishlistIntents) }),
      })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.message ?? copy.unableToSaveWishlist);
          const intents = mapWishlistIntents(result.items);
          previousWishlistKey.current = createWishlistKey(result.slugs, intents);
          setWishlist(result.slugs, intents);
          setWishlistMessage(copy.wishlistSaved);
        })
        .catch((error) => {
          setWishlistMessage(error instanceof Error ? error.message : copy.unableToSaveWishlist);
        });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [setWishlist, wishlist, wishlistIntents, copy, section]);

  useEffect(() => {
    if (section !== "settings") return;
    let cancelled = false;
    void fetch("/api/account/sessions", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? copy.unableToLoadDevices);
        if (!cancelled) setSessions(Array.isArray(result.sessions) ? result.sessions : []);
      })
      .catch((error) => {
        if (!cancelled) setSessionsMessage(error instanceof Error ? error.message : copy.unableToLoadDevices);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.unableToLoadDevices, section]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("profile");
    setProfileMessage(null);
    const response = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setProfileMessage(response.ok ? copy.profileUpdated : copy.unableToUpdateProfile);
    setPendingAction(null);
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("preferences");
    setPreferencesMessage(copy.savingPreferences);
    const response = await fetch("/api/account/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    });
    const result = await response.json();
    if (!response.ok) {
      setPreferencesMessage(result.message ?? copy.unableToSavePreferences);
      setPendingAction(null);
      return;
    }
    setPreferences(result.preferences);
    const integrationFailed = Array.isArray(result.integrations)
      && result.integrations.some((integration: { status?: string }) => integration.status === "FAILED");
    setPreferencesMessage(
      integrationFailed
        ? copy.preferencesSavedIntegrationFailed
        : copy.communicationPreferencesSaved,
    );
    setPendingAction(null);
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("fit");
    setDeletingAccount(true);
    setPrivacyMessage(null);
    const response = await fetch("/api/account/privacy/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletionPassword, confirmation: deletionConfirmation }),
    });
    const result = await response.json();
    if (!response.ok) {
      setPrivacyMessage(result.message ?? copy.unableToDeleteAccount);
      setDeletingAccount(false);
      return;
    }
    await signOut({ redirect: false });
    window.location.assign("/");
  }

  async function saveFitPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFitMessage(copy.savingFitPreferences);
    const response = await fetch("/api/account/fit-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferredSize: fitPreferences.preferredSize.trim() || null,
        fitPreference: fitPreferences.fitPreference || null,
        compressionPreference: fitPreferences.compressionPreference || null,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setFitMessage(result.message ?? copy.unableToSaveFitPreferences);
      setPendingAction(null);
      return;
    }
    setFitPreferences({
      preferredSize: result.preferences.preferredSize ?? "",
      fitPreference: result.preferences.fitPreference ?? "TRUE_TO_SIZE",
      compressionPreference: result.preferences.compressionPreference ?? "MEDIUM",
    });
    setFitMessage(copy.fitPreferencesSaved);
    setPendingAction(null);
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("address");
    setAddressMessage(null);
    const payload = {
      name: editingAddress.name,
      phone: editingAddress.phone,
      line1: editingAddress.line1,
      line2: editingAddress.line2 || undefined,
      city: editingAddress.city,
      postalCode: editingAddress.postalCode || undefined,
    };
    const isExisting = Boolean(editingAddress.id);
    const response = await fetch(
      isExisting ? `/api/account/addresses/${editingAddress.id}` : "/api/account/addresses",
      {
        method: isExisting ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      setAddressMessage(result.message ?? copy.unableToSaveAddress);
      setPendingAction(null);
      return;
    }
    setAddresses((current) =>
      isExisting
        ? current.map((address) => (address.id === result.address.id ? result.address : address))
        : [result.address, ...current],
    );
    setEditingAddress(emptyAddress);
    setAddressMessage(isExisting ? copy.addressUpdated : copy.addressAdded);
    setPendingAction(null);
  }

  async function deleteAddress(id: string) {
    if (!window.confirm(copy.confirmDeleteAddress)) return;
    const response = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (response.ok) {
      setAddresses((current) => current.filter((address) => address.id !== id));
      if (editingAddress.id === id) setEditingAddress(emptyAddress);
    }
  }

  async function revokeSession(sessionToken: string) {
    setSessionsMessage(null);
    const response = await fetch("/api/account/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken }),
    });
    const result = await response.json();
    if (!response.ok) {
      setSessionsMessage(result.message ?? copy.unableToRevokeDevice);
      return;
    }
    setSessions((current) =>
      current.map((item) =>
        item.sessionToken === sessionToken
          ? { ...item, revokedAt: result.revokedAt, revokedReason: "Customer revoked this device" }
          : item,
      ),
    );
    setSessionsMessage(copy.deviceRevoked);
    if (result.revokedCurrent) {
      await signOut({ callbackUrl: "/" });
    }
  }

  return (
    <div className="mt-6">
      <AccountNavigation section={section} />
      {section !== "settings" ? <div className="mt-6 space-y-6">
        {section === "overview" ? <><section aria-labelledby="account-next-title" className="card overflow-hidden bg-[var(--surface)]">
          <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.6fr)]">
            <div className="p-5 sm:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">
                {activeOrder ? copy.inProgress : copy.yourAccount}
              </p>
              <h2 id="account-next-title" className="display-md mt-3">
                {activeOrder ? `${copy.order} ${activeOrder.orderNumber}` : copy.allCaughtUp}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
                {activeOrder
                  ? `${readableStatus(activeOrder.fulfillmentStatus)} · ${activeOrder.itemCount} ${copy.items} · ${formatAed(activeOrder.total)}`
                  : initialOrders.length
                    ? copy.noActiveOrders
                    : copy.firstOrderHint}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {activeOrder ? (
                  <Link href={localizedPath(`/account/orders/${activeOrder.orderNumber}`, locale)} className="btn btn-primary">
                    {copy.viewOrder} <ArrowRight className="size-4 rtl:rotate-180" />
                  </Link>
                ) : (
                  <Link href={localizedPath("/shop", locale)} className="btn btn-primary">
                    {copy.shopNewArrivals} <ArrowRight className="size-4 rtl:rotate-180" />
                  </Link>
                )}
                <Link href={localizedPath("/account/wishlist", locale)} className="btn btn-secondary">
                  <Heart className="size-4" /> {copy.wishlist}
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-[var(--border)] md:grid-cols-1 md:border-l md:border-t-0">
              <Link href={localizedPath("/account/orders", locale)} className="group flex min-h-24 items-center justify-between gap-4 border-r border-[var(--border)] p-4 transition hover:bg-[var(--hover)] md:border-b md:border-r-0 sm:p-5 motion-reduce:transition-none">
                <span><span className="block text-2xl font-semibold">{initialOrders.length}</span><span className="mt-1 block text-xs text-[var(--muted)]">{copy.orders}</span></span>
                <ShoppingBag className="size-5 text-[var(--accent-text)] transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
              <Link href={localizedPath("/account/addresses", locale)} className="group flex min-h-24 items-center justify-between gap-4 p-4 transition hover:bg-[var(--hover)] sm:p-5 motion-reduce:transition-none">
                <span><span className="block text-2xl font-semibold">{addresses.length}</span><span className="mt-1 block text-xs text-[var(--muted)]">{copy.savedAddresses}</span></span>
                <MapPin className="size-5 text-[var(--accent-text)] transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            [copy.returns, String(initialReturns.length), localizedPath("/account/returns", locale), RotateCcw],
            [copy.wishlist, String(wishlist.length), localizedPath("/account/wishlist", locale), Heart],
            [copy.settings, initialUser.name ? copy.ready : copy.review, localizedPath("/account/settings", locale), UserRound],
          ].map(([label, value, href, Icon], index) => (
            <Link key={String(label)} href={String(href)} className={`group min-h-24 card p-4 transition hover:-translate-y-0.5 hover:border-[var(--foreground)]/30 hover:bg-[var(--hover)] motion-reduce:transition-none ${index === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase text-[var(--muted)]">{String(label)}</p>
                <Icon className="size-4 text-[var(--accent-text)]" />
              </div>
              <p className="mt-2 text-xl font-semibold sm:text-2xl">{String(value)}</p>
            </Link>
          ))}
        </div></> : null}

        {section === "orders" ? <section className="card">
          <div className="flex items-center gap-3 border-b border-[var(--border)] p-4 sm:p-5">
            <Truck className="size-5 text-[var(--accent-text)]" />
            <div>
              <h2 className="text-xl font-semibold">{copy.orderHistory}</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">{copy.orderHistorySubtitle}</p>
            </div>
          </div>
          {initialOrders.length ? (
            <div className="divide-y divide-[var(--border)]">
              {initialOrders.map((order) => (
                <details key={order.id} className="group">
                  <summary className="grid cursor-pointer grid-cols-[1fr_auto] gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:p-5">
                    <div>
                      <p className="font-semibold">{order.orderNumber}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium" }).format(new Date(order.createdAt))} / {order.itemCount} {copy.items}
                      </p>
                    </div>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusClass(order.status)}`}>
                      {readableStatus(order.status)}
                    </span>
                    <span className="col-span-2 font-semibold sm:col-span-1">{formatAed(order.total)}</span>
                  </summary>
                  <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-open:grid-rows-[1fr] motion-reduce:transition-none">
                    <div className="min-h-0 overflow-hidden px-4 sm:px-5">
                      <div className="space-y-3 border-t border-[var(--border)] pb-4 pt-4 sm:pb-5">
                        {order.items.map((item, index) => (
                          <div key={`${order.id}-${index}`} className="flex justify-between gap-4 text-sm">
                            <div>
                              <p>{item.title} × {item.quantity}</p>
                              <p className="text-xs text-[var(--muted)]">{item.color} / {item.size}</p>
                            </div>
                            <span>{formatAed(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="mt-4 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
                          <p>{copy.fulfillment}: {readableStatus(order.fulfillmentStatus)}</p>
                          <p>{copy.payment}: {getPaymentStatusLabel(order.paymentStatus, order.paymentProvider)}</p>
                          <p>{copy.tracking}: {order.trackingNo ?? copy.pending}</p>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <Link
                            href={localizedPath(`/account/orders/${order.orderNumber}`, locale)}
                            className="btn btn-secondary"
                          >
                            {copy.viewDetails}
                          </Link>
                          <a
                            href={`/api/account/orders/${order.orderNumber}/invoice`}
                            className="btn btn-secondary"
                          >
                            {copy.invoice}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="p-8 text-sm text-[var(--muted)]">
              {copy.noOrdersYet}
            </div>
          )}
        </section> : null}

        {section === "returns" ? <section className="card">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <RotateCcw className="size-5 text-[var(--accent-text)]" />
              <div>
                <h2 className="text-xl font-semibold">{copy.returnsAndExchanges}</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">{copy.returnsSubtitle}</p>
              </div>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{initialReturns.length} {copy.requests}</span>
          </div>

          {initialReturns.length ? (
            <div className="divide-y divide-[var(--border)]">
              {initialReturns.map((request) => {
                const progress = returnProgress(request.status, request.resolution, copy);
                return (
                  <article key={request.id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-text)]">{readableStatus(request.resolution)}</p>
                        <h3 className="mt-1 font-semibold">{copy.order} {request.orderNumber}</h3>
                        <p className="mt-1 text-xs text-[var(--muted)]">{request.reason} / {copy.submitted} {new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium" }).format(new Date(request.createdAt))}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${request.status === "REJECTED" ? "bg-red-500/10 text-[var(--sale)] ring-1 ring-red-500/20" : "bg-[var(--hover)] text-[var(--foreground)] ring-1 ring-[var(--border)]"}`}>
                        {readableStatus(request.status)}
                      </span>
                    </div>

                    <ol className="mt-5 grid grid-cols-[repeat(var(--steps),minmax(76px,1fr))] overflow-x-auto pb-2" style={{ "--steps": progress.length } as CSSProperties} aria-label={copy.requestProgress}>
                      {progress.map((step, index) => (
                        <li key={step.label} className="relative min-w-[76px] text-center">
                          {index > 0 ? <span className={`absolute start-0 end-1/2 top-2 h-px ${step.complete ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} /> : null}
                          {index < progress.length - 1 ? <span className={`absolute start-1/2 end-0 top-2 h-px ${progress[index + 1]?.complete ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} /> : null}
                          <span className={`relative mx-auto block size-4 rounded-full border-2 ${step.rejected ? "border-red-600 bg-red-600" : step.complete ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface)]"}`} />
                          <span className={`mt-2 block text-[10px] font-semibold uppercase tracking-[0.05em] ${step.rejected ? "text-[var(--sale)]" : step.complete ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>{step.label}</span>
                        </li>
                      ))}
                    </ol>

                    <div className="mt-4 grid gap-2 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
                      {request.items.map((item, index) => (
                        <div key={`${request.id}-${index}`} className="text-sm">
                          <p className="font-medium">{item.title} × {item.quantity}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {item.color} / {item.originalSize}{item.requestedSize ? ` -> ${item.requestedSize}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Link href={localizedPath(`/account/orders/${request.orderNumber}/return`, locale)} className="btn btn-secondary mt-5">
                      {copy.viewRequest}
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-3 p-8 text-sm text-[var(--muted)] sm:grid-cols-[auto_1fr] sm:items-center">
              <ClipboardList className="size-6 text-[var(--accent-text)]" />
              <p>{copy.noReturnsYet}</p>
            </div>
          )}
        </section> : null}

        {section === "wishlist" ? <section className="card">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <Heart className="size-5 text-[var(--accent-text)]" />
              <div>
                <h2 className="text-xl font-semibold">{copy.wishlist}</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {wishlistProducts.length ? `${wishlistProducts.length} ${copy.savedPieces}` : copy.savedPiecesEmpty}
                </p>
              </div>
            </div>
            {wishlistMessage ? <p className="text-xs text-[var(--muted)]" role="status">{wishlistMessage}</p> : null}
          </div>
          {wishlistProducts.length ? (
            <div className="grid gap-x-5 gap-y-8 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
              {wishlistProducts.map((product) => (
                <WishlistProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-sm text-[var(--muted)]">
              {copy.wishlistEmptyBody}
            </div>
          )}
        </section> : null}

        {section === "addresses" ? <section className="card">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-[var(--accent-text)]" />
              <h2 className="text-xl font-semibold">{copy.savedAddresses}</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingAddress(emptyAddress);
                setAddressMessage(null);
                requestAnimationFrame(() => document.querySelector<HTMLInputElement>("#account-address-name")?.focus());
              }}
              className="btn btn-secondary"
            >
              <Plus className="size-4" />
              {copy.newAddress}
            </button>
          </div>
          <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              {addresses.length ? addresses.map((address) => (
                <article key={address.id} className="border border-[var(--border)] p-4 text-sm">
                  <p className="font-semibold">{address.name}</p>
                  <p className="mt-2 leading-6 text-[var(--muted)]">
                    {address.line1}{address.line2 ? <><br />{address.line2}</> : null}<br />
                    {address.city}, {address.country}<br />
                    {address.phone}
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button type="button" onClick={() => setEditingAddress(address)} className="storefront-action flex h-8 items-center gap-1 border border-[var(--border)] px-2 text-xs font-semibold transition hover:border-[var(--foreground)] hover:bg-[var(--hover)] motion-reduce:transition-none">
                      <Pencil className="size-3.5" /> {copy.edit}
                    </button>
                    <button type="button" onClick={() => void deleteAddress(address.id)} className="storefront-action flex h-8 items-center gap-1 border border-red-500/30 px-2 text-xs font-semibold text-[var(--sale)] transition hover:bg-red-500/10 motion-reduce:transition-none">
                      <Trash2 className="size-3.5" /> {copy.delete}
                    </button>
                  </div>
                </article>
              )) : (
                <p className="text-sm text-[var(--muted)]">{copy.noSavedAddresses}</p>
              )}
            </div>
            <form onSubmit={(event) => void saveAddress(event)} className="grid gap-3" aria-labelledby="address-form-title">
              <div className="flex items-center justify-between gap-3">
                <h3 id="address-form-title" className="font-semibold">{editingAddress.id ? copy.editingAddress : copy.addAddress}</h3>
                {editingAddress.id ? (
                  <button type="button" onClick={() => { setEditingAddress(emptyAddress); setAddressMessage(null); }} className="storefront-action min-h-10 px-2 text-xs font-semibold underline underline-offset-4">
                    {copy.cancel}
                  </button>
                ) : null}
              </div>
              {[
                ["name", copy.fullName, "name"],
                ["phone", copy.uaeMobile, "tel"],
                ["line1", copy.streetAddress, "address-line1"],
                ["line2", copy.apartmentVilla, "address-line2"],
                ["city", copy.cityArea, "address-level2"],
              ].map(([key, label, autoComplete]) => (
                <label key={key} className="grid gap-1.5 text-sm font-medium">
                  {label}
                  <input
                    id={key === "name" ? "account-address-name" : undefined}
                    type={key === "phone" ? "tel" : "text"}
                    inputMode={key === "phone" ? "tel" : undefined}
                    autoComplete={autoComplete}
                    required={!["line2"].includes(key)}
                    value={String(editingAddress[key as keyof Address] ?? "")}
                    onChange={(event) =>
                      setEditingAddress((current) => ({ ...current, [key]: event.target.value }))
                    }
                    className={formFieldClass}
                  />
                </label>
              ))}
              {addressMessage ? <p className="text-xs text-[var(--muted)]" role="status">{addressMessage}</p> : null}
              <button disabled={pendingAction === "address"} className="btn btn-primary">
                {editingAddress.id ? copy.updateAddress : copy.saveAddress}
              </button>
            </form>
          </div>
        </section> : null}
      </div>
      : null}

      {section === "settings" ? <aside className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <UserRound className="size-5 text-[var(--accent-text)]" />
          <h2 className="mt-4 text-xl font-semibold">{copy.profile}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{initialUser.email}</p>
          <form onSubmit={(event) => void saveProfile(event)} className="mt-5 grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              {copy.displayName}
              <input
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={formFieldClass}
              />
            </label>
            {profileMessage ? <p className="text-xs text-[var(--muted)]" role="status">{profileMessage}</p> : null}
            <button disabled={pendingAction === "profile"} className={`${secondaryActionClass} disabled:cursor-wait disabled:opacity-60`}>
              {copy.saveProfile}
            </button>
          </form>
        </section>
        <section className="card p-4 sm:p-5">
          <h2 className="text-xl font-semibold">{copy.communication}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy.communicationBody}</p>
          <form onSubmit={(event) => void savePreferences(event)} className="mt-5 grid gap-4">
            {[
              ["marketingEmails", copy.newsAndOffers, copy.newsAndOffersBody],
              ["productAlertEmails", copy.productAlerts, copy.productAlertsBody],
              ["postPurchaseEmails", copy.postPurchaseFollowUp, copy.postPurchaseFollowUpBody],
            ].map(([key, label, description]) => (
              <label key={key} className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences[key as keyof typeof preferences]}
                  onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))}
                  className="mt-1 size-4 accent-[var(--accent)]"
                />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span>
                </span>
              </label>
            ))}
            {preferencesMessage ? <p role="status" className="text-xs text-[var(--muted)]">{preferencesMessage}</p> : null}
            <button disabled={pendingAction === "preferences"} className={`${secondaryActionClass} disabled:cursor-wait disabled:opacity-60`}>{copy.savePreferences}</button>
          </form>
        </section>
        <section className="card p-4 sm:p-5">
          <h2 className="text-xl font-semibold">{copy.fitPreferencesTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy.fitPreferencesBody}</p>
          <form onSubmit={(event) => void saveFitPreferences(event)} className="mt-5 grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">{copy.preferredSize}
              <input value={fitPreferences.preferredSize} onChange={(event) => setFitPreferences((current) => ({ ...current, preferredSize: event.target.value }))} placeholder="e.g. M, XL, One Size" className={formFieldClass} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">{copy.preferredFit}
              <select value={fitPreferences.fitPreference} onChange={(event) => setFitPreferences((current) => ({ ...current, fitPreference: event.target.value }))} className={formFieldClass}>
                <option value="TRUE_TO_SIZE">{copy.trueToSize}</option><option value="FITTED">{copy.closeFit}</option><option value="RELAXED">{copy.relaxedFit}</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">{copy.compression}
              <select value={fitPreferences.compressionPreference} onChange={(event) => setFitPreferences((current) => ({ ...current, compressionPreference: event.target.value }))} className={formFieldClass}>
                <option value="LOW">{copy.low}</option><option value="MEDIUM">{copy.medium}</option><option value="HIGH">{copy.high}</option>
              </select>
            </label>
            {fitMessage ? <p role="status" className="text-xs leading-5 text-[var(--muted)]">{fitMessage}</p> : null}
            <button disabled={pendingAction === "fit"} className={`${secondaryActionClass} disabled:cursor-wait disabled:opacity-60`}>{copy.saveFitPreferences}</button>
          </form>
        </section>
        <section className="card p-4 sm:p-5">
          <ShieldAlert className="size-5 text-[var(--accent-text)]" />
          <h2 className="mt-4 text-xl font-semibold">{copy.privacyAndAccount}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy.privacyAndAccountBody}</p>
          <div className="mt-5 border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="flex items-center gap-2">
              <MonitorSmartphone className="size-4 text-[var(--accent-text)]" />
              <h3 className="text-sm font-semibold">{copy.devices}</h3>
            </div>
            <div className="mt-3 space-y-3">
              {sessions.length ? sessions.map((item) => (
                <div key={item.sessionToken} className="border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {item.deviceLabel}{item.current ? ` / ${copy.thisDevice}` : ""}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        {copy.lastActive} {new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.lastSeenAt))}
                        {item.ipAddress ? ` / ${item.ipAddress}` : ""}
                      </p>
                      {item.revokedAt ? <p className="mt-1 text-xs text-[var(--sale)]">{copy.revoked} {new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium" }).format(new Date(item.revokedAt))}</p> : null}
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(item.revokedAt)}
                      onClick={() => void revokeSession(item.sessionToken)}
                      className="storefront-action h-8 shrink-0 border border-red-500/30 px-2 text-xs font-semibold uppercase text-[var(--sale)] transition hover:bg-red-500/10 disabled:border-[var(--border)] disabled:text-[var(--muted)] disabled:no-underline motion-reduce:transition-none"
                    >
                      {copy.revoke}
                    </button>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-[var(--muted)]">{copy.noDeviceActivity}</p>
              )}
            </div>
            {sessionsMessage ? <p className="mt-3 text-xs text-[var(--muted)]" role="status">{sessionsMessage}</p> : null}
          </div>
          <a href="/api/account/privacy/export" className="btn btn-secondary mt-5">
            <Download className="size-4" />
            {copy.downloadMyData}
          </a>
          {initialUser.hasPassword ? <details className="group mt-5 border-t border-[var(--border)] pt-5">
            <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--sale)]">{copy.deleteAccount}</summary>
            <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-open:grid-rows-[1fr] motion-reduce:transition-none">
              <div className="min-h-0 overflow-hidden">
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{copy.deleteAccountWarning}</p>
                <form onSubmit={(event) => void deleteAccount(event)} className="mt-4 grid gap-3">
                  <label className="grid gap-1.5 text-sm font-medium">
                    {copy.currentPassword}
                    <input required type="password" autoComplete="current-password" value={deletionPassword} onChange={(event) => setDeletionPassword(event.target.value)} className={`${formFieldClass} focus:border-red-600`} />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    {copy.typeToConfirm}
                    <input required value={deletionConfirmation} onChange={(event) => setDeletionConfirmation(event.target.value)} className={`${formFieldClass} focus:border-red-600`} />
                  </label>
                  {privacyMessage ? <p role="alert" className="text-xs text-[var(--sale)]">{privacyMessage}</p> : null}
                  <button disabled={deletingAccount || deletionConfirmation !== "DELETE"} className="storefront-action h-11 bg-red-700 text-sm font-semibold text-[var(--paper)] transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none">
                    {deletingAccount ? copy.deletingAccount : copy.permanentlyDeleteAccount}
                  </button>
                </form>
              </div>
            </div>
          </details> : (
            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <p className="text-sm font-semibold text-[var(--sale)]">{copy.deleteAccount}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{copy.socialDeletionHelp}</p>
              <Link href={localizedPath("/contact", locale)} className="storefront-action mt-3 inline-flex min-h-10 items-center text-sm font-semibold underline underline-offset-4 hover:text-[var(--accent-text)]">
                {copy.contactSupport}
              </Link>
            </div>
          )}
        </section>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="storefront-action flex h-11 w-full items-center justify-center gap-2 border border-[var(--border)] text-sm font-medium transition hover:border-[var(--foreground)] hover:bg-[var(--hover)] lg:col-span-2 motion-reduce:transition-none"
        >
          <LogOut className="size-4" />
          {copy.signOut}
        </button>
      </aside> : null}
    </div>
  );
}
