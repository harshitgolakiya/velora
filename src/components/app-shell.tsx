"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, LockKeyhole } from "lucide-react";
import { CartReservationSync } from "@/components/store/cart-reservation-sync";
import { DeferredStorefrontEffects } from "@/components/store/deferred-storefront-effects";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { LocaleDocument } from "@/components/store/locale-document";
import { PageTransition } from "@/components/store/page-transition";
import { localeFromPathname, localizedPath, shellCopy, stripLocale } from "@/lib/i18n-shell";
import type { GlobalContent } from "@/lib/global-content";

export function AppShell({
  children,
  globalContent,
}: {
  children: React.ReactNode;
  globalContent: GlobalContent;
}) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const copy = shellCopy[locale];
  const basePath = stripLocale(pathname);
  const localize = (path: string) => localizedPath(path, locale);
  const showNewsletterModal = basePath === "/" || ["/shop", "/collections/", "/product/", "/search"].some((path) => basePath === path || basePath.startsWith(path));
  const shellHasAnnouncement = globalContent.announcementEnabled && globalContent.announcements.some((item) => item.enabled);
  const syncCartImmediately = basePath === "/cart";
  const isAdmin =
    basePath === "/admin" ||
    basePath.startsWith("/admin/") ||
    basePath === "/admin-login";

  if (isAdmin) {
    if (basePath === "/admin-login") return <>{children}</>;
    return <main className="min-h-dvh">{children}</main>;
  }

  if (basePath.startsWith("/checkout")) {
    const isSuccess = basePath === "/checkout/success";
    const steps = [
      { label: String(copy.cart), done: true },
      { label: String(copy.details), done: !isSuccess, active: !isSuccess },
      { label: String(copy.payment), done: isSuccess, active: isSuccess },
    ];
    return (
      <div className="storefront-root">
        <LocaleDocument />
        <CartReservationSync />
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="storefront-container flex h-16 items-center justify-between">
            {isSuccess ? (
              <Link href={localize("/")} className="storefront-action -ms-2 flex min-h-10 items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--foreground)]">
                <ArrowLeft className="size-4" />
                {copy.shop}
              </Link>
            ) : (
              <Link href={localize("/cart")} className="storefront-action -ms-2 flex min-h-10 items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--foreground)]">
                <ArrowLeft className="size-4" />
                {copy.cart}
              </Link>
            )}
            <Link href={localize("/")} className="font-serif text-2xl font-medium tracking-[0.04em] text-[var(--foreground)]">
              Velora
            </Link>
            <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <LockKeyhole className="size-3.5" />
              <span className="hidden sm:inline">{copy.secureCheckout}</span>
              <span className="sm:hidden">{copy.secure}</span>
            </span>
          </div>
          {/* Step progress bar */}
          <div className="border-t border-[var(--border)] bg-[var(--background)]">
            <div className="storefront-container flex items-center">
              {steps.map((step, i) => (
                <div key={step.label} className="flex flex-1 items-center">
                  <div className={`flex items-center gap-2 py-2.5 text-xs font-medium transition-colors motion-reduce:transition-none ${
                    step.active
                      ? "text-[var(--foreground)]"
                      : step.done
                        ? "text-[var(--accent-text)]"
                        : "text-[var(--muted)]"
                  }`}>
                    <span className={`grid size-5 shrink-0 place-items-center text-[10px] font-semibold transition-colors motion-reduce:transition-none ${
                      step.done && !step.active
                        ? "bg-[var(--accent)] text-[var(--on-accent)]"
                        : step.active
                          ? "border-2 border-[var(--foreground)]"
                          : "border border-[var(--border)] text-[var(--muted)]"
                    }`}>
                      {step.done && !step.active ? <Check className="size-3" /> : i + 1}
                    </span>
                    <span className={i === 1 ? "hidden xs:inline sm:inline" : ""}>{step.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="mx-2 h-px flex-1 bg-[var(--border)]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100dvh-5.5rem)] bg-[var(--background)]">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    );
  }

  return (
    <div className="storefront-root">
      <Header globalContent={globalContent} />
      <LocaleDocument />
      {syncCartImmediately ? <CartReservationSync /> : null}
      <DeferredStorefrontEffects showNewsletterModal={showNewsletterModal} syncCart={!syncCartImmediately} />
      <main className={basePath === "/" ? "min-h-dvh" : `min-h-dvh pt-16 ${shellHasAnnouncement ? "md:pt-24" : "md:pt-[72px]"}`}>
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer globalContent={globalContent} />
    </div>
  );
}
