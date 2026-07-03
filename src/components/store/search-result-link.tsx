"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { trackSearchClick } from "@/lib/search-click-client";

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
  return (
    <Link
      href={href}
      onClick={() =>
        trackSearchClick({
          query,
          source: "results_page",
          resultType,
          resultId,
          href,
          position,
        })
      }
      {...props}
    >
      {children}
    </Link>
  );
}
