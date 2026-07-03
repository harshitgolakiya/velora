"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { dirForLocale, localeFromPathname } from "@/lib/i18n";

export function LocaleDocument() {
  const pathname = usePathname();

  useEffect(() => {
    const locale = localeFromPathname(pathname);
    document.documentElement.lang = locale;
    document.documentElement.dir = dirForLocale(locale);
  }, [pathname]);

  return null;
}
