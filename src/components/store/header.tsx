"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { AnnouncementBar } from "@/components/store/announcement-bar";
import { LanguageSwitcher } from "@/components/store/language-switcher";
import { StoreSearchDialog } from "@/components/store/store-search-dialog";
import { ThemeToggle } from "@/components/store/theme-toggle";
import { enabledSorted, localText, type GlobalContent } from "@/lib/global-content";
import { categories, collections, products } from "@/lib/catalog";
import { categoryLabel, collectionLabel, localeFromPathname, localizedPath, shellCopy, stripLocale } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Header({ globalContent }: { globalContent: GlobalContent }) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const basePath = stripLocale(pathname);
  const copy = shellCopy[locale];
  const localize = (href: string) => localizedPath(href, locale);
  const nav = enabledSorted(globalContent.primaryNavigation).map((item) => ({
    href: item.href,
    label: localText(item.label, locale),
  }));
  const serviceLinks = enabledSorted(globalContent.serviceLinks).map((item) => ({
    href: item.href,
    label: localText(item.label, locale),
  }));
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const cart = useStore((state) => state.cart);
  const wishlist = useStore((state) => state.wishlist);
  const setCartOpen = useStore((state) => state.setCartOpen);
  const cartCount = cart.reduce((total, line) => total + line.quantity, 0);
  const isHome = basePath === "/";
  const announcementVisible = globalContent.announcementEnabled && globalContent.announcements.some((item) => item.enabled);
  const isOverlay = isHome && !scrolled && !menuOpen && !searchOpen;
  const isActive = (href: string) =>
    href === "/" ? basePath === "/" : basePath === href || basePath.startsWith(`${href}/`);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!shopOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShopOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shopOpen]);

  return (
    <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <>
      <AnnouncementBar isOverlay={isOverlay} globalContent={globalContent} />
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300",
          announcementVisible && "md:top-8",
          isOverlay
            ? "border-white/15 bg-transparent text-white"
            : "border-[var(--border)] bg-[var(--background)]/96 text-[var(--foreground)] backdrop-blur-xl",
        )}
      >
        <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 md:h-[72px] lg:px-8">
          <Dialog.Trigger asChild>
            <button className="grid size-11 place-items-center justify-self-start -ms-3 lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </button>
          </Dialog.Trigger>
          <Link href={localize("/")} className="justify-self-center font-serif text-3xl font-medium leading-none tracking-[0.08em] text-[var(--accent)] lg:justify-self-start">
            Velora
          </Link>
          <nav className="hidden items-center justify-center gap-8 text-[11px] font-medium uppercase tracking-[0.14em] lg:flex">
            <div
              className="py-7"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
              onFocus={() => setShopOpen(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setShopOpen(false);
              }}
            >
              <button
                type="button"
                aria-expanded={shopOpen}
                aria-controls="desktop-shop-menu"
                className={cn(
                  "relative py-2 after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-current after:transition-transform",
                  basePath.startsWith("/shop") || basePath.startsWith("/collections")
                    ? "after:scale-x-100"
                    : "after:scale-x-0 hover:after:scale-x-100",
                )}
                onClick={() => setShopOpen((open) => !open)}
              >
                {copy.shop}
              </button>
              <div
                id="desktop-shop-menu"
                className={cn(
                  "absolute inset-x-0 top-full border-b border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-xl transition duration-200",
                  shopOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
                )}
              >
                <div className="mx-auto grid max-w-[1440px] grid-cols-[0.8fr_0.8fr_1.4fr] gap-12 px-8 py-10 normal-case tracking-normal">
                  <div>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{copy.categories}</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      {categories.map((category) => (
                        <Link key={category} href={localize(`/shop?category=${encodeURIComponent(category)}`)} className="py-2 hover:text-[var(--accent)]">
                          {categoryLabel(locale, category)}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{copy.collections}</p>
                    <div className="grid gap-1 text-sm">
                      {collections.map((collection) => (
                        <Link key={collection.slug} href={localize(`/collections/${collection.slug}`)} className="py-2 hover:text-[var(--accent)]">
                          {collectionLabel(locale, collection.slug, collection.name)}
                        </Link>
                      ))}
                      <Link href={localize("/shop")} className="mt-3 underline">{copy.shopAll}</Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    {products.slice(0, 2).map((product) => (
                      <Link key={product.id} href={localize(`/product/${product.slug}`)} className="group/card">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--card)]">
                          <Image src={product.images[0]} alt={product.name} fill sizes="280px" className="object-cover transition duration-700 group-hover/card:scale-[1.02]" />
                        </div>
                        <p className="mt-3 text-sm font-semibold">{product.name}</p>
                        <p className="text-xs text-[var(--muted)]">{copy.bestsellerEdit}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {nav.filter((item) => item.href !== "/shop").map((item) => (
              <Link
                key={item.label}
                href={localize(item.href)}
                aria-current={item.href !== "/shop?sort=latest" && isActive(item.href) ? "page" : undefined}
                className={cn(
                  "relative py-2 after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-current after:transition-transform",
                  item.href !== "/shop?sort=latest" && isActive(item.href)
                    ? "after:scale-x-100"
                    : "after:scale-x-0 hover:after:scale-x-100",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-self-end gap-3">
            <StoreSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
            <Link href={localize("/account")} aria-label={String(copy.account)} className="hidden size-11 place-items-center sm:grid">
              <UserRound className="size-5" />
            </Link>
            <div className="hidden sm:block">
              <ThemeToggle className={isOverlay ? "text-white" : "text-[var(--foreground)]"} />
            </div>
            <Link href={localize("/account#wishlist")} aria-label={String(copy.wishlist)} className="relative hidden size-11 place-items-center sm:grid">
              <Heart className="size-5" />
              {wishlist.length ? <span className="absolute -right-2 -top-2 grid size-4 place-items-center bg-[var(--accent)] text-[10px] text-stone-950">{wishlist.length}</span> : null}
            </Link>
            <button aria-label={String(copy.cart)} onClick={() => setCartOpen(true)} className="relative grid size-11 place-items-center -me-3 sm:me-0">
              <ShoppingBag className="size-5" />
              {cartCount ? <span className="absolute -right-2 -top-2 grid size-4 place-items-center bg-[var(--accent)] text-[10px] text-stone-950">{cartCount}</span> : null}
            </button>
          </div>
        </div>
      </header>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)] p-5 outline-none lg:hidden"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title asChild>
              <Link href={localize("/")} className="font-serif text-3xl font-medium tracking-[0.08em] text-[var(--accent)]">Velora</Link>
            </Dialog.Title>
            <Dialog.Close aria-label="Close menu" className="grid size-11 -me-2 place-items-center">
              <X className="size-6" />
            </Dialog.Close>
          </div>
          <nav className="mt-8 flex flex-col font-serif text-4xl font-medium" aria-label="Primary mobile navigation">
            {nav.map((item) => (
              <Dialog.Close key={item.label} asChild>
                <Link
                  href={localize(item.href)}
                  aria-current={item.href !== "/shop?sort=latest" && isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 items-center border-b border-[var(--border)]",
                    item.href !== "/shop?sort=latest" && isActive(item.href) && "text-[var(--accent)]",
                  )}
                >
                  {item.label}
                </Link>
              </Dialog.Close>
            ))}
          </nav>
          <div className="mt-6 grid grid-cols-2 gap-2 text-center text-[11px] font-medium uppercase tracking-[0.14em] sm:grid-cols-4">
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={() => {
                  window.requestAnimationFrame(() => setSearchOpen(true));
                }}
                className="flex min-h-14 flex-col items-center justify-center gap-1.5 border border-[var(--border)]"
              >
                <Search className="size-4" />
                {copy.search}
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href={localize("/account")} className="flex min-h-14 flex-col items-center justify-center gap-1.5 border border-[var(--border)]">
                <UserRound className="size-4" />
                {copy.account}
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href={localize("/account#wishlist")} className="flex min-h-14 flex-col items-center justify-center gap-1.5 border border-[var(--border)]">
                <Heart className="size-4" />
                {copy.wishlist}{wishlist.length ? ` (${wishlist.length})` : ""}
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={() => {
                  window.requestAnimationFrame(() => setCartOpen(true));
                }}
                className="flex min-h-14 flex-col items-center justify-center gap-1.5 border border-[var(--border)]"
              >
                <ShoppingBag className="size-4" />
                {copy.cart}{cartCount ? ` (${cartCount})` : ""}
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="flex min-h-11 items-center justify-between border border-[var(--border)] px-3 text-[11px] font-medium uppercase tracking-[0.14em]">
              <span className="text-stone-500">{copy.theme}</span>
              <ThemeToggle className="size-7 border-0" />
            </div>
            <div className="flex min-h-11 items-center justify-between border border-[var(--border)] px-3 text-[11px] font-medium uppercase tracking-[0.14em]">
              <span className="text-stone-500">{copy.language}</span>
              <LanguageSwitcher />
            </div>
          </div>
          <div className="mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{copy.categories}</p>
            <div className="mt-3 grid grid-cols-2 border-l border-t border-[var(--border)]">
              {categories.slice(0, 6).map((category) => (
                <Dialog.Close key={category} asChild>
                  <Link href={localize(`/shop?category=${encodeURIComponent(category)}`)} className="flex min-h-12 items-center border-b border-r border-[var(--border)] p-3 text-sm">
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
                {collections.slice(0, 4).map((collection) => (
                  <Dialog.Close key={collection.slug} asChild>
                    <Link href={localize(`/collections/${collection.slug}`)} className="flex min-h-10 items-center border-b border-[var(--border)]">
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
                    <Link href={localize(item.href)} className="flex min-h-10 items-center border-b border-[var(--border)]">
                      {item.label}
                    </Link>
                  </Dialog.Close>
                ))}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      </>
    </Dialog.Root>
  );
}
