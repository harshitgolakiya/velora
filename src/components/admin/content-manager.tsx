"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, FileText, Plus } from "lucide-react";

type PageRow = { id: string; slug: string; title: string; contentType: string; status: string; updatedAt: string; versionCount: number };

export function ContentManager({ pages }: { pages: PageRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const slug = String(form.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const response = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        contentType: form.get("contentType"),
        status: "DRAFT",
        locale: "en",
        body: "",
        blocks: [{ id: crypto.randomUUID(), type: "TEXT", heading: title, body: "Draft content." }],
      }),
    });
    const result = await response.json();
    setCreating(false);
    if (!response.ok) return setMessage(result.message ?? "Unable to create page");
    router.push(`/admin/content/${result.page.id}`);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex h-14 items-center gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5">
        <button type="button" onClick={() => router.push("/admin#content")} aria-label="Back to admin" className="grid size-9 place-items-center"><ArrowLeft className="size-4" /></button>
        <span className="text-xs font-semibold uppercase tracking-[0.16em]">Content manager</span>
      </header>
      <div className="mx-auto max-w-360 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h1 className="text-lg font-semibold">Create content</h1>
            <form onSubmit={createPage} className="mt-5 space-y-4">
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.1em]">Title<input name="title" required minLength={2} className="h-11 border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal normal-case tracking-normal" /></label>
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.1em]">Slug<input name="slug" required minLength={2} placeholder="shipping-guide" className="h-11 border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal normal-case tracking-normal" /></label>
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.1em]">Type<select name="contentType" className="h-11 border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal normal-case tracking-normal"><option value="EDITORIAL">Editorial</option><option value="GUIDE">Guide</option><option value="FAQ">FAQ</option><option value="POLICY">Policy</option><option value="SUPPORT">Support</option><option value="LEGAL">Legal</option></select></label>
              {message ? <p role="alert" className="text-sm text-red-500">{message}</p> : null}
              <button disabled={creating} className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.1em] text-[#111315] disabled:opacity-50"><Plus className="size-4" />{creating ? "Creating" : "Create draft"}</button>
            </form>
          </section>
          <section className="border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4"><h2 className="text-sm font-semibold uppercase tracking-[0.12em]">Pages — {pages.length}</h2></div>
            <div className="divide-y divide-[var(--border)]">
              {pages.length ? pages.map((page) => (
                <button key={page.id} type="button" onClick={() => router.push(`/admin/content/${page.id}`)} className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-[var(--hover)] sm:grid-cols-[1fr_160px_120px_110px] sm:items-center">
                  <span className="flex min-w-0 items-center gap-3"><FileText className="size-4 shrink-0 text-[var(--muted)]" /><span className="min-w-0"><span className="block truncate font-medium">{page.title}</span><span className="block text-xs text-[var(--muted)]">/{page.slug}</span></span></span>
                  <span className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{page.contentType}</span>
                  <span className="text-xs font-semibold uppercase">{page.status}</span>
                  <span className="text-xs text-[var(--muted)]">{page.versionCount} versions</span>
                </button>
              )) : <p className="px-5 py-12 text-center text-sm text-[var(--muted)]">No managed pages yet.</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
