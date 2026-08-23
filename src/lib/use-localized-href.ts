"use client";

import { usePathname } from "next/navigation";
import { localeFromPathname, localizedPath } from "@/lib/i18n-shell";

export function useLocalizedHref() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  return (href: string) => localizedPath(href, locale);
}
