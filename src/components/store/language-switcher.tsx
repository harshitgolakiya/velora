"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { localeFromPathname, localizedPath, shellCopy } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const nextLocale = locale === "ar" ? "en" : "ar";
  const copy = shellCopy[locale];

  return (
    <Link
      href={localizedPath(pathname, nextLocale)}
      className={`inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] transition hover:text-[var(--accent)] ${className}`}
      aria-label={locale === "ar" ? "Switch to English" : "Switch to Arabic"}
      hrefLang={nextLocale}
    >
      {copy.languageName}
      <ChevronDown className="size-3" />
    </Link>
  );
}
