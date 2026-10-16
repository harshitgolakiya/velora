"use client";

import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocalizedHref } from "@/lib/use-localized-href";
import { localeFromPathname } from "@/lib/i18n-shell";

export function RouteErrorState({
  error,
  reset,
  eyebrow = "We hit a snag",
  title = "This page could not be loaded.",
  body = "Your information is safe. Try loading this page again or continue from a nearby destination.",
  destinationHref = "/",
  destinationLabel = "Back to homepage",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  eyebrow?: string;
  title?: string;
  body?: string;
  destinationHref?: string;
  destinationLabel?: string;
}) {
  const localize = useLocalizedHref();
  const locale = localeFromPathname(usePathname());
  const content = locale === "ar"
    ? {
        eyebrow: "تعذر تحميل الصفحة",
        title: "لم نتمكن من عرض هذه الصفحة.",
        body: "معلوماتك محفوظة. حاول التحميل مرة أخرى أو انتقل إلى وجهة آمنة.",
        retry: "حاول مرة أخرى",
        destination: "العودة بأمان",
      }
    : { eyebrow, title, body, retry: "Try again", destination: destinationLabel };

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="storefront-container flex min-h-[58dvh] items-center justify-center py-16 sm:py-24">
      <div className="card w-full max-w-2xl p-6 text-center sm:p-10">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--card)] text-[var(--accent-text)]">
          <AlertCircle className="size-5" aria-hidden />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{content.eyebrow}</p>
        <h1 className="display-lg mt-3">{content.title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-[var(--muted)]">{content.body}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            <RotateCcw className="size-4" aria-hidden />
            {content.retry}
          </button>
          <Link href={localize(destinationHref)} className="btn btn-secondary">
            {content.destination}
          </Link>
        </div>
      </div>
    </section>
  );
}
