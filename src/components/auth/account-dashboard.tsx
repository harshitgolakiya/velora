"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ClipboardList, Download, Heart, LogOut, MapPin, MonitorSmartphone, PackageCheck, Pencil, Plus, RotateCcw, ShieldAlert, Trash2, UserRound } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { accountCopy, localeFromPathname } from "@/lib/i18n";
import { useStore, type WishlistIntent } from "@/lib/store";
import { getPaymentStatusLabel } from "@/lib/payment-display";
import { formatAed } from "@/lib/utils";
import { WishlistProductCard } from "@/components/auth/wishlist-product-card";

type Address = {
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

type AccountOrder = {
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

type AccountReturn = {
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

type AccountUser = {
  name?: string | null;
  email: string;
  createdAt: string;
  marketingEmails: boolean;
  productAlertEmails: boolean;
  postPurchaseEmails: boolean;
  preferredSize?: string | null;
  fitPreference?: string | null;
  compressionPreference?: string | null;
};

type AccountSession = {
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
  if (["paid", "delivered", "shipped"].includes(normalized)) return "bg-emerald-500/10 text-emerald-700";
  if (["cancelled", "refunded"].includes(normalized)) return "bg-red-500/10 text-red-700";
  return "bg-[var(--hover)] text-[var(--muted)]";
}

function readableStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const formFieldClass = "h-11 border border-[var(--border)] bg-[var(--background)] px-3 outline-none transition focus:border-[var(--accent)] motion-reduce:transition-none";
const secondaryActionClass = "h-11 border border-[var(--border)] text-sm font-semibold transition hover:border-[var(--foreground)] motion-reduce:transition-none";

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
  initialUser,
  initialAddresses,
  initialOrders,
  initialReturns,
  initialWishlistSlugs,
  initialWishlistIntents,
  catalogProducts,
}: {
  initialUser: AccountUser;
  initialAddresses: Address[];
  initialOrders: AccountOrder[];
  initialReturns: AccountReturn[];
  initialWishlistSlugs: string[];
  initialWishlistIntents: Record<string, { variantId?: string; color?: string; size?: string }>;
  catalogProducts: Product[];
}) {
  const pathname = usePathname();
  const copy = accountCopy[localeFromPathname(pathname)];
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
  const wishlist = useStore((state) => state.wishlist);
  const wishlistIntents = useStore((state) => state.wishlistIntents);
  const setWishlist = useStore((state) => state.setWishlist);
  const [wishlistMessage, setWishlistMessage] = useState<string | null>(null);
  const wishlistReady = useRef(false);
  const previousWishlistKey = useRef("");
  const totalSpend = useMemo(
    () => initialOrders.reduce((sum, order) => sum + order.total, 0),
    [initialOrders],
  );
  const wishlistProducts = useMemo(
    () => catalogProducts.filter((product) => wishlist.includes(product.slug)),
    [catalogProducts, wishlist],
  );
  const sectionLinks = [
    { label: copy.overview, href: "#overview", Icon: UserRound },
    { label: copy.orders, href: "#orders", Icon: PackageCheck },
    { label: copy.returns, href: "#returns", Icon: RotateCcw },
    { label: copy.wishlist, href: "#wishlist", Icon: Heart },
    { label: copy.addresses, href: "#addresses", Icon: MapPin },
    { label: copy.settings, href: "#settings", Icon: ShieldAlert },
  ];

  useEffect(() => {
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
  }, [initialWishlistIntents, initialWishlistSlugs, setWishlist]);

  useEffect(() => {
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
  }, [setWishlist, wishlist, wishlistIntents, copy]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/sessions", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Unable to load devices");
        if (!cancelled) setSessions(Array.isArray(result.sessions) ? result.sessions : []);
      })
      .catch((error) => {
        if (!cancelled) setSessionsMessage(error instanceof Error ? error.message : "Unable to load devices");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage(null);
    const response = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setProfileMessage(response.ok ? copy.profileUpdated : copy.unableToUpdateProfile);
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreferencesMessage(copy.savingPreferences);
    const response = await fetch("/api/account/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    });
    const result = await response.json();
    if (!response.ok) {
      setPreferencesMessage(result.message ?? copy.unableToSavePreferences);
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
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      return;
    }
    setFitPreferences({
      preferredSize: result.preferences.preferredSize ?? "",
      fitPreference: result.preferences.fitPreference ?? "TRUE_TO_SIZE",
      compressionPreference: result.preferences.compressionPreference ?? "MEDIUM",
    });
    setFitMessage(copy.fitPreferencesSaved);
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      return;
    }
    setAddresses((current) =>
      isExisting
        ? current.map((address) => (address.id === result.address.id ? result.address : address))
        : [result.address, ...current],
    );
    setEditingAddress(emptyAddress);
    setAddressMessage(isExisting ? copy.addressUpdated : copy.addressAdded);
  }

  async function deleteAddress(id: string) {
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
      setSessionsMessage(result.message ?? "Unable to revoke device");
      return;
    }
    setSessions((current) =>
      current.map((item) =>
        item.sessionToken === sessionToken
          ? { ...item, revokedAt: result.revokedAt, revokedReason: "Customer revoked this device" }
          : item,
      ),
    );
    setSessionsMessage("Device access revoked");
    if (result.revokedCurrent) {
      await signOut({ callbackUrl: "/" });
    }
  }

  return (
    <div id="overview" className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <nav aria-label={copy.accountSections} className="sticky top-16 z-20 -mx-4 border-y border-[var(--border)] bg-[var(--background)] p-3 sm:-mx-6 sm:px-6 md:static md:col-span-2 md:mx-0 md:border md:bg-[var(--surface)] md:p-0">
        <select
          aria-label={copy.accountSections}
          defaultValue="#overview"
          onChange={(event) => {
            const target = document.querySelector(event.currentTarget.value);
            target?.scrollIntoView({ block: "start", behavior: "smooth" });
            window.history.replaceState(null, "", event.currentTarget.value);
          }}
          className="h-11 w-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold outline-none md:hidden"
        >
          {sectionLinks.map((item) => (
            <option key={item.href} value={item.href}>{item.label}</option>
          ))}
        </select>
        <div className="hidden md:grid md:grid-cols-6">
          {sectionLinks.map(({ label, href, Icon }) => (
            <a key={href} href={href} className="inline-flex h-12 items-center justify-center gap-2 border-b-2 border-transparent px-3 text-xs font-semibold uppercase text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)] motion-reduce:transition-none">
              <Icon className="size-4" />
              <span>{label}</span>
            </a>
          ))}
        </div>
      </nav>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            [copy.orders, String(initialOrders.length)],
            [copy.returns, String(initialReturns.length)],
            [copy.lifetimeValue, formatAed(totalSpend)],
            [copy.savedAddresses, String(addresses.length)],
            [copy.wishlist, String(wishlist.length)],
          ].map(([label, value]) => (
            <section key={label} className="min-h-24 border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-[11px] font-semibold uppercase text-[var(--muted)]">{label}</p>
              <p className="mt-2 text-xl font-semibold sm:text-2xl">{value}</p>
            </section>
          ))}
        </div>

        <section id="orders" className="scroll-mt-16 border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3 border-b border-[var(--border)] p-4 sm:p-5">
            <PackageCheck className="size-5 text-[var(--accent)]" />
            <h2 className="text-xl font-semibold">{copy.orderHistory}</h2>
          </div>
          {initialOrders.length ? (
            <div className="divide-y divide-[var(--border)]">
              {initialOrders.map((order) => (
                <details key={order.id} className="group">
                  <summary className="grid cursor-pointer grid-cols-[1fr_auto] gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:p-5">
                    <div>
                      <p className="font-semibold">{order.orderNumber}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(order.createdAt))} / {order.itemCount} {copy.items}
                      </p>
                    </div>
                    <span className={`w-fit px-2.5 py-1 text-xs font-semibold uppercase ${statusClass(order.paymentStatus)}`}>
                      {getPaymentStatusLabel(order.paymentStatus, order.paymentProvider)}
                    </span>
                    <span className="col-span-2 font-semibold sm:col-span-1">{formatAed(order.total)}</span>
                  </summary>
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                    <div className="space-y-3 border-t border-[var(--border)] pt-4">
                      {order.items.map((item, index) => (
                        <div key={`${order.id}-${index}`} className="flex justify-between gap-4 text-sm">
                          <div>
                            <p>{item.title} × {item.quantity}</p>
                            <p className="text-xs text-[var(--muted)]">{item.color} / {item.size}</p>
                          </div>
                          <span>{formatAed(item.unitPrice * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
                      <p>{copy.fulfillment}: {order.fulfillmentStatus}</p>
                      <p>{copy.tracking}: {order.trackingNo ?? copy.pending}</p>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/account/orders/${order.orderNumber}`}
                        className="inline-flex h-10 items-center border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--foreground)]"
                      >
                        {copy.viewDetails}
                      </Link>
                      <a
                        href={`/api/account/orders/${order.orderNumber}/invoice`}
                        className="inline-flex h-10 items-center border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--foreground)]"
                      >
                        {copy.invoice}
                      </a>
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
        </section>

        <section id="returns" className="scroll-mt-16 border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <RotateCcw className="size-5 text-[var(--accent)]" />
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
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{readableStatus(request.resolution)}</p>
                        <h3 className="mt-1 font-semibold">{copy.order} {request.orderNumber}</h3>
                        <p className="mt-1 text-xs text-[var(--muted)]">{request.reason} / {copy.submitted} {new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(request.createdAt))}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-semibold uppercase ${request.status === "REJECTED" ? "bg-red-500/10 text-red-700" : "bg-[var(--hover)] text-[var(--foreground)]"}`}>
                        {readableStatus(request.status)}
                      </span>
                    </div>

                    <ol className="mt-5 grid grid-cols-[repeat(var(--steps),minmax(76px,1fr))] overflow-x-auto pb-2" style={{ "--steps": progress.length } as CSSProperties} aria-label={copy.requestProgress}>
                      {progress.map((step, index) => (
                        <li key={step.label} className="relative min-w-[76px] text-center">
                          {index > 0 ? <span className={`absolute start-0 end-1/2 top-2 h-px ${step.complete ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} /> : null}
                          {index < progress.length - 1 ? <span className={`absolute start-1/2 end-0 top-2 h-px ${progress[index + 1]?.complete ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} /> : null}
                          <span className={`relative mx-auto block size-4 border-2 ${step.rejected ? "border-red-600 bg-red-600" : step.complete ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface)]"}`} />
                          <span className={`mt-2 block text-[10px] font-semibold uppercase tracking-[0.05em] ${step.rejected ? "text-red-700" : step.complete ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>{step.label}</span>
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

                    <Link href={`/account/orders/${request.orderNumber}/return`} className="mt-5 inline-flex h-10 items-center border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.1em] transition hover:border-[var(--foreground)] motion-reduce:transition-none">
                      {copy.viewRequest}
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-3 p-8 text-sm text-[var(--muted)] sm:grid-cols-[auto_1fr] sm:items-center">
              <ClipboardList className="size-6 text-[var(--accent)]" />
              <p>{copy.noReturnsYet}</p>
            </div>
          )}
        </section>

        <section id="wishlist" className="scroll-mt-28 border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <Heart className="size-5 text-[var(--accent)]" />
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
        </section>

        <section id="addresses" className="scroll-mt-16 border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-[var(--accent)]" />
              <h2 className="text-xl font-semibold">{copy.savedAddresses}</h2>
            </div>
            <button
              type="button"
              onClick={() => setEditingAddress(emptyAddress)}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em]"
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
                    <button type="button" onClick={() => setEditingAddress(address)} className="flex items-center gap-1 text-xs font-semibold underline">
                      <Pencil className="size-3.5" /> {copy.edit}
                    </button>
                    <button type="button" onClick={() => void deleteAddress(address.id)} className="flex items-center gap-1 text-xs font-semibold text-red-600 underline">
                      <Trash2 className="size-3.5" /> {copy.delete}
                    </button>
                  </div>
                </article>
              )) : (
                <p className="text-sm text-[var(--muted)]">{copy.noSavedAddresses}</p>
              )}
            </div>
            <form onSubmit={(event) => void saveAddress(event)} className="grid gap-3">
              {[
                ["name", copy.fullName],
                ["phone", copy.uaeMobile],
                ["line1", copy.streetAddress],
                ["line2", copy.apartmentVilla],
                ["city", copy.cityArea],
              ].map(([key, label]) => (
                <label key={key} className="grid gap-1.5 text-sm font-medium">
                  {label}
                  <input
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
              <button className="h-11 bg-[var(--foreground)] text-sm font-semibold uppercase tracking-[0.12em] text-[var(--background)] transition hover:bg-[var(--accent)] hover:text-stone-950 motion-reduce:transition-none">
                {editingAddress.id ? copy.updateAddress : copy.saveAddress}
              </button>
            </form>
          </div>
        </section>
      </div>

      <aside id="settings" className="scroll-mt-16 space-y-4 lg:space-y-5">
        <section className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <UserRound className="size-5 text-[var(--accent)]" />
          <h2 className="mt-4 text-xl font-semibold">{copy.profile}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{initialUser.email}</p>
          <form onSubmit={(event) => void saveProfile(event)} className="mt-5 grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              {copy.displayName}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={formFieldClass}
              />
            </label>
            {profileMessage ? <p className="text-xs text-[var(--muted)]" role="status">{profileMessage}</p> : null}
            <button className={secondaryActionClass}>
              {copy.saveProfile}
            </button>
          </form>
        </section>
        <section className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
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
            <button className={secondaryActionClass}>{copy.savePreferences}</button>
          </form>
        </section>
        <section className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
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
            <button className={secondaryActionClass}>{copy.saveFitPreferences}</button>
          </form>
        </section>
        <section className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <ShieldAlert className="size-5 text-[var(--accent)]" />
          <h2 className="mt-4 text-xl font-semibold">{copy.privacyAndAccount}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy.privacyAndAccountBody}</p>
          <div className="mt-5 border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="flex items-center gap-2">
              <MonitorSmartphone className="size-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Devices</h3>
            </div>
            <div className="mt-3 space-y-3">
              {sessions.length ? sessions.map((item) => (
                <div key={item.sessionToken} className="border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {item.deviceLabel}{item.current ? " / This device" : ""}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        Last active {new Intl.DateTimeFormat("en-AE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.lastSeenAt))}
                        {item.ipAddress ? ` / ${item.ipAddress}` : ""}
                      </p>
                      {item.revokedAt ? <p className="mt-1 text-xs text-red-600">Revoked {new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(item.revokedAt))}</p> : null}
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(item.revokedAt)}
                      onClick={() => void revokeSession(item.sessionToken)}
                      className="shrink-0 text-xs font-semibold uppercase text-red-600 underline disabled:text-[var(--muted)] disabled:no-underline"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-[var(--muted)]">No device activity yet.</p>
              )}
            </div>
            {sessionsMessage ? <p className="mt-3 text-xs text-[var(--muted)]" role="status">{sessionsMessage}</p> : null}
          </div>
          <a href="/api/account/privacy/export" className="mt-5 flex h-11 items-center justify-center gap-2 border border-[var(--border)] text-sm font-semibold transition hover:border-[var(--foreground)] motion-reduce:transition-none">
            <Download className="size-4" />
            {copy.downloadMyData}
          </a>
          <details className="mt-5 border-t border-[var(--border)] pt-5">
            <summary className="cursor-pointer text-sm font-semibold text-red-700">{copy.deleteAccount}</summary>
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
              {privacyMessage ? <p role="alert" className="text-xs text-red-600">{privacyMessage}</p> : null}
              <button disabled={deletingAccount || deletionConfirmation !== "DELETE"} className="h-11 bg-red-700 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
                {deletingAccount ? copy.deletingAccount : copy.permanentlyDeleteAccount}
              </button>
            </form>
          </details>
        </section>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex h-11 w-full items-center justify-center gap-2 border border-[var(--border)] text-sm font-medium transition hover:border-[var(--foreground)] motion-reduce:transition-none"
        >
          <LogOut className="size-4" />
          {copy.signOut}
        </button>
      </aside>
    </div>
  );
}
