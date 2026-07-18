"use client";

import Image from "next/image";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Banknote,
  Check,
  CreditCard,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
  Truck,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { formatCartReservationError, getCartLineImage, isCartReservationExpired } from "@/lib/cart-ui";
import { cartCopy, checkoutCopy, localeFromPathname } from "@/lib/i18n";
import { cartSubtotal, useStore, useStoreHydrated } from "@/lib/store";
import { formatAed } from "@/lib/utils";
import { getShippingMethodsForEmirate, getShippingQuote } from "@/lib/shipping-settings";
import { getEnabledExpressCheckoutWallets, getEnabledPaymentMethods } from "@/lib/payment-method-settings";
import { clearStoredSearchAttribution, getStoredSearchAttribution } from "@/lib/search-click-client";
import { findAddressSuggestion, getAddressSuggestions } from "@/lib/address-autocomplete";

const emirates = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
] as const;

function createCheckoutSchema(copy: (typeof checkoutCopy)["en"]) {
  return z.object({
    email: z.email(copy.emailInvalid),
    firstName: z.string().trim().min(2, copy.firstNameRequired),
    lastName: z.string().trim().min(2, copy.lastNameRequired),
    phone: z.string().trim().transform((value) => value.replace(/[\s-]/g, "")).pipe(
      z.string().regex(
        /^(?:\+971|00971|0)?5\d{8}$/,
        copy.phoneInvalid,
      ),
    ),
    address: z.string().trim().min(8, copy.addressInvalid),
    addressLine2: z.string().trim().max(120).optional(),
    city: z.string().trim().min(2, copy.cityRequired),
    emirate: z.enum(emirates),
    shippingMethod: z.enum(["standard", "express"]),
    paymentMethod: z.enum(["stripe", "paypal", "tabby", "cash_on_delivery"]),
  });
}

type CheckoutValues = z.infer<ReturnType<typeof createCheckoutSchema>>;
type CheckoutSettings = {
  cashOnDeliveryEnabled: boolean;
  cashOnDeliveryLabel: string;
  cashOnDeliveryInstructions: string;
  addressAutocomplete: {
    provider: "LOCAL" | "GOOGLE_PLACES" | "MAPBOX";
    enabled: boolean;
    fallbackToLocal: boolean;
    apiKeyConfigured: boolean;
  };
  expressCheckout: {
    enabled: boolean;
    applePay: boolean;
    googlePay: boolean;
  };
  paymentMethods: Array<{
    id: "stripe" | "paypal" | "tabby" | "cash_on_delivery";
    enabled: boolean;
    label: string;
    description: string;
    sortOrder: number;
  }>;
  shippingZones: Array<{
    id: string;
    name: string;
    emirates: string[];
    methods: Array<{
      id: "standard" | "express";
      label: string;
      estimate: string;
      price: number;
      freeOver?: number | null;
      enabled: boolean;
    }>;
  }>;
};
type SavedAddress = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  country: string;
  postalCode?: string | null;
};

function Field({
  label,
  error,
  hint,
  htmlFor,
  errorId,
  hintId,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  errorId?: string;
  hintId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </label>
      {children}
      {error ? (
        <span id={errorId} className="flex items-center gap-1.5 text-xs text-red-500" role="alert">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="text-xs text-[var(--muted)]">{hint}</span>
      ) : null}
    </div>
  );
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em]">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function CheckoutForm({
  cancelled = false,
  checkoutSettings,
  customerEmail,
  savedAddresses = [],
}: {
  cancelled?: boolean;
  checkoutSettings: CheckoutSettings;
  customerEmail?: string;
  savedAddresses?: SavedAddress[];
}) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const copy = checkoutCopy[locale];
  const cartLabels = cartCopy[locale];
  const checkoutSchema = useMemo(() => createCheckoutSchema(copy), [copy]);
  const hydrated = useStoreHydrated();
  const cart = useStore((state) => state.cart);
  const sessionKey = useStore((state) => state.cartSessionKey);
  const reservationError = useStore((state) => state.cartReservationError);
  const expiresAt = useStore((state) => state.cartExpiresAt);
  const storeCoupon = useStore((state) => state.coupon);
  const customerNote = useStore((state) => state.customerNote);
  const subtotal = cartSubtotal(cart);

  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [freeShipping, setFreeShipping] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardMessage, setGiftCardMessage] = useState<string | null>(null);
  const [giftCardAmount, setGiftCardAmount] = useState(0);
  const [applyingGiftCard, setApplyingGiftCard] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutErrorCode, setCheckoutErrorCode] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Abandonment capture — store the email locally so we can show a
  // "Continue your checkout" hint if the user returns to the cart.
  const abandonmentSaved = useRef(false);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      addressLine2: "",
      city: "Dubai",
      emirate: "Dubai",
      shippingMethod: "standard",
      paymentMethod: "stripe",
    },
  });

  const shippingMethod = useWatch({ control: form.control, name: "shippingMethod" });
  const selectedEmirate = useWatch({ control: form.control, name: "emirate" });
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" });
  const emailValue = useWatch({ control: form.control, name: "email" });

  const availableShippingMethods = getShippingMethodsForEmirate(checkoutSettings, selectedEmirate);
  const useLocalAddressFallback =
    checkoutSettings.addressAutocomplete.enabled &&
    (checkoutSettings.addressAutocomplete.provider === "LOCAL" ||
      checkoutSettings.addressAutocomplete.fallbackToLocal ||
      !checkoutSettings.addressAutocomplete.apiKeyConfigured);
  const addressSuggestions = useLocalAddressFallback
    ? getAddressSuggestions(selectedEmirate)
    : [];
  const availablePaymentMethods = getEnabledPaymentMethods(checkoutSettings);
  const expressWallets = getEnabledExpressCheckoutWallets(checkoutSettings);
  const shippingQuote = getShippingQuote(checkoutSettings, {
    emirate: selectedEmirate,
    methodId: shippingMethod,
    subtotal,
    freeShipping,
  });
  const shipping = subtotal === 0 ? 0 : shippingQuote?.total ?? 0;
  const payableBeforeGiftCard = Math.max(0, subtotal - discount) + shipping;
  const appliedGiftCardAmount = Math.min(giftCardAmount, payableBeforeGiftCard);
  const total = Math.max(0, payableBeforeGiftCard - appliedGiftCardAmount);
  const reservationExpired = isCartReservationExpired(expiresAt);
  const checkoutBlocked = Boolean(reservationError || reservationExpired);
  const reservationErrorLabel = reservationError
    ? formatCartReservationError(reservationError, cartLabels)
    : null;
  const expressCheckoutDisabled = checkoutBlocked || submitting || form.formState.isSubmitting;

  const submitExpressCheckout = () => {
    form.setValue("paymentMethod", "stripe", { shouldDirty: true, shouldValidate: true });
    void form.handleSubmit(submitCheckout)();
  };

  // Sync coupon from cart store
  useEffect(() => {
    if (!storeCoupon) return;
    const timer = window.setTimeout(() => {
      setCouponCode(storeCoupon.code);
      setDiscount(storeCoupon.discount);
      setFreeShipping(storeCoupon.freeShipping);
      setCouponMessage(`${storeCoupon.code} ${copy.couponApplied}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storeCoupon, copy]);

  useEffect(() => {
    if (!customerEmail) return;
    form.setValue("email", customerEmail, { shouldValidate: true });
  }, [customerEmail, form]);

  useEffect(() => {
    if (availableShippingMethods.some((method) => method.id === shippingMethod)) return;
    const fallback = availableShippingMethods[0]?.id;
    if (fallback) {
      form.setValue("shippingMethod", fallback, { shouldDirty: true, shouldValidate: true });
    }
  }, [availableShippingMethods, form, shippingMethod]);

  useEffect(() => {
    if (availablePaymentMethods.some((method) => method.id === paymentMethod)) return;
    const fallback = availablePaymentMethods[0]?.id;
    if (fallback) {
      form.setValue("paymentMethod", fallback, { shouldDirty: true, shouldValidate: true });
    }
  }, [availablePaymentMethods, form, paymentMethod]);

  const applySavedAddress = (address: SavedAddress) => {
    const [firstName, ...lastNameParts] = address.name.trim().split(/\s+/);
    setSelectedAddressId(address.id);
    form.setValue("firstName", firstName || "", { shouldDirty: true, shouldValidate: true });
    form.setValue("lastName", lastNameParts.join(" ") || firstName || "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("phone", address.phone, { shouldDirty: true, shouldValidate: true });
    form.setValue("address", address.line1, { shouldDirty: true, shouldValidate: true });
    form.setValue("addressLine2", address.line2 ?? "", { shouldDirty: true });
    form.setValue("city", address.city, { shouldDirty: true, shouldValidate: true });
  };

  const applyAddressSuggestion = (value: string) => {
    const suggestion = findAddressSuggestion(value);
    if (!suggestion) return;
    form.setValue("emirate", suggestion.emirate as (typeof emirates)[number], {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("city", suggestion.city, { shouldDirty: true, shouldValidate: true });
    form.setValue("address", suggestion.area, { shouldDirty: true, shouldValidate: true });
  };

  // Save email to sessionStorage for abandonment recovery
  useEffect(() => {
    if (!emailValue || abandonmentSaved.current) return;
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
    if (!valid) return;
    try {
      sessionStorage.setItem("velora:checkout:email", emailValue);
      abandonmentSaved.current = true;
    } catch {
      // sessionStorage unavailable — ignore
    }
  }, [emailValue]);

  const submitCheckout = async (values: CheckoutValues) => {
    setCheckoutError(null);
    setCheckoutErrorCode(null);
    setCheckoutMessage(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          sessionKey,
          couponCode: couponCode || undefined,
          giftCardCode: giftCardCode || undefined,
          customerNote: customerNote || undefined,
          searchAttribution: getStoredSearchAttribution(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setCheckoutErrorCode(result.code ?? null);
        throw new Error(result.error ?? copy.unableToStartCheckout);
      }
      if (result.url || result.confirmationUrl) {
        // Clear abandonment email on successful submission
        try { sessionStorage.removeItem("velora:checkout:email"); } catch { /* noop */ }
        clearStoredSearchAttribution();
        window.location.assign(result.url ?? result.confirmationUrl);
        return;
      }
      clearStoredSearchAttribution();
      setCheckoutMessage(
        `${result.message ?? copy.checkoutPrepared} ${copy.order} ${result.orderNumber}.`,
      );
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : copy.unableToStartCheckout,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const applyCoupon = async () => {
    setApplyingCoupon(true);
    setCouponMessage(null);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          subtotal,
          items: cart.map((line) => ({
            productId: line.product.id,
            category: line.product.category,
            collections: line.product.collections ?? [line.product.collection].filter(Boolean),
            lineTotal: (line.product.salePrice ?? line.product.price) * line.quantity,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.code === "MINIMUM_AMOUNT" && typeof result.remaining === "number") {
          throw new Error(`${copy.addMoreForCoupon} ${formatAed(result.remaining)} ${copy.moreToUseCoupon}`);
        }
        if (result.code === "EXPIRED" && result.expiresAt) {
          throw new Error(
            `${copy.couponExpiredOn} ${new Intl.DateTimeFormat("en-AE", {
              dateStyle: "medium",
            }).format(new Date(result.expiresAt))}.`,
          );
        }
        if (result.code === "USAGE_LIMIT") {
          throw new Error(copy.couponUsageLimit);
        }
        throw new Error(result.message ?? copy.unableToApplyCoupon);
      }
      setDiscount(result.coupon.discount);
      setFreeShipping(result.coupon.freeShipping);
      const benefit =
        result.coupon.freeShipping
          ? copy.freeShippingBenefit
          : result.coupon.discount > 0
            ? `${formatAed(result.coupon.discount)} ${copy.offBenefit}`
            : copy.discountBenefit;
      setCouponMessage(`${result.coupon.code} ${copy.couponApplied} · ${benefit}`);
    } catch (error) {
      setDiscount(0);
      setFreeShipping(false);
      setCouponMessage(error instanceof Error ? error.message : copy.unableToApplyCoupon);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const applyGiftCard = async () => {
    setApplyingGiftCard(true);
    setGiftCardMessage(null);
    try {
      const response = await fetch("/api/gift-cards/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: giftCardCode,
          payableAmount: payableBeforeGiftCard,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? copy.unableToApplyGiftCard);
      setGiftCardAmount(result.giftCard.appliedAmount);
      setGiftCardMessage(
        `${copy.giftCardApplied} · ${formatAed(result.giftCard.appliedAmount)} · balance ${formatAed(result.giftCard.balance)}`,
      );
    } catch (error) {
      setGiftCardAmount(0);
      setGiftCardMessage(error instanceof Error ? error.message : copy.unableToApplyGiftCard);
    } finally {
      setApplyingGiftCard(false);
    }
  };

  const inputClass =
    "h-12 w-full border border-[var(--border)] bg-[var(--background)] px-3.5 text-sm outline-none transition focus:border-[var(--foreground)] placeholder:text-[var(--muted)] motion-reduce:transition-none";

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center" role="status">
        <PackageCheck className="mx-auto size-10 text-[var(--accent)]" />
        <h1 className="mt-6 text-3xl font-semibold">Loading checkout</h1>
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center">
        <PackageCheck className="mx-auto size-10 text-[var(--accent)]" />
        <h1 className="mt-6 text-3xl font-semibold">{copy.yourCartEmpty}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {copy.emptyCartBody}
        </p>
        <Link
          href="/shop"
          className="storefront-action mt-8 inline-flex h-12 items-center border border-[var(--accent)] px-8 text-sm font-semibold uppercase tracking-[0.1em] text-[var(--accent-text)] transition hover:bg-[var(--accent)] hover:text-[#111315]"
        >
          {copy.browseStore}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:gap-10">
      {/* ── Left column: form ─────────────────────────────────── */}
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(submitCheckout)}
        noValidate
      >
        {/* Contact */}
        <SectionCard
          title={copy.contact}
          action={
            <Link href="/account/sign-in" className="text-xs font-medium underline text-[var(--muted)] hover:text-[var(--foreground)]">
              {copy.signIn}
            </Link>
          }
        >
          <div className="space-y-4">
            <Field
              label={copy.emailAddress}
              error={form.formState.errors.email?.message}
              hint={copy.emailHint}
              htmlFor="checkout-email"
              errorId="checkout-email-error"
              hintId="checkout-email-hint"
            >
              <input
                {...form.register("email")}
                id="checkout-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-invalid={Boolean(form.formState.errors.email)}
                aria-describedby={form.formState.errors.email ? "checkout-email-error" : "checkout-email-hint"}
                placeholder={copy.emailPlaceholder}
                suppressHydrationWarning
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Delivery address */}
        <SectionCard title={copy.deliveryAddress}>
          {savedAddresses.length ? (
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              {savedAddresses.map((address) => {
                const selected = selectedAddressId === address.id;
                return (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => applySavedAddress(address)}
                    className={`border p-4 text-start transition motion-reduce:transition-none ${
                      selected
                        ? "border-[var(--foreground)] bg-[var(--hover)]"
                        : "border-[var(--border)] hover:border-[var(--foreground)]/40"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{address.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}
                      <br />
                      {address.city}, {address.country}
                      <br />
                      {address.phone}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.firstName} error={form.formState.errors.firstName?.message} htmlFor="checkout-first-name" errorId="checkout-first-name-error">
              <input
                {...form.register("firstName")}
                id="checkout-first-name"
                autoComplete="given-name"
                aria-invalid={Boolean(form.formState.errors.firstName)}
                aria-describedby={form.formState.errors.firstName ? "checkout-first-name-error" : undefined}
                placeholder="Jane"
                className={inputClass}
              />
            </Field>
            <Field label={copy.lastName} error={form.formState.errors.lastName?.message} htmlFor="checkout-last-name" errorId="checkout-last-name-error">
              <input
                {...form.register("lastName")}
                id="checkout-last-name"
                autoComplete="family-name"
                aria-invalid={Boolean(form.formState.errors.lastName)}
                aria-describedby={form.formState.errors.lastName ? "checkout-last-name-error" : undefined}
                placeholder="Doe"
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field
                label={copy.uaeMobileNumber}
                error={form.formState.errors.phone?.message}
                hint={copy.phoneHint}
                htmlFor="checkout-phone"
                errorId="checkout-phone-error"
                hintId="checkout-phone-hint"
              >
                <input
                  {...form.register("phone")}
                  id="checkout-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={Boolean(form.formState.errors.phone)}
                  aria-describedby={form.formState.errors.phone ? "checkout-phone-error" : "checkout-phone-hint"}
                  placeholder="+971 50 123 4567"
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={copy.streetAddress} error={form.formState.errors.address?.message} htmlFor="checkout-address" errorId="checkout-address-error">
                <input
                  {...form.register("address")}
                  id="checkout-address"
                  autoComplete="address-line1"
                  list={addressSuggestions.length ? "checkout-address-suggestions" : undefined}
                  aria-invalid={Boolean(form.formState.errors.address)}
                  aria-describedby={form.formState.errors.address ? "checkout-address-error" : undefined}
                  placeholder={copy.streetAddressPlaceholder}
                  onBlur={(event) => applyAddressSuggestion(event.currentTarget.value)}
                  className={inputClass}
                />
                <datalist id="checkout-address-suggestions">
                  {addressSuggestions.map((suggestion) => (
                    <option key={suggestion.label} value={suggestion.label} />
                  ))}
                </datalist>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={copy.addressLine2Label} htmlFor="checkout-address-line-2">
                <input
                  {...form.register("addressLine2")}
                  id="checkout-address-line-2"
                  autoComplete="address-line2"
                  placeholder={copy.addressLine2Placeholder}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label={copy.emirate} error={form.formState.errors.emirate?.message} htmlFor="checkout-emirate" errorId="checkout-emirate-error">
              <select
                {...form.register("emirate")}
                id="checkout-emirate"
                autoComplete="address-level1"
                aria-invalid={Boolean(form.formState.errors.emirate)}
                aria-describedby={form.formState.errors.emirate ? "checkout-emirate-error" : undefined}
                className={inputClass}
              >
                {emirates.map((emirate) => (
                  <option key={emirate}>{emirate}</option>
                ))}
              </select>
            </Field>
            <Field label={copy.cityArea} error={form.formState.errors.city?.message} htmlFor="checkout-city" errorId="checkout-city-error">
              <input
                {...form.register("city")}
                id="checkout-city"
                autoComplete="address-level2"
                aria-invalid={Boolean(form.formState.errors.city)}
                aria-describedby={form.formState.errors.city ? "checkout-city-error" : undefined}
                placeholder="Dubai Marina"
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Shipping method */}
        <SectionCard title={copy.shippingMethodTitle}>
          <div className="space-y-3">
            {availableShippingMethods.map((option) => {
              const selected = shippingMethod === option.id;
              const quote = getShippingQuote(checkoutSettings, {
                emirate: selectedEmirate,
                methodId: option.id,
                subtotal,
                freeShipping,
              });
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 border p-4 transition-colors motion-reduce:transition-none ${
                    selected
                      ? "border-[var(--foreground)] bg-[var(--hover)]"
                      : "border-[var(--border)] hover:border-[var(--foreground)]/40"
                  }`}
                >
                  <input
                    {...form.register("shippingMethod")}
                    type="radio"
                    value={option.id}
                    className="accent-[var(--foreground)]"
                  />
                  {option.id === "express" ? (
                    <PackageCheck className="size-5 text-[var(--muted)]" />
                  ) : (
                    <Truck className="size-5 text-[var(--muted)]" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-[var(--muted)]">{option.estimate}</span>
                  </span>
                  <span className="text-sm font-semibold">
                    {quote?.total === 0 ? copy.free : formatAed(quote?.total ?? option.price)}
                  </span>
                </label>
              );
            })}
          </div>
        </SectionCard>

        {/* Payment method */}
        <SectionCard title={copy.paymentMethodTitle}>
          <div className="space-y-3">
            {availablePaymentMethods.map((method) => (
              <label
                key={method.id}
                className={`flex cursor-pointer items-center gap-3 border p-4 transition-colors motion-reduce:transition-none ${
                  paymentMethod === method.id
                    ? "border-[var(--foreground)] bg-[var(--hover)]"
                    : "border-[var(--border)] hover:border-[var(--foreground)]/40"
                }`}
              >
                <input
                  {...form.register("paymentMethod")}
                  type="radio"
                  value={method.id}
                  className="accent-[var(--foreground)]"
                />
                {method.id === "cash_on_delivery" ? (
                  <Banknote className="size-5 text-[var(--muted)]" />
                ) : method.id === "paypal" ? (
                  <CreditCard className="size-5 text-[var(--muted)]" />
                ) : (
                  <LockKeyhole className="size-5 text-[var(--muted)]" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{method.label}</span>
                  <span className="block text-xs text-[var(--muted)]">{method.description}</span>
                </span>
              </label>
            ))}
          </div>
          {expressWallets.length ? (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{copy.expressCheckout}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{copy.expressCheckoutSubtitle}</p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {expressWallets.map((wallet) => (
                  <button
                    key={wallet}
                    type="button"
                    disabled={expressCheckoutDisabled}
                    onClick={submitExpressCheckout}
                    className="flex h-12 items-center justify-center gap-2 border border-[var(--foreground)] bg-[var(--foreground)] px-4 text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent)] hover:text-[#111315] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                  >
                    <LockKeyhole className="size-4" />
                    {wallet === "apple_pay" ? copy.applePay : copy.googlePay}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>

        {/* Alerts */}
        {checkoutBlocked ? (
          <div
            className={`flex items-start gap-3 border p-4 text-sm ${
              reservationErrorLabel?.tone === "warning"
                ? "border-amber-500/25 bg-amber-500/8 text-amber-800"
                : "border-red-500/20 bg-red-500/8 text-red-600"
            }`}
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">{reservationErrorLabel?.title ?? copy.reservationExpiredAlert}</p>
              {reservationErrorLabel?.detail ? (
                <p className="mt-1">{reservationErrorLabel.detail}</p>
              ) : null}
              <Link href="/cart" className="mt-2 inline-block font-semibold underline">
                {copy.returnToCart}
              </Link>
            </div>
          </div>
        ) : null}
        {cancelled ? (
          <div
            className="flex items-start gap-3 border border-amber-500/25 bg-amber-500/8 p-4 text-sm text-amber-800"
            role="status"
          >
            <RefreshCcw className="mt-0.5 size-4 shrink-0" />
            <div>
              <p>{copy.paymentCancelledAlert}</p>
              <button type="submit" className="mt-2 font-semibold underline">
                Retry payment
              </button>
            </div>
          </div>
        ) : null}
        {checkoutError ? (
          <div
            className="flex items-start gap-3 border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-600"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p>{checkoutError}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {["RESERVATION_EXPIRED", "EMPTY_CART", "CHECKOUT_EMAIL_CONFLICT"].includes(checkoutErrorCode ?? "") ? (
                  <Link href="/cart" className="font-semibold underline">
                    {copy.returnToCart}
                  </Link>
                ) : null}
                {["PAYMENT_METHOD_UNAVAILABLE", "SHIPPING_METHOD_UNAVAILABLE"].includes(checkoutErrorCode ?? "") ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutError(null);
                      setCheckoutErrorCode(null);
                    }}
                    className="font-semibold underline"
                  >
                    Review checkout options
                  </button>
                ) : null}
                {!checkoutErrorCode || checkoutErrorCode === "ORDER_PREPARE_FAILED" ? (
                  <button type="submit" className="font-semibold underline">
                    Try again
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {checkoutMessage ? (
          <p className="text-sm text-[var(--accent)]" role="status">{checkoutMessage}</p>
        ) : null}

        {/* Submit CTA */}
        <div className="space-y-3 pt-2">
          <Button
            className="h-14 w-full text-sm font-semibold uppercase tracking-[0.1em]"
            disabled={!sessionKey || checkoutBlocked || submitting || form.formState.isSubmitting}
          >
            <LockKeyhole className="size-4" />
            {submitting || form.formState.isSubmitting
              ? paymentMethod === "cash_on_delivery"
                ? copy.placingOrder
                : copy.preparingPayment
              : paymentMethod === "cash_on_delivery"
                ? `${copy.placeOrderCod} · ${formatAed(total)} ${copy.cod}`
                : `${copy.paySecurely} ${formatAed(total)} ${copy.securely}`}
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              {copy.sslEncrypted}
            </span>
            <span className="h-3.5 w-px bg-[var(--border)]" />
            <span className="flex items-center gap-1.5">
              <Truck className="size-3.5" />
              {copy.freeReturns}
            </span>
            <span className="h-3.5 w-px bg-[var(--border)]" />
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5" />
              {copy.uaeDelivery}
            </span>
          </div>
        </div>
      </form>

      {/* ── Right column: order summary ───────────────────────── */}
      <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-28">
        {/* Cart items */}
        <div className="border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em]">{copy.orderSummary}</h2>
            <Link href="/cart" className="text-xs font-medium underline text-[var(--muted)] hover:text-[var(--foreground)]">
              {copy.editCart}
            </Link>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)]">
            {cart.map((line) => (
              <div
                key={`${line.product.slug}-${line.size}-${line.color}`}
                className="flex items-start gap-3 p-4"
              >
                <div className="relative size-16 shrink-0 overflow-hidden bg-[var(--card)]">
                  <Image
                    src={getCartLineImage(line)}
                    alt={line.product.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center bg-[var(--foreground)] text-[10px] font-semibold text-[var(--background)]">
                    {line.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.product.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {line.color} / {line.size}
                  </p>
                </div>
                <span className="text-sm font-medium">
                  {formatAed((line.product.salePrice ?? line.product.price) * line.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Coupon */}
        <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
          <label
            htmlFor="checkout-coupon"
            className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]"
          >
            {copy.couponCode}
          </label>
          <div className="mt-2.5 flex gap-2">
            <input
              id="checkout-coupon"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder={copy.couponPlaceholder}
              className="h-11 min-w-0 flex-1 border border-[var(--border)] bg-[var(--background)] px-3 text-sm uppercase outline-none transition focus:border-[var(--foreground)] placeholder:normal-case placeholder:text-[var(--muted)] motion-reduce:transition-none"
            />
            <button
              type="button"
              disabled={!couponCode.trim() || applyingCoupon}
              onClick={applyCoupon}
              className="h-11 border border-[var(--foreground)] px-4 text-xs font-semibold uppercase tracking-[0.1em] transition hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:opacity-40 motion-reduce:transition-none"
            >
              {applyingCoupon ? "..." : copy.apply}
            </button>
          </div>
          {couponMessage ? (
            <p
              role={discount > 0 || freeShipping ? "status" : "alert"}
              className={`mt-2.5 flex items-center gap-1.5 text-xs ${
                discount > 0 || freeShipping ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {discount > 0 || freeShipping ? (
                <Check className="size-3.5 shrink-0" />
              ) : (
                <AlertCircle className="size-3.5 shrink-0" />
              )}
              {couponMessage}
            </p>
          ) : null}
        </div>

        {/* Gift card */}
        <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
          <label
            htmlFor="checkout-gift-card"
            className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]"
          >
            {copy.giftCardCode}
          </label>
          <div className="mt-2.5 flex gap-2">
            <input
              id="checkout-gift-card"
              value={giftCardCode}
              onChange={(event) => {
                setGiftCardCode(event.target.value.toUpperCase());
                setGiftCardAmount(0);
              }}
              placeholder={copy.giftCardPlaceholder}
              className="h-11 min-w-0 flex-1 border border-[var(--border)] bg-[var(--background)] px-3 text-sm uppercase outline-none transition focus:border-[var(--foreground)] placeholder:normal-case placeholder:text-[var(--muted)] motion-reduce:transition-none"
            />
            <button
              type="button"
              disabled={!giftCardCode.trim() || applyingGiftCard || payableBeforeGiftCard <= 0}
              onClick={applyGiftCard}
              className="h-11 border border-[var(--foreground)] px-4 text-xs font-semibold uppercase tracking-[0.1em] transition hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:opacity-40 motion-reduce:transition-none"
            >
              {applyingGiftCard ? "..." : copy.apply}
            </button>
          </div>
          {giftCardMessage ? (
            <p
              role={giftCardAmount > 0 ? "status" : "alert"}
              className={`mt-2.5 flex items-center gap-1.5 text-xs ${
                giftCardAmount > 0 ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {appliedGiftCardAmount > 0 ? (
                <Check className="size-3.5 shrink-0" />
              ) : (
                <AlertCircle className="size-3.5 shrink-0" />
              )}
              {giftCardMessage}
            </p>
          ) : null}
        </div>

        {/* Totals */}
        <div className="border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2.5 text-sm">
          <div className="flex justify-between text-[var(--muted)]">
            <span>{copy.subtotal}</span>
            <span className="text-[var(--foreground)]">{formatAed(subtotal)}</span>
          </div>
          {discount > 0 ? (
            <div className="flex justify-between text-emerald-600">
              <span>{copy.discount}</span>
              <span>-{formatAed(discount)}</span>
            </div>
          ) : null}
          {appliedGiftCardAmount > 0 ? (
            <div className="flex justify-between text-emerald-600">
              <span>{copy.giftCard}</span>
              <span>-{formatAed(appliedGiftCardAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-[var(--muted)]">
            <span>{copy.shipping}</span>
            <span className="text-[var(--foreground)]">
              {shipping === 0 ? copy.free : formatAed(shipping)}
            </span>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-3 text-base font-semibold">
            <span>{copy.total}</span>
            <span>{formatAed(total)}</span>
          </div>
          <p className="text-[10px] text-[var(--muted)]">
            {copy.vatNote}
          </p>
        </div>
      </aside>
    </div>
  );
}
