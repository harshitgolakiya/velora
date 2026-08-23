"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Mail, RotateCcw, Save, Send, Variable } from "lucide-react";
import { emailTemplateVariables, workflowEmailTypes } from "@/lib/email-template-constants";

type TemplateRow = {
  id: string;
  type: string;
  locale: string;
  name: string;
  subject: string;
  bodyHtml: string;
  status: string;
  version: number;
  updatedAt: string;
  versions: Array<{ id: string; version: number; status: string; createdAt: string; createdBy: string | null }>;
};

type PreviewState = { subject: string; html: string } | null;

export function EmailTemplateManager({
  templates,
  adminEmail,
}: {
  templates: TemplateRow[];
  adminEmail: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(templates);
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const [draft, setDraft] = useState<TemplateRow | null>(templates[0] ?? null);
  const [preview, setPreview] = useState<PreviewState>(null);
  const [testRecipient, setTestRecipient] = useState(adminEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? rows[0] ?? null, [rows, selectedId]);

  function selectTemplate(id: string) {
    const row = rows.find((item) => item.id === id) ?? null;
    setSelectedId(id);
    setDraft(row ? { ...row, versions: [...row.versions] } : null);
    setPreview(null);
    setMessage(null);
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setBusy("save");
    setMessage(null);
    const response = await fetch(`/api/admin/email-templates/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        status: draft.status,
      }),
    });
    const result = await response.json();
    setBusy(null);
    if (!response.ok) return setMessage(result.message ?? "Unable to save template");
    const next = result.template as TemplateRow;
    setRows((current) => current.map((row) => (row.id === next.id ? next : row)));
    setDraft(next);
    setMessage("Template saved and versioned.");
    setPreview(null);
  }

  async function createLocale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("create");
    setMessage(null);
    const response = await fetch("/api/admin/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: form.get("type"), locale: form.get("locale") }),
    });
    const result = await response.json();
    setBusy(null);
    if (!response.ok) return setMessage(result.message ?? "Unable to create template");
    const next = { ...result.template, versions: [] } as TemplateRow;
    setRows((current) => [...current, next].sort((a, b) => `${a.type}:${a.locale}`.localeCompare(`${b.type}:${b.locale}`)));
    selectTemplate(next.id);
  }

  async function loadPreview() {
    if (!draft) return;
    setBusy("preview");
    setMessage(null);
    const response = await fetch(`/api/admin/email-templates/${draft.id}/preview`);
    const result = await response.json();
    setBusy(null);
    if (!response.ok) return setMessage(result.message ?? "Unable to preview template");
    setPreview(result);
  }

  async function sendTest() {
    if (!draft) return;
    setBusy("test");
    setMessage(null);
    const response = await fetch(`/api/admin/email-templates/${draft.id}/test-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: testRecipient }),
    });
    const result = await response.json();
    setBusy(null);
    if (!response.ok) return setMessage(result.message ?? "Unable to send test");
    setMessage(`Test email ${result.delivery.status.toLowerCase()} for ${testRecipient}.`);
  }

  async function rollback(version: number) {
    if (!draft) return;
    setBusy(`rollback-${version}`);
    setMessage(null);
    const response = await fetch(`/api/admin/email-templates/${draft.id}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });
    const result = await response.json();
    setBusy(null);
    if (!response.ok) return setMessage(result.message ?? "Unable to roll back template");
    const next = result.template as TemplateRow;
    setRows((current) => current.map((row) => (row.id === next.id ? next : row)));
    setDraft(next);
    setPreview(null);
    setMessage(`Rolled back into draft version ${next.version}.`);
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex h-14 items-center gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5">
        <button type="button" onClick={() => router.push("/admin#automation")} aria-label="Back to admin" className="grid size-9 place-items-center">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-xs font-semibold uppercase tracking-[0.16em]">Email template editor</h1>
        <button type="button" onClick={() => router.refresh()} className="ml-auto text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Refresh</button>
      </header>

      <div className="mx-auto grid max-w-360 gap-6 px-4 py-8 sm:px-6 lg:px-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">Templates</h2>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => selectTemplate(row.id)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-[var(--hover)] ${selected?.id === row.id ? "bg-[var(--hover)]" : ""}`}
                >
                  <span className="block text-sm font-semibold">{row.name}</span>
                  <span className="mt-1 block text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                    {row.type} · {row.locale} · v{row.version}
                  </span>
                  <span className={`mt-2 inline-flex px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${row.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-600" : "bg-[var(--card)] text-[var(--muted)]"}`}>
                    {row.status}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <form onSubmit={createLocale} className="space-y-3 border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">Add locale</h2>
            <select name="type" aria-label="Email template type" className="h-11 w-full border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
              {workflowEmailTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <input name="locale" aria-label="Locale code" required minLength={2} maxLength={12} placeholder="ar-AE" className="h-11 w-full border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
            <button disabled={busy === "create"} className="h-11 w-full bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.1em] text-[#17262D] disabled:opacity-50">
              Create localized draft
            </button>
          </form>
        </aside>

        {draft ? (
          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
            <form onSubmit={saveTemplate} className="space-y-5 border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex flex-wrap items-start gap-3 border-b border-[var(--border)] pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{draft.type} · {draft.locale}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{draft.name}</h2>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button type="button" onClick={loadPreview} disabled={busy === "preview"} className="inline-flex h-10 items-center gap-2 border border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.08em]"><Eye className="size-4" />Preview</button>
                  <button type="submit" disabled={busy === "save"} className="inline-flex h-10 items-center gap-2 bg-[var(--foreground)] px-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--background)]"><Save className="size-4" />Save</button>
                </div>
              </div>

              {message ? <p role="status" className="border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted)]">{message}</p> : null}

              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.1em]">Name
                  <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="h-11 border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal normal-case tracking-normal" />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.1em]">Status
                  <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="h-11 border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal normal-case tracking-normal">
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.1em]">Subject
                <input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className="h-11 border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal normal-case tracking-normal" />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.1em]">HTML body
                <textarea value={draft.bodyHtml} onChange={(event) => setDraft({ ...draft, bodyHtml: event.target.value })} rows={18} className="min-h-[420px] border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-xs font-normal normal-case leading-6 tracking-normal" />
              </label>

              <div className="border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"><Variable className="size-4" />Available variables</div>
                <div className="flex flex-wrap gap-2">
                  {emailTemplateVariables.map((variable) => <code key={variable} className="border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs">{`{{${variable}}}`}</code>)}
                </div>
              </div>
            </form>

            <aside className="space-y-6">
              <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em]"><Send className="size-4" />Test send</h3>
                <div className="mt-4 flex gap-2">
                  <input aria-label="Test recipient email" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} className="h-11 min-w-0 flex-1 border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
                  <button type="button" onClick={sendTest} disabled={busy === "test"} className="h-11 bg-[var(--accent)] px-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#17262D] disabled:opacity-50">Send</button>
                </div>
              </section>

              <section className="border border-[var(--border)] bg-[var(--surface)]">
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em]"><Mail className="size-4" />Preview</h3>
                </div>
                {preview ? (
                  <div>
                    <div className="border-b border-[var(--border)] px-5 py-3 text-sm font-semibold">{preview.subject}</div>
                    <iframe title="Email template preview" srcDoc={preview.html} className="h-[520px] w-full bg-white" />
                  </div>
                ) : (
                  <p className="px-5 py-12 text-center text-sm text-[var(--muted)]">Preview renders with sample order and customer data.</p>
                )}
              </section>

              <section className="border border-[var(--border)] bg-[var(--surface)]">
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">Versions</h3>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {draft.versions.length ? draft.versions.map((version) => (
                    <div key={version.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Version {version.version}</p>
                        <p className="text-xs text-[var(--muted)]">{new Date(version.createdAt).toLocaleString()} · {version.status}</p>
                      </div>
                      <button type="button" onClick={() => rollback(version.version)} disabled={busy === `rollback-${version.version}`} className="ml-auto inline-flex h-9 items-center gap-2 border border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.08em]"><RotateCcw className="size-3.5" />Rollback</button>
                    </div>
                  )) : <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">No versions yet.</p>}
                </div>
              </section>
            </aside>
          </div>
        ) : (
          <section className="border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--muted)]">No templates found.</section>
        )}
      </div>
    </div>
  );
}
