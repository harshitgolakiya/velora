"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ContentBlock } from "@/lib/content-cms";

export function FaqContent({ blocks }: { blocks: ContentBlock[] }) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => blocks.filter((block): block is Extract<ContentBlock, { type: "FAQ_GROUP" }> => block.type === "FAQ_GROUP").map((block) => ({ ...block, items: block.items.filter((item) => `${item.question} ${item.answer}`.toLowerCase().includes(query.trim().toLowerCase())) })).filter((block) => block.items.length), [blocks, query]);
  const count = groups.reduce((total, group) => total + group.items.length, 0);
  return <div><label className="relative mt-8 block max-w-2xl"><Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-[var(--muted)]" /><span className="sr-only">Search frequently asked questions</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search delivery, returns, sizing, payments..." className="h-14 w-full border border-[var(--border)] bg-[var(--surface)] ps-12 pe-4 outline-none focus:border-[var(--accent)]" /></label><p className="mt-3 text-xs text-[var(--muted)]">{count} {count === 1 ? "answer" : "answers"}</p><div className="mt-12 space-y-14">{groups.map((group) => <section key={group.id} className="grid gap-5 md:grid-cols-[220px_1fr]"><h2 className="text-xl font-semibold">{group.category}</h2><div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">{group.items.map((item) => <details key={item.question}><summary className="cursor-pointer list-none py-5 font-medium">{item.question}</summary><p className="max-w-3xl pb-5 text-sm leading-7 text-[var(--muted)]">{item.answer}</p></details>)}</div></section>)}{!groups.length ? <div className="border-y border-[var(--border)] py-12 text-center text-sm text-[var(--muted)]">No answers match “{query}”. Try a broader search.</div> : null}</div></div>;
}
