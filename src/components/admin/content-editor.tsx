"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { ContentBlock } from "@/lib/content-cms";

type Version = { id: string; version: number; createdBy: string; createdAt: string; status: string };
type EditablePage = { id: string; slug: string; title: string; summary?: string; body: string; blocks: ContentBlock[]; contentType: string; status: string; locale: string; seoTitle?: string; seoDescription?: string; socialImage?: string; scheduledAt?: string; versions: Version[] };
const control = "h-10 w-full border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]";
const textarea = `${control} h-auto py-2`;

function newBlock(type: ContentBlock["type"]): ContentBlock {
  const id = crypto.randomUUID();
  if (type === "HERO") return { id, type, heading: "New hero", body: "" };
  if (type === "FAQ_GROUP") return { id, type, category: "General", items: [{ question: "New question", answer: "New answer" }] };
  if (type === "CARDS") return { id, type, heading: "Cards", items: [{ title: "Card", body: "Card content" }] };
  if (type === "COMPARISON") return { id, type, heading: "Comparison", items: [{ name: "Option one", support: "", feel: "", bestFor: "" }, { name: "Option two", support: "", feel: "", bestFor: "" }] };
  return { id, type, heading: type === "POLICY" ? "Policy section" : "Text section", body: "Draft content." };
}

export function ContentEditor({ initialPage }: { initialPage: EditablePage }) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [blockType, setBlockType] = useState<ContentBlock["type"]>("TEXT");
  const updateBlock = (index: number, patch: Record<string, unknown>) => setPage((current) => ({ ...current, blocks: current.blocks.map((block, position) => position === index ? { ...block, ...patch } as ContentBlock : block) }));
  const moveBlock = (index: number, direction: -1 | 1) => setPage((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.blocks.length) return current;
    const blocks = [...current.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    return { ...current, blocks };
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage(null);
    const payload = { ...page, scheduledAt: page.status === "SCHEDULED" && page.scheduledAt ? new Date(page.scheduledAt).toISOString() : null };
    const response = await fetch(`/api/admin/pages/${page.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(result.message ?? "Unable to save page");
    setPage((current) => ({ ...current, ...result.page }));
    setMessage("Page saved and version snapshot created.");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <button type="button" onClick={() => router.push("/admin/content")} className="grid size-9 place-items-center" aria-label="Back"><ArrowLeft className="size-4" /></button>
        <h1 className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.14em]">{page.title}</h1>
        <div className="ml-auto flex items-center gap-2"><button type="button" onClick={() => window.open(`/admin/content/${page.id}/preview`, "_blank")} className="inline-flex h-9 items-center gap-2 border border-[var(--border)] px-3 text-xs font-semibold uppercase"><Eye className="size-4" /> Preview</button><button form="content-editor" disabled={saving} className="h-9 bg-[var(--accent)] px-4 text-xs font-semibold uppercase text-[#111315] disabled:opacity-50">{saving ? "Saving" : "Save"}</button></div>
      </header>
      <form id="content-editor" onSubmit={save} className="mx-auto grid max-w-360 gap-6 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <section className="grid gap-4 border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold uppercase">Title<input value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })} className={control} /></label>
            <label className="grid gap-1 text-xs font-semibold uppercase">Slug<input value={page.slug} onChange={(e) => setPage({ ...page, slug: e.target.value })} className={control} /></label>
            <label className="grid gap-1 text-xs font-semibold uppercase sm:col-span-2">Summary<textarea rows={2} value={page.summary ?? ""} onChange={(e) => setPage({ ...page, summary: e.target.value })} className={textarea} /></label>
          </section>
          {page.blocks.map((block, index) => (
            <section key={block.id} className="border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3"><span className="text-xs font-semibold uppercase tracking-[0.12em]">{index + 1}. {block.type.replaceAll("_", " ")}</span><div className="ml-auto flex"><button type="button" onClick={() => moveBlock(index, -1)} aria-label="Move up" className="grid size-8 place-items-center"><ArrowUp className="size-4" /></button><button type="button" onClick={() => moveBlock(index, 1)} aria-label="Move down" className="grid size-8 place-items-center"><ArrowDown className="size-4" /></button><button type="button" onClick={() => setPage((current) => ({ ...current, blocks: current.blocks.filter((_, position) => position !== index) }))} aria-label="Delete block" className="grid size-8 place-items-center text-red-500"><Trash2 className="size-4" /></button></div></div>
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                {block.type === "HERO" ? <><label className="grid gap-1 text-xs font-semibold uppercase">Eyebrow<input value={block.eyebrow ?? ""} onChange={(e) => updateBlock(index, { eyebrow: e.target.value })} className={control} /></label><label className="grid gap-1 text-xs font-semibold uppercase">Heading<input value={block.heading} onChange={(e) => updateBlock(index, { heading: e.target.value })} className={control} /></label><label className="grid gap-1 text-xs font-semibold uppercase sm:col-span-2">Body<textarea rows={3} value={block.body ?? ""} onChange={(e) => updateBlock(index, { body: e.target.value })} className={textarea} /></label><label className="grid gap-1 text-xs font-semibold uppercase">Desktop image<input value={block.imageUrl ?? ""} onChange={(e) => updateBlock(index, { imageUrl: e.target.value || undefined })} className={control} /></label><label className="grid gap-1 text-xs font-semibold uppercase">Mobile image<input value={block.mobileImageUrl ?? ""} onChange={(e) => updateBlock(index, { mobileImageUrl: e.target.value || undefined })} className={control} /></label></> : null}
                {block.type === "TEXT" || block.type === "POLICY" ? <><label className="grid gap-1 text-xs font-semibold uppercase sm:col-span-2">Heading<input value={block.heading} onChange={(e) => updateBlock(index, { heading: e.target.value })} className={control} /></label><label className="grid gap-1 text-xs font-semibold uppercase sm:col-span-2">Body<textarea rows={6} value={block.body} onChange={(e) => updateBlock(index, { body: e.target.value })} className={textarea} /></label></> : null}
                {block.type === "FAQ_GROUP" ? <><label className="grid gap-1 text-xs font-semibold uppercase sm:col-span-2">Category<input value={block.category} onChange={(e) => updateBlock(index, { category: e.target.value })} className={control} /></label>{block.items.map((item, itemIndex) => <div key={itemIndex} className="space-y-2 border border-[var(--border)] p-3 sm:col-span-2"><input aria-label={`FAQ question ${itemIndex + 1}`} value={item.question} onChange={(e) => updateBlock(index, { items: block.items.map((entry, position) => position === itemIndex ? { ...entry, question: e.target.value } : entry) })} className={control} /><textarea aria-label={`FAQ answer ${itemIndex + 1}`} rows={3} value={item.answer} onChange={(e) => updateBlock(index, { items: block.items.map((entry, position) => position === itemIndex ? { ...entry, answer: e.target.value } : entry) })} className={textarea} /></div>)}<button type="button" onClick={() => updateBlock(index, { items: [...block.items, { question: "New question", answer: "New answer" }] })} className="h-9 border border-[var(--border)] px-3 text-xs font-semibold uppercase"><Plus className="mr-1 inline size-3" /> Question</button></> : null}
                {block.type === "CARDS" ? <><label className="grid gap-1 text-xs font-semibold uppercase sm:col-span-2">Heading<input value={block.heading} onChange={(e) => updateBlock(index, { heading: e.target.value })} className={control} /></label>{block.items.map((item, itemIndex) => <div key={itemIndex} className="grid gap-2 border border-[var(--border)] p-3 sm:col-span-2 sm:grid-cols-2"><input aria-label={`Card ${itemIndex + 1} title`} value={item.title} onChange={(e) => updateBlock(index, { items: block.items.map((entry, position) => position === itemIndex ? { ...entry, title: e.target.value } : entry) })} className={control} placeholder="Card title" /><input aria-label={`Card ${itemIndex + 1} link`} value={item.href ?? ""} onChange={(e) => updateBlock(index, { items: block.items.map((entry, position) => position === itemIndex ? { ...entry, href: e.target.value || undefined } : entry) })} className={control} placeholder="Internal path or HTTPS URL" /><textarea aria-label={`Card ${itemIndex + 1} body`} rows={3} value={item.body} onChange={(e) => updateBlock(index, { items: block.items.map((entry, position) => position === itemIndex ? { ...entry, body: e.target.value } : entry) })} className={`${textarea} sm:col-span-2`} /></div>)}<button type="button" onClick={() => updateBlock(index, { items: [...block.items, { title: "New card", body: "Card content" }] })} className="h-9 border border-[var(--border)] px-3 text-xs font-semibold uppercase"><Plus className="mr-1 inline size-3" /> Card</button></> : null}
                {block.type === "COMPARISON" ? <><label className="grid gap-1 text-xs font-semibold uppercase sm:col-span-2">Heading<input value={block.heading} onChange={(e) => updateBlock(index, { heading: e.target.value })} className={control} /></label>{block.items.map((item, itemIndex) => <div key={itemIndex} className="grid gap-2 border border-[var(--border)] p-3 sm:col-span-2 sm:grid-cols-2"><input aria-label={`Comparison row ${itemIndex + 1} name`} value={item.name} onChange={(e) => updateBlock(index, { items: block.items.map((entry, position) => position === itemIndex ? { ...entry, name: e.target.value } : entry) })} className={control} placeholder="Name" /><input aria-label={`Comparison row ${itemIndex + 1} support`} value={item.support} onChange={(e) => updateBlock(index, { items: block.items.map((entry, position) => position === itemIndex ? { ...entry, support: e.target.value } : entry) })} className={control} placeholder="Support" /><input aria-label={`Comparison row ${itemIndex + 1} feel`} value={item.feel} onChange={(e) => updateBlock(index, { items: block.items.map((entry, position) => position === itemIndex ? { ...entry, feel: e.target.value } : entry) })} className={control} placeholder="Feel" /><input aria-label={`Comparison row ${itemIndex + 1} best for`} value={item.bestFor} onChange={(e) => updateBlock(index, { items: block.items.map((entry, position) => position === itemIndex ? { ...entry, bestFor: e.target.value } : entry) })} className={control} placeholder="Best for" /></div>)}<button type="button" onClick={() => updateBlock(index, { items: [...block.items, { name: "New option", support: "", feel: "", bestFor: "" }] })} className="h-9 border border-[var(--border)] px-3 text-xs font-semibold uppercase"><Plus className="mr-1 inline size-3" /> Row</button></> : null}
              </div>
            </section>
          ))}
          <div className="flex items-center gap-2 border border-dashed border-[var(--border)] p-4"><select aria-label="New content block type" value={blockType} onChange={(e) => setBlockType(e.target.value as ContentBlock["type"])} className={control}><option value="HERO">Hero</option><option value="TEXT">Text</option><option value="FAQ_GROUP">FAQ group</option><option value="POLICY">Policy</option><option value="CARDS">Cards</option><option value="COMPARISON">Comparison</option></select><button type="button" onClick={() => setPage((current) => ({ ...current, blocks: [...current.blocks, newBlock(blockType)] }))} className="h-10 shrink-0 bg-[var(--foreground)] px-4 text-xs font-semibold uppercase text-[var(--background)]"><Plus className="mr-1 inline size-4" /> Add block</button></div>
          {message ? <p role="status" className="text-sm text-[var(--muted)]">{message}</p> : null}
        </div>
        <aside className="space-y-5">
          <section className="border border-[var(--border)] bg-[var(--surface)] p-4"><h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Publication</h2><label className="mt-4 grid gap-1 text-xs font-semibold uppercase">Status<select value={page.status} onChange={(e) => setPage({ ...page, status: e.target.value })} className={control}><option value="DRAFT">Draft</option><option value="SCHEDULED">Scheduled</option><option value="PUBLISHED">Published</option></select></label>{page.status === "SCHEDULED" ? <label className="mt-3 grid gap-1 text-xs font-semibold uppercase">Publish at<input type="datetime-local" value={page.scheduledAt?.slice(0, 16) ?? ""} onChange={(e) => setPage({ ...page, scheduledAt: e.target.value })} className={control} /></label> : null}<label className="mt-3 grid gap-1 text-xs font-semibold uppercase">Content type<select value={page.contentType} onChange={(e) => setPage({ ...page, contentType: e.target.value })} className={control}><option value="EDITORIAL">Editorial</option><option value="GUIDE">Guide</option><option value="FAQ">FAQ</option><option value="POLICY">Policy</option><option value="SUPPORT">Support</option><option value="LEGAL">Legal</option></select></label></section>
          <section className="border border-[var(--border)] bg-[var(--surface)] p-4"><h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Search preview</h2><label className="mt-4 grid gap-1 text-xs font-semibold uppercase">SEO title<input value={page.seoTitle ?? ""} onChange={(e) => setPage({ ...page, seoTitle: e.target.value })} className={control} /></label><label className="mt-3 grid gap-1 text-xs font-semibold uppercase">SEO description<textarea rows={4} value={page.seoDescription ?? ""} onChange={(e) => setPage({ ...page, seoDescription: e.target.value })} className={textarea} /></label><label className="mt-3 grid gap-1 text-xs font-semibold uppercase">Social image<input value={page.socialImage ?? ""} onChange={(e) => setPage({ ...page, socialImage: e.target.value })} className={control} placeholder="/images/..." /></label><div className="mt-4 border border-[var(--border)] bg-[var(--background)] p-3 text-sm"><p className="font-semibold">{page.seoTitle || page.title}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{page.seoDescription || page.summary || "SEO description preview"}</p></div></section>
          <section className="border border-[var(--border)] bg-[var(--surface)] p-4"><h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Version history</h2><div className="mt-3 max-h-80 divide-y divide-[var(--border)] overflow-y-auto">{page.versions.length ? page.versions.map((version) => <div key={version.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">Version {version.version}</p><p className="text-xs text-[var(--muted)]">{new Date(version.createdAt).toLocaleString()} · {version.createdBy}</p></div><button type="button" onClick={async () => { const response = await fetch(`/api/admin/pages/${page.id}/rollback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId: version.id }) }); const result = await response.json(); if (!response.ok) return setMessage(result.message); setPage((current) => ({ ...current, ...result.page, versions: current.versions })); setMessage(`Restored version ${version.version} as a draft.`); }} className="grid size-8 place-items-center" title="Restore as draft"><RotateCcw className="size-4" /></button></div>) : <p className="py-3 text-xs text-[var(--muted)]">Versions appear after the first save.</p>}</div></section>
        </aside>
      </form>
    </div>
  );
}
