import Image from "next/image";
import Link from "next/link";
import type { ContentBlock } from "@/lib/content-cms";

export function ContentBlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return <div className="space-y-20">{blocks.map((block, index) => {
    if (block.type === "HERO") return (
      <section
        key={block.id}
        className={`relative overflow-hidden bg-[var(--card)] ${
          block.imageUrl ? "min-h-[min(72svh,760px)]" : "-mx-4 border-y border-[var(--border)] bg-[var(--surface)] sm:-mx-6 lg:-mx-8"
        }`}
      >
        {block.imageUrl ? <><Image src={block.imageUrl} alt="" fill priority={index === 0} fetchPriority={index === 0 ? "high" : undefined} loading={index === 0 ? "eager" : "lazy"} sizes="100vw" quality={84} className="object-cover" /><div className="absolute inset-0 bg-black/35" /></> : null}
        <div
          className={`relative flex max-w-3xl flex-col p-6 sm:p-10 lg:p-16 ${
            block.imageUrl ? "min-h-[min(72svh,760px)] justify-end text-white" : "justify-center py-16 sm:py-20 lg:py-24"
          }`}
        >
          {block.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em]">{block.eyebrow}</p> : null}
          <h1 className="mt-3 text-4xl font-medium leading-tight sm:text-6xl">{block.heading}</h1>
          {block.body ? <p className="mt-5 max-w-2xl text-base leading-7 opacity-90">{block.body}</p> : null}
          {block.ctaHref && block.ctaLabel ? <Link href={block.ctaHref} className="mt-7 w-fit border-b border-current pb-1 text-sm font-semibold uppercase tracking-[0.1em]">{block.ctaLabel}</Link> : null}
        </div>
      </section>
    );
    if (block.type === "TEXT" || block.type === "POLICY") return <section key={block.id} className="mx-auto max-w-3xl"><h2 className="text-3xl font-medium sm:text-4xl">{block.heading}</h2><div className="mt-5 whitespace-pre-line text-base leading-8 text-[var(--muted)]">{block.body}</div></section>;
    if (block.type === "FAQ_GROUP") return <section key={block.id} className="mx-auto max-w-4xl"><h2 className="text-2xl font-semibold">{block.category}</h2><div className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">{block.items.map((item) => <details key={item.question} className="group"><summary className="cursor-pointer list-none py-5 font-medium">{item.question}</summary><p className="pb-5 text-sm leading-7 text-[var(--muted)]">{item.answer}</p></details>)}</div></section>;
    if (block.type === "CARDS") return <section key={block.id}><h2 className="text-3xl font-medium">{block.heading}</h2><div className="mt-7 grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">{block.items.map((item) => <div key={item.title} className="bg-[var(--background)] p-6"><h3 className="font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.body}</p>{item.href ? <Link href={item.href} className="mt-5 inline-block text-sm font-medium underline underline-offset-4">Learn more</Link> : null}</div>)}</div></section>;
    return <section key={block.id}><h2 className="text-3xl font-medium">{block.heading}</h2><div className="mt-7 overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-start"><thead><tr className="border-b border-[var(--border)] text-xs uppercase tracking-[0.1em] text-[var(--muted)]"><th className="py-3">Material</th><th>Support</th><th>Feel</th><th>Best for</th></tr></thead><tbody>{block.items.map((item) => <tr key={item.name} className="border-b border-[var(--border)]"><th className="py-5 font-medium">{item.name}</th><td>{item.support}</td><td>{item.feel}</td><td>{item.bestFor}</td></tr>)}</tbody></table></div></section>;
  })}</div>;
}
