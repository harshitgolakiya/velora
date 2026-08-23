"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { trackSearchClick } from "@/lib/search-click-client";
import { useLocalizedHref } from "@/lib/use-localized-href";

type SearchResultLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  children: ReactNode;
  href: string;
  query: string;
  resultType: "category" | "collection" | "page";
  resultId?: string;
  position?: number;
};

export function SearchResultLink({
  children,
  href,
  query,
  resultType,
  resultId,
  position,
  ...props
}: SearchResultLinkProps) {
  const localize = useLocalizedHref();
  const localizedHref = localize(href);
  return (
    <Link
      href={localizedHref}
      onClick={() =>
        trackSearchClick({
          query,
          source: "results_page",
          resultType,
          resultId,
          href: localizedHref,
          position,
        })
      }
      {...props}
    >
      {children}
    </Link>
  );
}
