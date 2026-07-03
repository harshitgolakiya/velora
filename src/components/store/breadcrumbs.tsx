import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { absoluteUrl } from "@/lib/seo";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const allItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, ...items];

  return (
    <nav aria-label="Breadcrumb" className="mb-6 overflow-x-auto whitespace-nowrap">
      <ol className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <ChevronRight className="size-3 shrink-0" aria-hidden /> : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="shrink-0 transition hover:text-[var(--accent)] motion-reduce:transition-none">
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "shrink-0 text-[var(--foreground)]" : "shrink-0"}
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
              ...(item.href ? { item: absoluteUrl(item.href) } : {}),
            })),
          }),
        }}
      />
    </nav>
  );
}
