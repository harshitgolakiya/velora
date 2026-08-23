"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { catalogCopy, localeFromPathname } from "@/lib/i18n";
import { usePathname } from "next/navigation";
import { absoluteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useLocalizedHref } from "@/lib/use-localized-href";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  const localize = useLocalizedHref();
  const locale = localeFromPathname(usePathname());
  const allItems: BreadcrumbItem[] = [{ label: catalogCopy[locale].home, href: "/" }, ...items];
  const Separator = locale === "ar" ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4 overflow-x-auto whitespace-nowrap sm:mb-6", className)}>
      <ol className="flex min-h-10 items-center gap-1.5 text-xs text-[var(--muted)]">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <Separator className="size-3 shrink-0" aria-hidden /> : null}
              {item.href && !isLast ? (
                <Link href={localize(item.href)} className="storefront-action -mx-2 inline-flex min-h-10 shrink-0 items-center px-2 transition hover:text-[var(--accent)] motion-reduce:transition-none">
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "inline-flex min-h-10 shrink-0 items-center text-[var(--foreground)]" : "inline-flex min-h-10 shrink-0 items-center"}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: allItems.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.label,
              ...(item.href ? { item: absoluteUrl(localize(item.href)) } : {}),
            })),
          }),
        }}
      />
    </nav>
  );
}
