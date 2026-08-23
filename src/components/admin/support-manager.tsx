"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Package } from "lucide-react";

type SupportCase = { id: string; caseNumber: string; name: string; email: string; category: string; subject: string; message: string; status: string; priority: string; assignedTo?: string; adminNote?: string; source: string; order?: { orderNumber: string; status: string }; createdAt: string; updatedAt: string };
const control = "h-11 w-full border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]";

export function SupportManager({ initialCases }: { initialCases: SupportCase[] }) {
  const router = useRouter();
  const [cases, setCases] = useState(initialCases);
  const [selectedId, setSelectedId] = useState(initialCases[0]?.id ?? "");
  const [filter, setFilter] = useState("ACTIVE");
  const [message, setMessage] = useState<string | null>(null);
  const visible = useMemo(() => cases.filter((item) => filter === "ALL" || (filter === "ACTIVE" ? !["RESOLVED", "CLOSED"].includes(item.status) : item.status === filter)), [cases, filter]);
  const selected = cases.find((item) => item.id === selectedId);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/support/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: form.get("status"), priority: form.get("priority"), assignedTo: form.get("assignedTo"), adminNote: form.get("adminNote") }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.message ?? "Unable to save case");
    const updated = { ...selected, ...result.supportCase, order: result.supportCase.order ?? undefined };
    setCases((current) => current.map((item) => item.id === selected.id ? updated : item));
    setMessage("Case updated.");
  }

  return <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"><header className="flex h-14 items-center gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5"><button type="button" onClick={() => router.push("/admin#support")} className="grid size-9 place-items-center" aria-label="Back"><ArrowLeft className="size-4" /></button><h1 className="text-xs font-semibold uppercase tracking-[0.16em]">Support queue</h1></header><div className="grid min-h-[calc(100vh-56px)] lg:grid-cols-[420px_1fr]">
    <aside className="border-r border-[var(--border)]"><div className="flex gap-2 border-b border-[var(--border)] p-3"><select aria-label="Filter support cases" value={filter} onChange={(event) => setFilter(event.target.value)} className={control}><option value="ACTIVE">Active cases</option><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_CUSTOMER">Waiting customer</option><option value="RESOLVED">Resolved</option><option value="ALL">All cases</option></select></div><div className="divide-y divide-[var(--border)]">{visible.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setMessage(null); }} className={`w-full p-4 text-left ${selectedId === item.id ? "bg-[var(--hover)]" : ""}`}><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-[0.08em]">{item.caseNumber}</span><span className="text-[10px] font-semibold uppercase text-[var(--muted)]">{item.priority}</span></div><p className="mt-2 truncate font-medium">{item.subject}</p><p className="mt-1 truncate text-xs text-[var(--muted)]">{item.name} · {item.category}</p></button>)}</div></aside>
    <section className="p-5 sm:p-8">{selected ? <div className="mx-auto max-w-4xl"><div className="border-b border-[var(--border)] pb-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{selected.caseNumber} · {selected.category}</p><h2 className="mt-2 text-2xl font-semibold">{selected.subject}</h2><div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--muted)]"><span className="inline-flex items-center gap-1"><Mail className="size-4" />{selected.name} · {selected.email}</span>{selected.order ? <span className="inline-flex items-center gap-1"><Package className="size-4" />{selected.order.orderNumber} · {selected.order.status}</span> : null}</div></div><div className="whitespace-pre-line border-b border-[var(--border)] py-7 text-sm leading-7">{selected.message}</div><form key={selected.id} onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-xs font-semibold uppercase">Status<select name="status" defaultValue={selected.status} className={control}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_CUSTOMER">Waiting customer</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></label><label className="grid gap-1 text-xs font-semibold uppercase">Priority<select name="priority" defaultValue={selected.priority} className={control}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></label><label className="grid gap-1 text-xs font-semibold uppercase sm:col-span-2">Assigned to<input name="assignedTo" defaultValue={selected.assignedTo ?? ""} className={control} placeholder="Team member or queue" /></label><label className="grid gap-1 text-xs font-semibold uppercase sm:col-span-2">Internal note<textarea name="adminNote" rows={6} defaultValue={selected.adminNote ?? ""} className={`${control} h-auto p-3`} /></label>{message ? <p role="status" className="text-sm text-[var(--muted)] sm:col-span-2">{message}</p> : null}<div className="sm:col-span-2"><button className="h-11 bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#17262D]">Save case</button></div></form></div> : <p className="text-sm text-[var(--muted)]">Select a support case.</p>}</section>
  </div></div>;
}
