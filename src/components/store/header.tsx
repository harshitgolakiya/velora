"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Heart, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { AnnouncementBar } from "@/components/store/announcement-bar";
import { ThemeToggle } from "@/components/store/theme-toggle";
import { enabledSorted, localText, type GlobalContent } from "@/lib/global-content";
import { categoryLabel, collectionLabel, localeFromPathname, localizedPath, shellCopy, stripLocale } from "@/lib/i18n-shell";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const navCategories = ["Leggings", "Sports Bras", "Jackets", "Tops", "Pants", "Accessories"];

const navCollections = [
  { slug: "studio-sculpt", name: "Studio Sculpt" },
  { slug: "desert-run", name: "Desert Run" },
  { slug: "after-hours", name: "After Hours" },
];

const navFeaturedProducts = [
  {
    slug: "aura-compressive-legging",
    name: "Aura Compressive Legging",
    image: "/images/velora/collection-studio-sculpt.jpg",
  },
  {
    slug: "zephyr-training-bra",
    name: "Zephyr Training Bra",
    image: "/images/velora/zephyr-bra-1.jpg",
  },
];

const StoreSearchDialog = dynamic(
  () => import("@/components/store/store-search-dialog").then((mod) => mod.StoreSearchDialog),
  { ssr: false },
);

const MobileMenu = dynamic(
  () => import("@/components/store/mobile-menu").then((mod) => mod.MobileMenu),
  { ssr: false },
);

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
  const [menuMounted, setMenuMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const menuUnmountTimer = useRef<number | undefined>(undefined);
  const searchUnmountTimer = useRef<number | undefined>(undefined);
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

  function openMenu() {
    if (menuUnmountTimer.current) window.clearTimeout(menuUnmountTimer.current);
    setMenuMounted(true);
    window.requestAnimationFrame(() => setMenuOpen(true));
  }

  function handleMenuOpenChange(open: boolean) {
    setMenuOpen(open);
    if (!open) {
      menuUnmountTimer.current = window.setTimeout(() => setMenuMounted(false), 260);
    }
  }

  function openSearch() {
    if (searchUnmountTimer.current) window.clearTimeout(searchUnmountTimer.current);
    setSearchMounted(true);
    window.requestAnimationFrame(() => setSearchOpen(true));
  }

  function handleSearchOpenChange(open: boolean) {
    setSearchOpen(open);
    if (!open) {
      window.requestAnimationFrame(() => searchButtonRef.current?.focus());
      searchUnmountTimer.current = window.setTimeout(() => setSearchMounted(false), 260);
    }
  }

  return (
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
          <button
            type="button"
            onClick={openMenu}
            className="storefront-action grid size-10 place-items-center justify-self-start -ms-2 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
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
                  "relative py-2 uppercase after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-current after:transition-transform",
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
                  "absolute inset-x-0 top-full border-b border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-xl transition duration-300 ease-[var(--motion-ease)]",
                  shopOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-3 opacity-0 pointer-events-none",
                )}
              >
                <div className="mx-auto grid max-w-[1440px] grid-cols-[0.8fr_0.8fr_1.4fr] gap-12 px-8 py-10 normal-case tracking-normal">
                  <div>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{copy.categories}</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      {navCategories.map((category) => (
                        <Link key={category} href={localize(`/shop?category=${encodeURIComponent(category)}`)} className="py-2 hover:text-[var(--accent)]">
                          {categoryLabel(locale, category)}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{copy.collections}</p>
                    <div className="grid gap-1 text-sm">
                      {navCollections.map((collection) => (
                        <Link key={collection.slug} href={localize(`/collections/${collection.slug}`)} className="py-2 hover:text-[var(--accent)]">
                          {collectionLabel(locale, collection.slug, collection.name)}
                        </Link>
                      ))}
                      <Link href={localize("/shop")} className="mt-3 underline">{copy.shopAll}</Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    {navFeaturedProducts.map((product) => (
                      <Link key={product.slug} href={localize(`/product/${product.slug}`)} className="group/card">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--card)]">
                          <Image src={product.image} alt={product.name} fill sizes="280px" className="object-cover transition duration-700 group-hover/card:scale-[1.02]" />
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
          <div className="flex items-center justify-self-end gap-0">
            <button ref={searchButtonRef} type="button" aria-label={String(copy.search)} onClick={openSearch} className="storefront-action grid size-9 place-items-center">
              <Search className="size-5" />
            </button>
            {searchMounted ? <StoreSearchDialog open={searchOpen} onOpenChange={handleSearchOpenChange} showTrigger={false} /> : null}
            <Link href={localize("/account")} aria-label={String(copy.account)} className="storefront-action hidden size-9 place-items-center sm:grid">
              <UserRound className="size-5" />
            </Link>
            <div className="hidden sm:block">
              <ThemeToggle className={isOverlay ? "text-white" : "text-[var(--foreground)]"} />
            </div>
            <Link href={localize("/account#wishlist")} aria-label={String(copy.wishlist)} className="storefront-action relative hidden size-9 place-items-center sm:grid">
              <Heart className="size-5" />
              {wishlist.length ? <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-[var(--accent)] text-[10px] leading-none text-[#111315]">{wishlist.length}</span> : null}
            </Link>
            <button aria-label={String(copy.cart)} onClick={() => setCartOpen(true)} className="storefront-action relative grid size-9 place-items-center -me-1 sm:me-0">
              <ShoppingBag className="size-5" />
              {cartCount ? <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-[var(--accent)] text-[10px] leading-none text-[#111315]">{cartCount}</span> : null}
            </button>
          </div>
        </div>
      </header>

      {menuMounted ? (
        <MobileMenu
          open={menuOpen}
          onOpenChange={handleMenuOpenChange}
          nav={nav}
          serviceLinks={serviceLinks}
          locale={locale}
          copy={copy}
          localize={localize}
          isActive={isActive}
          wishlistCount={wishlist.length}
          cartCount={cartCount}
          openSearch={openSearch}
          openCart={() => setCartOpen(true)}
        />
      ) : null}
    </>
  );
}
