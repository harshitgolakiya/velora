"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Flag, ImagePlus, Star } from "lucide-react";
import type { Product } from "@/lib/catalog";

export function ProductReviews({ product }: { product: Product }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [ownReview, setOwnReview] = useState<{ status: string; canEdit: boolean; editableUntil?: string; media: Array<{ id: string; status: string; originalName: string; url: string }> } | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("SPAM");
  const reviews = product.reviewItems ?? [];
  const distribution = [5, 4, 3, 2, 1].map((value) => ({
    value,
    count: reviews.filter((review) => review.rating === value).length,
  }));

  useEffect(() => {
    let active = true;
    void fetch(`/api/products/${product.id}/reviews`)
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        setCanReview(Boolean(result.canReview));
        if (!result.review) return;
        setRating(result.review.rating);
        setTitle(result.review.title);
        setBody(result.review.body);
        setOwnReview(result.review);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [product.id]);

  useEffect(() => {
    if (window.location.hash !== "#reviews") return;
    window.requestAnimationFrame(() => {
      document.getElementById("reviews")?.scrollIntoView({ block: "start" });
    });
  }, []);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const response = await fetch(`/api/products/${product.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, title, body }),
    });
    const result = await response.json();
    setMessage(result.message ?? (response.ok ? "Review submitted for moderation." : "Unable to submit review."));
    if (response.ok) {
      if (files.length) {
        const form = new FormData();
        files.forEach((file) => form.append("files", file));
        const uploadResponse = await fetch(`/api/products/${product.id}/reviews/media`, { method: "POST", body: form });
        const uploadResult = await uploadResponse.json();
        setMessage(uploadResult.message ?? result.message);
        if (uploadResponse.ok) setFiles([]);
      }
      const ownResponse = await fetch(`/api/products/${product.id}/reviews`);
      const ownResult = await ownResponse.json();
      setOwnReview(ownResult.review ?? null);
    }
    setSubmitting(false);
  }

  return (
    <section className="mt-20 border-t border-[var(--border)] pt-12" id="reviews">
      <div className={`grid gap-10 ${canReview || ownReview ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Customer reviews</p>
          <h2 className="display-md mt-3">
            {reviews.length ? `${product.rating.toFixed(1)} from ${product.reviews} ${product.reviews === 1 ? "review" : "reviews"}` : "No approved reviews yet"}
          </h2>
          {reviews.length ? (
            <div className="mt-7 grid max-w-lg gap-2">
              {distribution.map((item) => (
                <div key={item.value} className="grid grid-cols-[24px_1fr_30px] items-center gap-3 text-xs text-[var(--muted)]">
                  <span>{item.value}</span>
                  <span className="h-1.5 bg-[var(--card)]"><span className="block h-full bg-[var(--accent)]" style={{ width: `${reviews.length ? (item.count / reviews.length) * 100 : 0}%` }} /></span>
                  <span>{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Delivered customers can submit a verified review. Reviews appear after moderation.</p>
          )}
        </div>

        {canReview || ownReview ? <form onSubmit={submitReview} className="card p-6">
          <h3 className="display-md">{ownReview ? "Edit your review" : "Write a review"}</h3>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Sign in with the account used for a delivered purchase. Submissions are moderated before publishing.</p>
          {ownReview ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="storefront-panel-row border border-[var(--border)] px-2 py-1 font-semibold uppercase tracking-[0.08em]">{ownReview.status}</span>
              <span className="text-[var(--muted)]">
                {ownReview.canEdit && ownReview.editableUntil
                  ? `Editable until ${new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(ownReview.editableUntil))}`
                  : "Edit window closed"}
              </span>
            </div>
          ) : null}
          <div className="mt-4 flex gap-1" role="group" aria-label="Review rating">
            {Array.from({ length: 5 }).map((_, index) => {
              const value = index + 1;
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => setRating(value)}
                  aria-label={`${value} stars`}
                  aria-pressed={rating === value}
                  className="storefront-action grid size-10 place-items-center text-[var(--accent-text)] outline-none hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2 motion-reduce:transition-none"
                >
                  <Star className={`size-5 ${value <= rating ? "fill-current" : "opacity-25"}`} />
                </button>
              );
            })}
          </div>
          <label className="mt-4 grid gap-1.5 text-sm font-medium">Review title
            <input required minLength={3} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} className="field" />
          </label>
          <label className="mt-4 grid gap-1.5 text-sm font-medium">Your review
            <textarea required minLength={20} maxLength={2000} rows={5} value={body} onChange={(event) => setBody(event.target.value)} className="field resize-y" />
          </label>
          <label className="mt-4 grid gap-2 text-sm font-medium">
            <span className="inline-flex items-center gap-2"><ImagePlus className="size-4" /> Add photos <span className="font-normal text-[var(--muted)]">(up to 3)</span></span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={ownReview ? !ownReview.canEdit : false}
              onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))}
              className="storefront-action block w-full border border-[var(--border)] bg-[var(--background)] p-2 text-xs file:me-3 file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:font-semibold file:text-[var(--on-accent)]"
            />
            {files.length ? <span className="text-xs font-normal text-[var(--muted)]">{files.map((file) => file.name).join(", ")}</span> : null}
          </label>
          {ownReview?.media.length ? (
            <div className="mt-3 space-y-1 text-xs text-[var(--muted)]">
              {ownReview.media.map((media) => <p key={media.id}>{media.originalName} · {media.status.toLowerCase()}</p>)}
            </div>
          ) : null}
          {message ? <p role="status" className="mt-3 text-xs leading-5 text-[var(--muted)]">{message}</p> : null}
          <button disabled={submitting || (ownReview ? !ownReview.canEdit : false)} className="btn btn-primary btn-block mt-5">{submitting ? "Submitting..." : ownReview ? "Update review" : "Submit review"}</button>
        </form> : null}
      </div>

      {reviews.length ? (
        <div className="storefront-railed mt-10 divide-y divide-[var(--border)]">
          {reviews.map((review) => (
            <article key={review.id} className="grid gap-4 py-7 sm:grid-cols-[180px_1fr]">
              <div>
                <div className="flex" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`size-3.5 ${index < review.rating ? "fill-current" : "opacity-20"}`} />)}</div>
                <p className="mt-2 text-sm font-medium">{review.customerName ?? "Customer"}</p>
                {review.verifiedPurchase ? <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--accent-text)]"><CheckCircle2 className="size-3.5" /> Verified purchase</p> : null}
                <p className="mt-2 text-xs text-[var(--muted)]">{new Intl.DateTimeFormat("en-AE", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(review.createdAt))}</p>
              </div>
              <div>
                <h3 className="font-medium">{review.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{review.body}</p>
                {review.media?.length ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {review.media.map((media) => (
                      <a key={media.id} href={media.url} target="_blank" rel="noreferrer" className="storefront-action relative block aspect-square w-24 overflow-hidden bg-[var(--card)]">
                        <Image src={media.url} alt={media.altText ?? `Customer photo for ${product.name}`} fill sizes="96px" className="object-cover" />
                      </a>
                    ))}
                  </div>
                ) : null}
                {review.adminResponse ? (
                  <div className="storefront-panel-row mt-5 border border-[var(--border)] border-s-[3px] border-s-[var(--accent)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em]">Response from the team</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{review.adminResponse}</p>
                  </div>
                ) : null}
                <div className="mt-5">
                  {reportingReviewId === review.id ? (
                    <div className="storefront-expand-in flex flex-wrap items-center gap-2">
                      <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="storefront-action h-10 border border-[var(--border)] bg-[var(--background)] px-2 text-xs outline-none focus:border-[var(--accent)]">
                        <option value="SPAM">Spam</option><option value="OFFENSIVE">Offensive content</option><option value="PRIVACY">Privacy issue</option><option value="MISLEADING">Misleading</option><option value="OTHER">Other</option>
                      </select>
                      <button type="button" onClick={async () => {
                        const response = await fetch(`/api/reviews/${review.id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reportReason }) });
                        const result = await response.json();
                        setMessage(result.message);
                        if (response.ok) setReportingReviewId(null);
                      }} className="btn btn-primary btn-sm">Send report</button>
                      <button type="button" onClick={() => setReportingReviewId(null)} className="storefront-action min-h-10 px-2 text-xs underline">Cancel</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setReportingReviewId(review.id)} className="storefront-action inline-flex min-h-10 items-center gap-1.5 px-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"><Flag className="size-3.5" /> Report review</button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
