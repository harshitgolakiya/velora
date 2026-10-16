"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Heart, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { AnnouncementBar } from "@/components/store/announcement-bar";
import { ThemeToggle } from "@/components/store/theme-toggle";
import { enabledSorted, localText, type GlobalContent } from "@/lib/global-content";
import { categoryLabel, collectionLabel, localeFromPathname, localizedPath, shellCopy, stripLocale } from "@/lib/i18n-shell";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const navCategories = ["Tops", "Sports Bras", "Jackets", "Leggings", "Accessories"];

const navCollections = [
  { slug: "pilates-studio", name: "Pilates", href: "/collections/pilates-studio" },
  { slug: "court-club", name: "Tennis", href: "/collections/court-club" },
  { slug: "everyday-motion", name: "Everyday", href: "/collections/everyday-motion" },
];

const navFeaturedProducts = [
  {
    href: "/shop?category=Leggings",
    name: "Performance leggings",
    image: "/images/campaign/legging-sage-back.webp",
  },
  {
    href: "/shop?category=Sports%20Bras",
    name: "Supportive sports bras",
    image: "/images/campaign/bra-sage-front.webp",
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

const AccountDialog = dynamic(
  () => import("@/components/store/account-dialog").then((mod) => mod.AccountDialog),
  { ssr: false },
);

export function Header({ globalContent }: { globalContent: GlobalContent }) {
  const pathname = usePathname();
  const router = useRouter();
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMounted, setAccountMounted] = useState(false);
  const [accountStatus, setAccountStatus] = useState<"loading" | "guest" | "authenticated">("loading");
  const [shopOpen, setShopOpen] = useState(false);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const menuUnmountTimer = useRef<number | undefined>(undefined);
  const searchUnmountTimer = useRef<number | undefined>(undefined);
  const accountUnmountTimer = useRef<number | undefined>(undefined);
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
    let cancelled = false;
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((session) => {
        if (!cancelled) setAccountStatus(session?.user ? "authenticated" : "guest");
      })
      .catch(() => {
        if (!cancelled) setAccountStatus("guest");
      });
    return () => {
      cancelled = true;
    };
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
    window.dispatchEvent(new CustomEvent("velora:surface-open", { detail: "menu" }));
    setShopOpen(false);
    setSearchOpen(false);
    setAccountOpen(false);
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
    window.dispatchEvent(new CustomEvent("velora:surface-open", { detail: "search" }));
    setShopOpen(false);
    setMenuOpen(false);
    setAccountOpen(false);
    setSearchMounted(true);
    window.requestAnimationFrame(() => setSearchOpen(true));
  }

  function openAccount() {
    if (accountStatus === "authenticated") {
      router.push(localize("/account"));
      return;
    }
    if (accountUnmountTimer.current) window.clearTimeout(accountUnmountTimer.current);
    window.dispatchEvent(new CustomEvent("velora:surface-open", { detail: "account" }));
    setShopOpen(false);
    setMenuOpen(false);
    setSearchOpen(false);
    setAccountMounted(true);
    window.requestAnimationFrame(() => setAccountOpen(true));
  }

  function openCart() {
    window.dispatchEvent(new CustomEvent("velora:surface-open", { detail: "cart" }));
    setShopOpen(false);
    setMenuOpen(false);
    setSearchOpen(false);
    setAccountOpen(false);
    setCartOpen(true);
  }

  function handleSearchOpenChange(open: boolean) {
    setSearchOpen(open);
    if (!open) {
      window.requestAnimationFrame(() => searchButtonRef.current?.focus());
      searchUnmountTimer.current = window.setTimeout(() => setSearchMounted(false), 260);
    }
  }

  function handleAccountOpenChange(open: boolean) {
    setAccountOpen(open);
    if (!open) {
      accountUnmountTimer.current = window.setTimeout(() => setAccountMounted(false), 260);
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
            ? "border-[var(--paper)]/15 bg-transparent text-[var(--paper)]"
            : "border-[var(--border)] bg-[var(--background)]/96 text-[var(--foreground)] backdrop-blur-xl",
        )}
      >
        <div className="storefront-container relative grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-[72px]">
          <button
            type="button"
            onClick={openMenu}
            className="storefront-action storefront-icon-button col-start-1 row-start-1 grid size-10 place-items-center justify-self-start xl:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <Link
            href={localize("/")}
            className={cn(
              "absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 font-serif text-[2rem] font-medium leading-none tracking-[0.03em] md:text-[2.25rem]",
              isOverlay ? "text-[var(--paper)] drop-shadow-[0_1px_14px_rgba(20,16,12,0.55)]" : "text-[var(--foreground)]",
            )}
          >
            Velora
          </Link>
          <nav className="col-start-1 row-start-1 hidden h-full min-w-0 items-center justify-start gap-7 text-[11px] font-semibold uppercase tracking-[0.16em] xl:flex">
            <div
              className="flex h-full items-center"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
              onFocus={() => setShopOpen(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setShopOpen(false);
              }}
            >
              <Link
                href={localize("/shop")}
                aria-expanded={shopOpen}
                aria-controls="desktop-shop-menu"
                aria-current={basePath === "/shop" ? "page" : undefined}
                className={cn(
                  "relative py-2 uppercase after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-current after:transition-transform",
                  basePath.startsWith("/shop") || basePath.startsWith("/collections")
                    ? "after:scale-x-100"
                    : "after:scale-x-0 hover:after:scale-x-100",
                )}
                onClick={() => setShopOpen(false)}
              >
                {copy.shop}
              </Link>
              <div
                id="desktop-shop-menu"
                className={cn(
                  "absolute inset-x-0 top-full border-b border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-xl transition duration-300 ease-[var(--motion-ease)]",
                  shopOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-3 opacity-0 pointer-events-none",
                )}
              >
                <div className="storefront-container grid grid-cols-[0.8fr_0.8fr_1.4fr] gap-12 py-10 normal-case tracking-normal">
                  <div>
                    <p className="eyebrow eyebrow-muted mb-4">{copy.categories}</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      {navCategories.map((category) => (
                        <Link key={category} href={localize(`/shop?category=${encodeURIComponent(category)}`)} className="flex min-h-10 items-center py-2 text-[var(--foreground)]/80 hover:text-[var(--foreground)]">
                          {categoryLabel(locale, category)}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="eyebrow eyebrow-muted mb-4">{copy.collections}</p>
                    <div className="grid gap-1 text-sm">
                      {navCollections.map((collection) => (
                        <Link key={collection.slug} href={localize(collection.href)} className="flex min-h-10 items-center py-2 text-[var(--foreground)]/80 hover:text-[var(--foreground)]">
                          {collectionLabel(locale, collection.slug, collection.name)}
                        </Link>
                      ))}
                      <Link href={localize("/shop")} className="btn btn-link btn-sm mt-4 w-fit self-start">
                        {copy.shopAll}
                        <span aria-hidden="true">+</span>
                      </Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    {navFeaturedProducts.map((product) => (
                      <Link key={product.href} href={localize(product.href)} className="group/card storefront-action">
                        <div className="storefront-product-media relative aspect-[4/5] bg-[var(--card)]">
                          <Image src={product.image} alt={product.name} fill sizes="280px" className="object-cover transition duration-700 group-hover/card:scale-[1.02]" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/30 via-transparent to-transparent opacity-0 transition duration-300 group-hover/card:opacity-100" />
                        </div>
                        <p className="mt-3 text-sm font-medium">{product.name}</p>
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
          <div className="storefront-header-actions col-start-3 row-start-1 flex h-full items-center justify-self-end gap-0">
            <button ref={searchButtonRef} type="button" aria-label={String(copy.search)} onClick={openSearch} className="storefront-action storefront-icon-button grid size-10 place-items-center">
              <Search className="size-5" />
            </button>
            {searchMounted ? <StoreSearchDialog open={searchOpen} onOpenChange={handleSearchOpenChange} showTrigger={false} /> : null}
            <button
              type="button"
              aria-label={String(copy.account)}
              onClick={openAccount}
              className="storefront-action storefront-icon-button hidden size-10 place-items-center sm:grid"
              aria-haspopup={accountStatus === "authenticated" ? undefined : "dialog"}
            >
              <UserRound className="size-5" />
            </button>
            {accountMounted ? <AccountDialog open={accountOpen} onOpenChange={handleAccountOpenChange} accountHref={localize("/account")} /> : null}
            <div className="hidden sm:block">
              <ThemeToggle className={isOverlay ? "text-[var(--paper)]" : "text-[var(--foreground)]"} />
            </div>
            <Link href={localize("/account/wishlist")} aria-label={String(copy.wishlist)} className="storefront-action storefront-icon-button relative hidden size-10 place-items-center sm:grid">
              <Heart className="size-5" />
              {wishlist.length ? <span className="storefront-count-badge storefront-header-badge absolute">{wishlist.length}</span> : null}
            </Link>
            <button aria-label={String(copy.cart)} onClick={openCart} className="storefront-action storefront-icon-button relative grid size-10 place-items-center">
              <ShoppingBag className="size-5" />
              {cartCount ? <span className="storefront-count-badge storefront-header-badge absolute">{cartCount}</span> : null}
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
          openCart={openCart}
          openAccount={openAccount}
        />
      ) : null}
    </>
  );
}
