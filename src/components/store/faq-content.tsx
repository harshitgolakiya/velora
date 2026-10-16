"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { ContentBlock } from "@/lib/content-cms";

export function FaqContent({ blocks }: { blocks: ContentBlock[] }) {
  const [query, setQuery] = useState("");
  const groups = useMemo(
    () =>
      blocks
        .filter((block): block is Extract<ContentBlock, { type: "FAQ_GROUP" }> => block.type === "FAQ_GROUP")
        .map((block) => ({
          ...block,
          items: block.items.filter((item) =>
            `${item.question} ${item.answer}`.toLowerCase().includes(query.trim().toLowerCase()),
          ),
        }))
        .filter((block) => block.items.length),
    [blocks, query],
  );
  const count = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <div>
      <label className="relative mt-8 block max-w-2xl">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-[var(--muted)]" />
        <span className="sr-only">Search frequently asked questions</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search delivery, returns, sizing, payments..."
          className="storefront-action h-14 w-full border border-[var(--border)] bg-[var(--surface)] ps-12 pe-4 text-sm outline-none focus:border-[var(--accent)] focus:bg-[var(--background)]"
        />
      </label>
      <p className="mt-3 text-xs text-[var(--muted)]">
        {count} {count === 1 ? "answer" : "answers"}
      </p>
      <div className="mt-10 space-y-10 sm:mt-12 sm:space-y-14">
        {groups.map((group) => (
          <section key={group.id} className="grid gap-5 md:grid-cols-[220px_1fr]">
            <h2 className="text-xl font-semibold leading-tight">{group.category}</h2>
            <div className="storefront-railed divide-y divide-[var(--border)]">
              {group.items.map((item) => (
                <details key={item.question} className="group px-5 sm:px-6">
                  <summary className="storefront-action flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium hover:text-[var(--accent-text)]">
                    <span>{item.question}</span>
                    <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180 motion-reduce:transition-none" />
                  </summary>
                  <p className="storefront-body-copy max-w-3xl pb-5 text-[var(--muted)]">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        {!groups.length ? (
          <div className="storefront-railed px-5 py-12 text-center text-sm text-[var(--muted)]">
            No answers match &quot;{query}&quot;. Try a broader search.
          </div>
        ) : null}
      </div>
    </div>
  );
}
