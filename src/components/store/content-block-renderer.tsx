import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import type { ContentBlock } from "@/lib/content-cms";

export function ContentBlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-10 sm:space-y-14">
      {blocks.map((block, index) => {
        if (block.type === "HERO") {
          return (
            <section
              key={block.id}
              className={`relative overflow-hidden ${
                block.imageUrl
                  ? "storefront-media-tile min-h-[min(70svh,720px)] bg-stone-950 text-white"
                  : "storefront-railed bg-[var(--surface)]"
              }`}
            >
              {block.imageUrl ? (
                <>
                  <Image
                    src={block.imageUrl}
                    alt=""
                    fill
                    priority={index === 0}
                    fetchPriority={index === 0 ? "high" : undefined}
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="100vw"
                    quality={84}
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,8,.72),rgba(5,6,8,.24)_48%,rgba(5,6,8,.08))]" />
                  <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,6,8,.56),transparent_58%)]" />
                </>
              ) : null}
              <div
                className={`relative flex max-w-4xl flex-col p-6 sm:p-10 lg:p-12 ${
                    block.imageUrl ? "min-h-[min(70svh,720px)] justify-end" : "justify-center py-10 sm:py-12 lg:py-14"
                }`}
              >
                {block.eyebrow ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                    {block.eyebrow}
                  </p>
                ) : null}
                <h1 className="mt-4 max-w-4xl text-4xl font-medium leading-[1.02] sm:text-6xl lg:text-7xl">
                  {block.heading}
                </h1>
                {block.body ? <p className="storefront-body-copy mt-6 max-w-2xl opacity-82">{block.body}</p> : null}
                {block.ctaHref && block.ctaLabel ? (
                  <Link
                    href={block.ctaHref}
                    className="storefront-action mt-8 inline-flex h-11 w-fit items-center gap-2 border border-current px-5 text-xs font-semibold uppercase tracking-[0.12em]"
                  >
                    {block.ctaLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                ) : null}
              </div>
            </section>
          );
        }

        if (block.type === "TEXT" || block.type === "POLICY") {
          return (
            <section key={block.id} className="storefront-section-rule grid gap-5 pt-6 lg:grid-cols-[0.68fr_1.32fr]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  {block.type === "POLICY" ? "Policy" : "Guide"}
                </p>
                <h2 className="mt-3 text-2xl font-medium leading-tight sm:text-4xl">{block.heading}</h2>
              </div>
              <div className="storefront-body-copy max-w-4xl whitespace-pre-line text-[var(--muted)]">
                {block.body}
              </div>
            </section>
          );
        }

        if (block.type === "FAQ_GROUP") {
          return (
            <section key={block.id} className="storefront-section-rule grid gap-5 pt-6 lg:grid-cols-[0.68fr_1.32fr]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Answers</p>
                <h2 className="mt-3 text-2xl font-medium leading-tight sm:text-3xl">{block.category}</h2>
              </div>
              <div className="storefront-railed divide-y divide-[var(--border)]">
                {block.items.map((item) => (
                  <details key={item.question} className="group">
                    <summary className="storefront-action flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 font-medium hover:text-[var(--accent)] sm:px-6">
                      <span>{item.question}</span>
                      <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" />
                    </summary>
                    <p className="storefront-body-copy max-w-3xl px-5 pb-5 text-[var(--muted)] sm:px-6">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          );
        }

        if (block.type === "CARDS") {
          return (
            <section key={block.id} className="storefront-section-rule pt-6">
              <div className="mb-7 grid gap-4 lg:grid-cols-[0.68fr_1.32fr]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Service notes</p>
                <h2 className="max-w-3xl text-3xl font-medium leading-tight sm:text-4xl">{block.heading}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {block.items.map((item) => (
                  <div key={item.title} className="storefront-framed p-5 sm:p-6">
                    <span className="mb-5 grid size-10 place-items-center rounded-[var(--radius-control)] bg-[var(--accent)] text-[#17262D]">
                      <Sparkles className="size-4" />
                    </span>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
                    {item.href ? (
                      <Link href={item.href} className="storefront-action mt-5 inline-flex min-h-10 items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                        Learn more
                        <ArrowRight className="size-4" />
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          );
        }

        return (
          <section key={block.id} className="storefront-section-rule pt-6">
            <div className="mb-7 grid gap-4 lg:grid-cols-[0.68fr_1.32fr]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Compare</p>
              <h2 className="max-w-3xl text-3xl font-medium leading-tight sm:text-4xl">{block.heading}</h2>
            </div>
            <div className="grid gap-3 sm:hidden">
              {block.items.map((item) => (
                <article key={item.name} className="storefront-framed p-5">
                  <h3 className="text-lg font-semibold">{item.name}</h3>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Support</dt>
                      <dd className="text-end text-[var(--muted)]">{item.support}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Feel</dt>
                      <dd className="text-end text-[var(--muted)]">{item.feel}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Best for</dt>
                      <dd className="text-end text-[var(--muted)]">{item.bestFor}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="storefront-framed hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] border-collapse text-start">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--card)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                    <th className="px-5 py-4 text-start">Material</th>
                    <th className="px-5 py-4 text-start">Support</th>
                    <th className="px-5 py-4 text-start">Feel</th>
                    <th className="px-5 py-4 text-start">Best for</th>
                  </tr>
                </thead>
                <tbody>
                  {block.items.map((item) => (
                    <tr key={item.name} className="border-b border-[var(--border)] last:border-b-0">
                      <th className="px-5 py-5 text-start font-medium">{item.name}</th>
                      <td className="px-5 py-5 text-sm text-[var(--muted)]">{item.support}</td>
                      <td className="px-5 py-5 text-sm text-[var(--muted)]">{item.feel}</td>
                      <td className="px-5 py-5 text-sm text-[var(--muted)]">{item.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
