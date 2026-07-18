"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { Heart, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/store/language-switcher";
import { ThemeToggle } from "@/components/store/theme-toggle";
import { categoryLabel, collectionLabel, type Locale } from "@/lib/i18n-shell";
import { cn } from "@/lib/utils";

const navCategories = ["Leggings", "Sports Bras", "Jackets", "Tops", "Pants", "Accessories"];

const navCollections = [
  { slug: "studio-sculpt", name: "Studio Sculpt" },
  { slug: "desert-run", name: "Desert Run" },
  { slug: "after-hours", name: "After Hours" },
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
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-black/45 backdrop-blur-sm lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="storefront-drawer-full fixed inset-0 z-[110] overflow-y-auto bg-[var(--background)] p-5 text-[var(--foreground)] outline-none lg:hidden"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title asChild>
              <Link href={localize("/")} className="font-serif text-3xl font-medium tracking-[0.08em] text-[var(--accent)]">Velora</Link>
            </Dialog.Title>
            <Dialog.Close aria-label="Close menu" className="storefront-action grid size-11 -me-2 place-items-center">
              <X className="size-6" />
            </Dialog.Close>
          </div>
          <nav className="storefront-stagger mt-7 flex flex-col font-serif text-3xl font-medium" aria-label="Primary mobile navigation">
            {nav.map((item) => (
              <Dialog.Close key={item.label} asChild>
                <Link
                  href={localize(item.href)}
                  aria-current={item.href !== "/shop?sort=latest" && isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "storefront-action flex min-h-12 items-center border-b border-[var(--border)]",
                    item.href !== "/shop?sort=latest" && isActive(item.href) && "text-[var(--accent)]",
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
                className="storefront-action flex min-h-[3.25rem] flex-col items-center justify-center gap-1.5 border border-[var(--border)] uppercase hover:bg-[var(--hover)]"
              >
                <Search className="size-4" />
                {copy.search}
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href={localize("/account")} className="storefront-action flex min-h-[3.25rem] flex-col items-center justify-center gap-1.5 border border-[var(--border)] hover:bg-[var(--hover)]">
                <UserRound className="size-4" />
                {copy.account}
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href={localize("/account#wishlist")} className="storefront-action flex min-h-[3.25rem] flex-col items-center justify-center gap-1.5 border border-[var(--border)] hover:bg-[var(--hover)]">
                <Heart className="size-4" />
                {copy.wishlist}{wishlistCount ? ` (${wishlistCount})` : ""}
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={() => window.requestAnimationFrame(openCart)}
                className="storefront-action flex min-h-[3.25rem] flex-col items-center justify-center gap-1.5 border border-[var(--border)] uppercase hover:bg-[var(--hover)]"
              >
                <ShoppingBag className="size-4" />
                {copy.cart}{cartCount ? ` (${cartCount})` : ""}
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="flex min-h-11 items-center justify-between gap-3 border border-[var(--border)] px-3 text-[11px] font-medium uppercase tracking-[0.14em]">
              <span className="shrink-0 text-stone-500">{copy.theme}</span>
              <ThemeToggle className="!size-7 border-0" />
            </div>
            <div className="grid min-h-11 min-w-0 grid-cols-[auto_1fr] items-center gap-3 border border-[var(--border)] px-3 text-[11px] font-medium uppercase tracking-[0.14em]">
              <span className="shrink-0 text-stone-500" aria-label={copy.language}>Lang</span>
              <LanguageSwitcher className="justify-end gap-1.5 whitespace-nowrap tracking-[0.08em]" />
            </div>
          </div>
          <div className="mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{copy.categories}</p>
            <div className="mt-3 grid grid-cols-2 border-l border-t border-[var(--border)]">
              {navCategories.map((category) => (
                <Dialog.Close key={category} asChild>
                  <Link href={localize(`/shop?category=${encodeURIComponent(category)}`)} className="storefront-action flex min-h-12 items-center border-b border-r border-[var(--border)] p-3 text-sm hover:bg-[var(--hover)]">
                    {categoryLabel(locale, category)}
                  </Link>
                </Dialog.Close>
              ))}
            </div>
          </div>
          <div className="mt-7 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{copy.collections}</p>
              <div className="mt-3 grid gap-1 text-sm">
                {navCollections.map((collection) => (
                  <Dialog.Close key={collection.slug} asChild>
                    <Link href={localize(`/collections/${collection.slug}`)} className="storefront-action flex min-h-10 items-center border-b border-[var(--border)] hover:text-[var(--accent)]">
                      {collectionLabel(locale, collection.slug, collection.name)}
                    </Link>
                  </Dialog.Close>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{copy.clientServices}</p>
              <div className="mt-3 grid gap-1 text-sm">
                {serviceLinks.map((item) => (
                  <Dialog.Close key={item.href} asChild>
                    <Link href={localize(item.href)} className="storefront-action flex min-h-10 items-center border-b border-[var(--border)] hover:text-[var(--accent)]">
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
