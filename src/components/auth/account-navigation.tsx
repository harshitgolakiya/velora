"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, MapPin, PackageCheck, RotateCcw, ShieldAlert, UserRound } from "lucide-react";
import { accountCopy, localeFromPathname } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n-shell";
export type AccountNavigationSection = "overview" | "orders" | "returns" | "wishlist" | "addresses" | "settings";

export function AccountNavigation({ section }: { section: AccountNavigationSection }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = localeFromPathname(pathname);
  const copy = accountCopy[locale];
  const links = [
    { id: "overview", label: copy.overview, href: localizedPath("/account", locale), Icon: UserRound },
    { id: "orders", label: copy.orders, href: localizedPath("/account/orders", locale), Icon: PackageCheck },
    { id: "returns", label: copy.returns, href: localizedPath("/account/returns", locale), Icon: RotateCcw },
    { id: "wishlist", label: copy.wishlist, href: localizedPath("/account/wishlist", locale), Icon: Heart },
    { id: "addresses", label: copy.addresses, href: localizedPath("/account/addresses", locale), Icon: MapPin },
    { id: "settings", label: copy.settings, href: localizedPath("/account/settings", locale), Icon: ShieldAlert },
  ] as const;

  return (
    <nav aria-label={copy.accountSections} className="sticky top-16 z-20 -mx-4 storefront-railed bg-[var(--background)] p-3 sm:-mx-6 sm:px-6 md:static md:mx-0 md:border md:bg-[var(--surface)] md:p-0">
      <select
        aria-label={copy.accountSections}
        value={links.find((item) => item.id === section)?.href}
        onChange={(event) => router.push(event.currentTarget.value)}
        className="h-11 w-full storefront-framed px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)] md:hidden motion-reduce:transition-none"
      >
        {links.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
      </select>
      <div className="hidden md:grid md:grid-cols-6">
        {links.map(({ id, label, href, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={section === id ? "page" : undefined}
            className={`inline-flex h-12 items-center justify-center gap-2 border-b-2 px-3 text-xs font-semibold uppercase transition motion-reduce:transition-none ${section === id ? "border-[var(--accent)] bg-[var(--hover)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"}`}
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
