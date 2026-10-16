"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/store/language-switcher";
import { ThemeToggle } from "@/components/store/theme-toggle";
import { categoryLabel, collectionLabel, type Locale } from "@/lib/i18n-shell";
import { cn } from "@/lib/utils";

const navCategories = ["Tops", "Sports Bras", "Jackets", "Leggings", "Accessories"];

const navCollections = [
  { slug: "pilates-studio", name: "Pilates", href: "/collections/pilates-studio" },
  { slug: "court-club", name: "Tennis", href: "/collections/court-club" },
  { slug: "everyday-motion", name: "Everyday", href: "/collections/everyday-motion" },
];

type MobileMenuCopy = {
  search: string;
  account: string;
  wishlist: string;
  cart: string;
  theme: string;
  language: string;
  categories: string;
  collections: string;
  clientServices: string;
};

export function MobileMenu({
  open,
  onOpenChange,
  nav,
  serviceLinks,
  locale,
  copy,
  localize,
  isActive,
  wishlistCount,
  cartCount,
  openSearch,
  openCart,
  openAccount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nav: Array<{ href: string; label: string }>;
  serviceLinks: Array<{ href: string; label: string }>;
  locale: Locale;
  copy: MobileMenuCopy;
  localize: (href: string) => string;
  isActive: (href: string) => boolean;
  wishlistCount: number;
  cartCount: number;
  openSearch: () => void;
  openCart: () => void;
  openAccount: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-[var(--scrim)] backdrop-blur-sm lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="storefront-drawer-full fixed inset-0 z-[110] overflow-y-auto bg-[var(--background)] px-4 pb-5 pt-3 text-[var(--foreground)] outline-none sm:p-5 lg:hidden"
        >
          <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/92 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
            <Dialog.Title asChild>
              <Link href={localize("/")} className="font-serif text-[1.9rem] font-medium tracking-[0.03em] text-[var(--foreground)] sm:text-3xl">Velora</Link>
            </Dialog.Title>
            <Dialog.Close aria-label="Close menu" className="btn btn-soft btn-icon btn-round">
              <X className="size-6" />
            </Dialog.Close>
          </div>
          <Dialog.Close asChild>
            <Link href={localize("/collections/pilates-studio")} className="storefront-panel group mt-4 grid min-h-36 grid-cols-[1fr_0.82fr] overflow-hidden sm:mt-5 sm:min-h-44">
              <div className="flex min-w-0 flex-col justify-end p-3.5 sm:p-4">
                <p className="eyebrow">Featured movement</p>
                <p className="mt-2 text-[1.35rem] font-medium leading-none sm:text-2xl">Pilates Studio</p>
                <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] sm:mt-4">
                  Move in it
                  <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
              <div className="relative min-h-36 overflow-hidden bg-[var(--card)] sm:min-h-44">
                <Image
                  src="/images/campaign/campaign-reformer.webp"
                  alt=""
                  fill
                  sizes="45vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                />
              </div>
            </Link>
          </Dialog.Close>
          <nav className="storefront-stagger mt-5 flex flex-col font-serif text-[1.42rem] font-medium leading-none sm:mt-6 sm:text-[1.85rem]" aria-label="Primary mobile navigation">
            {nav.map((item) => (
              <Dialog.Close key={item.label} asChild>
                <Link
                  href={localize(item.href)}
                  aria-current={item.href !== "/shop?sort=latest" && isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "storefront-action flex min-h-11 items-center border-b border-[var(--border)] py-1 sm:min-h-12",
                    item.href !== "/shop?sort=latest" && isActive(item.href) && "text-[var(--accent-text)]",
                  )}
                >
                  {item.label}
                </Link>
              </Dialog.Close>
            ))}
          </nav>
          <div className="mt-5 grid grid-cols-2 gap-2 text-center text-[11px] font-medium uppercase tracking-[0.12em] sm:grid-cols-4">
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={() => window.requestAnimationFrame(openSearch)}
                className="storefront-action storefront-mobile-action flex min-h-[3.25rem] flex-col items-center justify-center gap-1.5 border border-[var(--border)] uppercase"
              >
                <Search className="size-4" />
                {copy.search}
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={() => window.requestAnimationFrame(openAccount)}
                className="storefront-action storefront-mobile-action flex min-h-[3.25rem] flex-col items-center justify-center gap-1.5 border border-[var(--border)] uppercase"
              >
                <UserRound className="size-4" />
                {copy.account}
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href={localize("/account/wishlist")} className="storefront-action storefront-mobile-action flex min-h-[3.25rem] flex-col items-center justify-center gap-1.5 border border-[var(--border)]">
                <span className="relative grid size-5 place-items-center">
                  <Heart className="size-4" />
                  {wishlistCount ? <span className="storefront-count-badge storefront-header-badge absolute">{wishlistCount}</span> : null}
                </span>
                {copy.wishlist}
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={() => window.requestAnimationFrame(openCart)}
                className="storefront-action storefront-mobile-action flex min-h-[3.25rem] flex-col items-center justify-center gap-1.5 border border-[var(--border)] uppercase"
              >
                <span className="relative grid size-5 place-items-center">
                  <ShoppingBag className="size-4" />
                  {cartCount ? <span className="storefront-count-badge storefront-header-badge absolute">{cartCount}</span> : null}
                </span>
                {copy.cart}
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <div className="storefront-panel-row flex min-h-12 items-center justify-between gap-3 border border-[var(--border)] px-3 text-[11px] font-medium uppercase tracking-[0.14em]">
              <span className="shrink-0 text-[var(--muted)]">{copy.theme}</span>
              <ThemeToggle className="!size-10 border-0" />
            </div>
            <div className="storefront-panel-row grid min-h-12 min-w-0 grid-cols-[auto_1fr] items-center gap-3 border border-[var(--border)] px-3 text-[11px] font-medium uppercase tracking-[0.14em]">
              <span className="shrink-0 text-[var(--muted)]" aria-label={copy.language}>{copy.language}</span>
              <LanguageSwitcher className="-me-2 min-h-10 justify-end gap-1.5 whitespace-nowrap px-2 tracking-[0.08em]" />
            </div>
          </div>
          <div className="mt-8">
            <p className="eyebrow eyebrow-muted">{copy.categories}</p>
            <div className="mt-3 grid grid-cols-2 border-l border-t border-[var(--border)]">
              {navCategories.map((category) => (
                <Dialog.Close key={category} asChild>
                  <Link href={localize(`/shop?category=${encodeURIComponent(category)}`)} className="storefront-action storefront-panel-row flex min-h-12 items-center border-b border-r border-[var(--border)] p-3 text-sm">
                    {categoryLabel(locale, category)}
                  </Link>
                </Dialog.Close>
              ))}
            </div>
          </div>
          <div className="mt-7 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="eyebrow eyebrow-muted">{copy.collections}</p>
              <div className="mt-3 grid gap-1 text-sm">
                {navCollections.map((collection) => (
                  <Dialog.Close key={collection.slug} asChild>
                    <Link href={localize(collection.href)} className="storefront-action flex min-h-10 items-center border-b border-[var(--border)] hover:text-[var(--accent-text)]">
                      {collectionLabel(locale, collection.slug, collection.name)}
                    </Link>
                  </Dialog.Close>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow eyebrow-muted">{copy.clientServices}</p>
              <div className="mt-3 grid gap-1 text-sm">
                {serviceLinks.map((item) => (
                  <Dialog.Close key={item.href} asChild>
                    <Link href={localize(item.href)} className="storefront-action flex min-h-10 items-center border-b border-[var(--border)] hover:text-[var(--accent-text)]">
                      {item.label}
                    </Link>
                  </Dialog.Close>
                ))}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
