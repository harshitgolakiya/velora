import { localizedPath, type Locale } from "./i18n";

export function normalizeEmailLocale(locale?: string | null): Locale {
  return locale?.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export function localeFromRequest(request: Request): Locale {
  const explicit = request.headers.get("x-velora-locale") ?? request.headers.get("x-locale");
  if (explicit) return normalizeEmailLocale(explicit);

  const referer = request.headers.get("referer");
  if (!referer) return "en";
  try {
    return normalizeEmailLocale(new URL(referer).pathname.startsWith("/ar") ? "ar" : "en");
  } catch {
    return "en";
  }
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function localizedSiteUrl(pathname: string, locale?: string | null) {
  return `${siteUrl()}${localizedPath(pathname, normalizeEmailLocale(locale))}`;
}

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function transactionalEmailShell({
  locale,
  heading,
  body,
  ctaLabel,
  ctaHref,
  note,
}: {
  locale?: string | null;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  note?: string;
}) {
  const normalized = normalizeEmailLocale(locale);
  const dir = normalized === "ar" ? "rtl" : "ltr";
  const align = normalized === "ar" ? "right" : "left";
  const safeNote = note ? `<p style="margin-top:24px;font-size:12px;line-height:1.6;color:#5f646d">${note}</p>` : "";
  const action = ctaLabel && ctaHref
    ? `<a href="${ctaHref}" style="display:inline-block;margin-top:18px;background:#111315;color:#fff;padding:14px 22px;text-decoration:none">${ctaLabel}</a>`
    : "";

  return `<div dir="${dir}" style="background:#f7f5f2;padding:32px;font-family:Arial,sans-serif;color:#111315;text-align:${align}"><div style="max-width:560px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.22em;color:#c5a46d">VELORA</p><h1 style="font-size:30px;line-height:1.2">${heading}</h1><p style="line-height:1.7">${body}</p>${action}${safeNote}</div></div>`;
}
