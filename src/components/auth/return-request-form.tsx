"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Check, CheckCircle2, PackageCheck, RefreshCw, RotateCcw, WalletCards } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { localeFromPathname, returnReasonLabel, returnRequestCopy } from "@/lib/i18n";

type Resolution = "return" | "exchange" | "refund";

type ExchangeSize = {
  variantId: string;
  size: string;
  sku: string | null;
  available: boolean;
  isCurrent: boolean;
};

type ReturnRequestItem = {
  id: string;
  title: string;
  color: string;
  size: string;
  quantity: number;
  variantId: string | null;
  exchangeSizes: ExchangeSize[];
};

type ExistingReturnRequest = {
  resolution: string;
  reason: string;
  notes: string;
  adminNote: string | null;
  status: string;
  createdAt: string;
  replacementOrder: {
    orderNumber: string;
    status: string;
    fulfillmentStatus: string;
    shipmentStatus: string | null;
    trackingNo: string | null;
  } | null;
  returnShipment: {
    status: string;
    carrier: string | null;
    trackingNo: string | null;
    pickupStart: string | null;
    pickupEnd: string | null;
    labelId: string | null;
  } | null;
  inspection: {
    condition: string;
    disposition: string;
    notes: string | null;
    inspectedAt: string;
  } | null;
  refund: {
    amount: number;
    status: string;
    provider: string;
    providerRef: string | null;
    note: string | null;
    updatedAt: string;
  } | null;
  events: Array<{
    id: string;
    status: string;
    message: string | null;
    createdAt: string;
  }>;
  evidence: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    url: string;
  }>;
  items: Array<{
    title: string;
    color: string;
    originalSize: string;
    requestedSize: string | null;
    quantity: number;
  }>;
};

const resolutionIcons: Record<Resolution, typeof RotateCcw> = {
  return: RotateCcw,
  exchange: RefreshCw,
  refund: WalletCards,
};

const reasons: Record<Resolution, string[]> = {
  return: ["Changed my mind", "Fit issue", "Quality not as expected", "Ordered by mistake", "Other"],
  exchange: ["Fit issue", "Wrong item received", "Damaged item", "Color not as expected", "Other"],
  refund: ["Damaged item", "Wrong item received", "Item missing", "Delivery issue", "Other"],
};

export function ReturnRequestForm({
  orderNumber,
  items,
  requested,
  existingRequest,
  availableResolutions = ["return", "exchange", "refund"],
}: {
  orderNumber: string;
  items: ReturnRequestItem[];
  requested: boolean;
  existingRequest?: ExistingReturnRequest;
  availableResolutions?: Resolution[];
}) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const copy = returnRequestCopy[locale];
  const resolutionOptions: Array<{ value: Resolution; label: string; description: string; icon: typeof RotateCcw }> = [
    { value: "return", label: copy.returnLabel, description: copy.returnDescription, icon: resolutionIcons.return },
    { value: "exchange", label: copy.exchangeLabel, description: copy.exchangeDescription, icon: resolutionIcons.exchange },
    { value: "refund", label: copy.refundLabel, description: copy.refundDescription, icon: resolutionIcons.refund },
  ];
  const defaultResolution = availableResolutions.includes("exchange") ? "exchange" : availableResolutions[0] ?? "return";
  const [resolution, setResolution] = useState<Resolution>(defaultResolution);
  const [reason, setReason] = useState(reasons[defaultResolution][0]);
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState(items.map((item) => item.id));
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>(
    Object.fromEntries(items.map((item) => [item.id, item.quantity])),
  );
  const [exchangeSelections, setExchangeSelections] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(
    requested ? copy.requestAlreadyAttached : null,
  );
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(requested);
  const [submittedRequest, setSubmittedRequest] = useState(existingRequest);
  const [followUp, setFollowUp] = useState("");
  const [followUpMessage, setFollowUpMessage] = useState<string | null>(null);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancellationMessage, setCancellationMessage] = useState<string | null>(null);

  const needsSizeSelection = resolution === "exchange" && reason === "Fit issue";
  const selectedCount = selectedItems.length;
  const missingSizeSelection = useMemo(
    () =>
      needsSizeSelection &&
      selectedItems.some((itemId) => {
        const item = items.find((candidate) => candidate.id === itemId);
        const alternatives = item?.exchangeSizes.filter((size) => size.available && !size.isCurrent) ?? [];
        return alternatives.length > 0 && !exchangeSelections[itemId];
      }),
    [exchangeSelections, items, needsSizeSelection, selectedItems],
  );

  async function sendFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendingFollowUp(true);
    setFollowUpMessage(null);
    try {
      const response = await fetch(`/api/account/orders/${orderNumber}/return-request`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: followUp }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? copy.unableToSendResponse);
      setSubmittedRequest((current) => current ? {
        ...current,
        status: result.request.status,
        notes: result.request.notes,
        events: result.request.events,
      } : current);
      setFollowUp("");
      setFollowUpMessage(result.message);
    } catch (error) {
      setFollowUpMessage(error instanceof Error ? error.message : copy.unableToSendResponse);
    } finally {
      setSendingFollowUp(false);
    }
  }

  async function uploadEvidence(files: File[]) {
    if (!files.length) return [];
    setUploadingEvidence(true);
    setEvidenceMessage(null);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      const response = await fetch(`/api/account/orders/${orderNumber}/return-request/evidence`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? copy.unableToUploadEvidence);
      setEvidenceMessage(result.message ?? copy.evidenceUploaded);
      setSubmittedRequest((current) => current ? { ...current, evidence: [...current.evidence, ...result.evidence] } : current);
      setEvidenceFiles([]);
      return result.evidence as ExistingReturnRequest["evidence"];
    } catch (error) {
      setEvidenceMessage(error instanceof Error ? error.message : copy.unableToUploadEvidence);
      throw error;
    } finally {
      setUploadingEvidence(false);
    }
  }

  async function cancelRequest() {
    if (!window.confirm(copy.confirmCancelRequest)) return;
    setCancelling(true);
    setCancellationMessage(null);
    try {
      const response = await fetch(`/api/account/orders/${orderNumber}/return-request`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? copy.unableToCancelRequest);
      setSubmittedRequest((current) => current ? {
        ...current,
        status: result.request.status,
        events: result.request.events,
      } : current);
      setCancellationMessage(result.message);
    } catch (error) {
      setCancellationMessage(error instanceof Error ? error.message : copy.unableToCancelRequest);
    } finally {
      setCancelling(false);
    }
  }

  if (submittedRequest) {
    const requestRecord = submittedRequest;
    return (
      <section className="border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-start gap-3 border-b border-[var(--border)] px-5 py-5 sm:px-6">
          <span className="grid size-10 shrink-0 place-items-center bg-[var(--card)] text-[var(--accent)]">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{copy.requestSubmitted}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {requestRecord.resolution.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())} / {requestRecord.reason}
                </p>
              </div>
              <span className="border border-[var(--accent)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
                {requestRecord.status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {copy.submitted} {new Date(requestRecord.createdAt).toLocaleString("en-AE")}
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6">
          <div>
            <h3 className="text-sm font-semibold">{copy.items}</h3>
            <div className="mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {requestRecord.items.map((item, index) => (
                <div key={`${item.title}-${item.originalSize}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{item.color} / {copy.size} {item.originalSize} / {copy.qty} {item.quantity}</p>
                  </div>
                  {item.requestedSize ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                      {copy.replacement}: {item.requestedSize}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {requestRecord.notes ? (
            <div>
              <h3 className="text-sm font-semibold">{copy.yourNote}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{requestRecord.notes}</p>
            </div>
          ) : null}

          {requestRecord.adminNote ? (
            <div className="border border-[var(--border)] bg-[var(--card)] p-4">
              <h3 className="text-sm font-semibold">{copy.updateFromSupport}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{requestRecord.adminNote}</p>
            </div>
          ) : null}

          {requestRecord.returnShipment ? (
            <div className="border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">{copy.returnPickup}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {requestRecord.returnShipment.pickupStart && requestRecord.returnShipment.pickupEnd
                      ? `${new Date(requestRecord.returnShipment.pickupStart).toLocaleString("en-AE")} - ${new Date(requestRecord.returnShipment.pickupEnd).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}`
                      : copy.pickupWindowPending}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {requestRecord.returnShipment.carrier ?? copy.carrierPending}{requestRecord.returnShipment.trackingNo ? ` / ${requestRecord.returnShipment.trackingNo}` : ""} / {requestRecord.returnShipment.status.replaceAll("_", " ")}
                  </p>
                </div>
                {requestRecord.returnShipment.labelId ? (
                  <a href={`/api/account/orders/${orderNumber}/return-request/label`} target="_blank" className="inline-flex h-10 items-center justify-center border border-[var(--foreground)] px-4 text-xs font-semibold uppercase tracking-[0.08em]">
                    {copy.printReturnLabel}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {requestRecord.inspection ? (
            <div className="border border-[var(--border)] bg-[var(--card)] p-4">
              <h3 className="text-sm font-semibold">{copy.warehouseInspectionComplete}</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {copy.condition}: {requestRecord.inspection.condition.toLowerCase()} / {copy.nextHandling}: {requestRecord.inspection.disposition.replaceAll("_", " ").toLowerCase()}
              </p>
              {requestRecord.inspection.notes ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{requestRecord.inspection.notes}</p> : null}
            </div>
          ) : null}

          {requestRecord.refund ? (
            <div className="border border-[var(--accent)] bg-[var(--card)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">{copy.refundProgress}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">AED {requestRecord.refund.amount.toFixed(2)} / {requestRecord.refund.provider.replaceAll("_", " ")} / {requestRecord.refund.status.replaceAll("_", " ").toLowerCase()}</p>
                </div>
                <span className="border border-[var(--accent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">{requestRecord.refund.status.replaceAll("_", " ")}</span>
              </div>
              {requestRecord.refund.note ? <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{requestRecord.refund.note}</p> : null}
            </div>
          ) : null}

          {requestRecord.replacementOrder ? (
            <div className="border border-[var(--accent)] bg-[var(--card)] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div>
                <h3 className="text-sm font-semibold">{copy.replacementOrder} {requestRecord.replacementOrder.orderNumber}</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  {requestRecord.replacementOrder.fulfillmentStatus.replaceAll("_", " ")} / {requestRecord.replacementOrder.shipmentStatus?.replaceAll("_", " ") ?? copy.shipmentPending}
                  {requestRecord.replacementOrder.trackingNo ? ` / ${requestRecord.replacementOrder.trackingNo}` : ""}
                </p>
              </div>
              <a href={`/account/orders/${requestRecord.replacementOrder.orderNumber}`} className="mt-3 inline-flex h-10 items-center justify-center border border-[var(--foreground)] px-4 text-xs font-semibold uppercase tracking-[0.08em] sm:mt-0">
                {copy.viewReplacement}
              </a>
            </div>
          ) : null}

          {requestRecord.events.length ? (
            <div>
              <h3 className="text-sm font-semibold">{copy.requestTimeline}</h3>
              <ol className="mt-3 space-y-3">
                {requestRecord.events.map((event) => (
                  <li key={event.id} className="grid grid-cols-[12px_minmax(0,1fr)] gap-3 text-sm">
                    <span className="mt-1.5 size-2 bg-[var(--accent)]" />
                    <span>
                      <span className="font-semibold">{event.status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}</span>
                      <span className="ms-2 text-xs text-[var(--muted)]">{new Date(event.createdAt).toLocaleString("en-AE")}</span>
                      {event.message ? <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{event.message}</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {requestRecord.evidence.length ? (
            <div>
              <h3 className="text-sm font-semibold">{copy.evidence}</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {requestRecord.evidence.map((item) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group border border-[var(--border)] p-2">
                    <div className="relative aspect-square overflow-hidden bg-[var(--card)]">
                      <Image src={item.url} alt={item.originalName} fill unoptimized className="object-cover transition group-hover:scale-[1.02]" />
                    </div>
                    <p className="mt-2 truncate text-xs font-medium">{item.originalName}</p>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {requestRecord.status === "AWAITING_CUSTOMER" ? (
            <form onSubmit={(event) => void sendFollowUp(event)} className="border border-[var(--accent)] p-4">
              <h3 className="text-sm font-semibold">{copy.supportNeedsInfo}</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{copy.supportNeedsInfoBody}</p>
              <textarea required minLength={3} maxLength={1000} value={followUp} onChange={(event) => setFollowUp(event.target.value)} className="mt-3 min-h-24 w-full resize-y border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none focus:border-[var(--accent)]" placeholder={copy.addRequestedDetails} />
              {followUpMessage ? <p className="mt-2 text-xs text-[var(--muted)]">{followUpMessage}</p> : null}
              <button type="submit" disabled={sendingFollowUp} className="mt-3 h-11 bg-[var(--foreground)] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--background)] disabled:opacity-50">
                {sendingFollowUp ? copy.sending : copy.sendResponse}
              </button>
            </form>
          ) : followUpMessage ? <p role="status" className="text-sm text-emerald-600">{followUpMessage}</p> : null}

          {["PENDING", "AWAITING_CUSTOMER"].includes(requestRecord.status) && requestRecord.evidence.length < 5 ? (
            <label className="block border border-dashed border-[var(--border)] p-4 text-sm">
              <span className="font-semibold">{copy.addEvidenceImages}</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{copy.evidenceHint}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploadingEvidence} onChange={(event) => void uploadEvidence(Array.from(event.target.files ?? []).slice(0, 5 - requestRecord.evidence.length))} className="mt-3 block w-full text-xs" />
              {evidenceMessage ? <span className="mt-2 block text-xs text-[var(--muted)]">{evidenceMessage}</span> : null}
            </label>
          ) : null}

          {["PENDING", "AWAITING_CUSTOMER", "APPROVED"].includes(requestRecord.status) ? (
            <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-xs leading-5 text-[var(--muted)]">{copy.cancelOnlineHint}</p>
              <button type="button" onClick={() => void cancelRequest()} disabled={cancelling} className="h-10 shrink-0 border border-red-500 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-red-600 disabled:opacity-50">
                {cancelling ? copy.cancelling : copy.cancelRequest}
              </button>
            </div>
          ) : null}
          {cancellationMessage ? <p role="status" className="text-sm text-[var(--muted)]">{cancellationMessage}</p> : null}

          <p className="border-t border-[var(--border)] pt-5 text-xs leading-5 text-[var(--muted)]">
            {copy.supportWillUpdate}
          </p>
        </div>
      </section>
    );
  }

  function changeResolution(next: Resolution) {
    setResolution(next);
    setReason(reasons[next][0]);
    setMessage(null);
    setIsError(false);
  }

  function toggleItem(id: string) {
    setSelectedItems((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
    setExchangeSelections((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItems.length) {
      setIsError(true);
      setMessage(copy.selectAtLeastOneItem);
      return;
    }
    if (missingSizeSelection) {
      setIsError(true);
      setMessage(copy.chooseReplacementSizeForAll);
      return;
    }

    setLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      const response = await fetch(`/api/account/orders/${orderNumber}/return-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          reason,
          notes,
          itemIds: selectedItems,
          itemQuantities: selectedItems.map((orderItemId) => ({
            orderItemId,
            quantity: itemQuantities[orderItemId] ?? 1,
          })),
          exchangeSelections: selectedItems
            .filter((itemId) => exchangeSelections[itemId])
            .map((orderItemId) => ({
              orderItemId,
              requestedVariantId: exchangeSelections[orderItemId],
            })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? copy.unableToSubmitRequest);
      let submissionMessage = result.message ?? copy.requestSubmitted;
      if (evidenceFiles.length) {
        try {
          await uploadEvidence(evidenceFiles);
        } catch {
          submissionMessage = copy.evidenceUploadFailed;
        }
      }
      setSubmitted(true);
      setMessage(submissionMessage);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : copy.unableToSubmitRequest);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center bg-[var(--card)] text-[var(--accent)]">
            <PackageCheck className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">{copy.returnOrExchange}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {copy.returnOrExchangeBody}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={(event) => void submit(event)} className="grid gap-6 p-5 sm:p-6">
        <fieldset disabled={submitted}>
          <legend className="mb-3 text-sm font-semibold">{copy.whatWouldYouLikeToDo}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {resolutionOptions.filter((option) => availableResolutions.includes(option.value)).map((option) => {
              const Icon = option.icon;
              const active = resolution === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => changeResolution(option.value)}
                  className={`min-h-20 border p-3 text-start transition motion-reduce:transition-none ${
                    active
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))]"
                      : "border-[var(--border)] hover:border-[var(--muted)]"
                  }`}
                  aria-pressed={active}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{option.label}</span>
                    {active ? <Check className="size-4 text-[var(--accent)]" /> : <Icon className="size-4 text-[var(--muted)]" />}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">{option.description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block border border-dashed border-[var(--border)] p-4 text-sm">
          <span className="font-semibold">{copy.evidenceImages} <span className="font-normal text-[var(--muted)]">({copy.optional})</span></span>
          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{copy.evidenceImagesBody}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={submitted || loading} onChange={(event) => setEvidenceFiles(Array.from(event.target.files ?? []).slice(0, 5))} className="mt-3 block w-full text-xs" />
          {evidenceFiles.length ? <span className="mt-2 block text-xs text-[var(--muted)]">{evidenceFiles.length} {evidenceFiles.length === 1 ? copy.image : copy.imagesPlural} {copy.selected}</span> : null}
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          {resolution === "refund" ? copy.whyRequestingRefund : resolution === "exchange" ? copy.whyRequestingExchange : copy.whyRequestingReturn}
          <select
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setMessage(null);
              setIsError(false);
            }}
            disabled={submitted}
            className="h-12 w-full border border-[var(--border)] bg-[var(--background)] px-3 font-normal outline-none transition focus:border-[var(--accent)] disabled:opacity-60 motion-reduce:transition-none"
          >
            {reasons[resolution].map((option) => <option key={option} value={option}>{returnReasonLabel(locale, option)}</option>)}
          </select>
        </label>

        <fieldset disabled={submitted} className="disabled:opacity-60">
          <div className="mb-3 flex items-center justify-between gap-4">
            <legend className="text-sm font-semibold">{copy.selectItems}</legend>
            <span className="text-xs text-[var(--muted)]">{selectedCount} {copy.selected}</span>
          </div>
          <div className="grid gap-3">
            {items.map((item) => {
              const selected = selectedItems.includes(item.id);
              const alternatives = item.exchangeSizes.filter((size) => !size.isCurrent);
              const availableAlternatives = alternatives.filter((size) => size.available);
              return (
                <div
                  key={item.id}
                  className={`border p-4 transition motion-reduce:transition-none ${selected ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <span className={`mt-0.5 grid size-5 shrink-0 place-items-center border ${selected ? "border-[var(--accent)] bg-[var(--accent)] text-stone-950" : "border-[var(--muted)]"}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleItem(item.id)}
                        className="sr-only"
                      />
                      {selected ? <Check className="size-3.5" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="font-semibold">{item.title}</span>
                        <span className="text-xs text-[var(--muted)]">{copy.purchased} {item.quantity}</span>
                      </span>
                      <span className="mt-1 block text-xs text-[var(--muted)]">{item.color} / {copy.currentSize} {item.size}</span>
                    </span>
                  </label>

                  {selected && item.quantity > 1 ? (
                    <div className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em]">{copy.quantityTo} {resolution === "refund" ? copy.refundLabel.toLowerCase() : resolution === "exchange" ? copy.exchangeLabel.toLowerCase() : copy.returnLabel.toLowerCase()}</span>
                      <div className="flex h-9 items-center border border-[var(--border)]">
                        <button type="button" aria-label={`${copy.decrease} ${item.title} ${copy.quantity}`} onClick={() => setItemQuantities((current) => ({ ...current, [item.id]: Math.max(1, (current[item.id] ?? item.quantity) - 1) }))} className="grid size-9 place-items-center text-lg">-</button>
                        <span className="grid h-9 min-w-10 place-items-center border-x border-[var(--border)] text-sm font-semibold">{itemQuantities[item.id] ?? item.quantity}</span>
                        <button type="button" aria-label={`${copy.increase} ${item.title} ${copy.quantity}`} onClick={() => setItemQuantities((current) => ({ ...current, [item.id]: Math.min(item.quantity, (current[item.id] ?? item.quantity) + 1) }))} className="grid size-9 place-items-center text-lg">+</button>
                      </div>
                    </div>
                  ) : null}

                  {selected && needsSizeSelection ? (
                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em]">{copy.chooseReplacementSize}</p>
                      {availableAlternatives.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {alternatives.map((size) => {
                            const active = exchangeSelections[item.id] === size.variantId;
                            return (
                              <button
                                key={size.variantId}
                                type="button"
                                disabled={!size.available}
                                onClick={() => setExchangeSelections((current) => ({ ...current, [item.id]: size.variantId }))}
                                className={`min-w-12 border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none ${
                                  active
                                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                                    : "border-[var(--border)] hover:border-[var(--foreground)]"
                                }`}
                                aria-pressed={active}
                              >
                                {size.size}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                          {copy.noOtherSizesAvailable} {item.color}{copy.submitAndSupportWillContact}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>

        <label className="grid gap-2 text-sm font-semibold">
          {copy.additionalDetails} <span className="font-normal text-[var(--muted)]">({copy.optional})</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={submitted}
            maxLength={1000}
            placeholder={needsSizeSelection ? copy.exchangeNotesPlaceholder : copy.reviewNotesPlaceholder}
            className="min-h-24 resize-y border border-[var(--border)] bg-[var(--background)] p-3 font-normal leading-6 outline-none transition focus:border-[var(--accent)] disabled:opacity-60 motion-reduce:transition-none"
          />
        </label>

        {message ? (
          <p role={isError ? "alert" : "status"} className={`border px-3 py-2 text-sm leading-5 ${isError ? "border-red-500/40 bg-red-500/10 text-red-500" : "border-[var(--border)] text-[var(--muted)]"}`}>
            {message}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[var(--muted)]">
            {copy.availabilityConfirmedNote}
          </p>
          <button
            type="submit"
            disabled={loading || submitted || !selectedItems.length || missingSizeSelection}
            className="h-12 bg-[var(--foreground)] px-6 text-sm font-semibold uppercase tracking-[0.1em] text-[var(--background)] transition hover:bg-[var(--accent)] hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            {loading ? copy.submitting : submitted ? copy.requestSubmitted : `${copy.submit} ${resolution === "refund" ? copy.refundLabel.toLowerCase() : resolution === "exchange" ? copy.exchangeLabel.toLowerCase() : copy.returnLabel.toLowerCase()}`}
          </button>
        </div>
      </form>
    </section>
  );
}
