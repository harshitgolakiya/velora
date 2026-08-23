"use client";

import Script from "next/script";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check, SlidersHorizontal, X } from "lucide-react";
import {
  acceptedConsentPreferences,
  consentCookieName,
  consentCookieValue,
  consentStorageKey,
  defaultConsentPreferences,
  parseConsentPreferences,
  rejectedConsentPreferences,
  type ConsentPreferences,
} from "@/lib/consent-preferences";

type ConsentToggleKey = "necessary" | "analytics" | "marketing" | "preferences";

function readStoredConsentRaw() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(consentStorageKey);
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener("velora:consent", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("velora:consent", callback);
    window.removeEventListener("storage", callback);
  };
}

function persistConsent(preferences: ConsentPreferences) {
  window.localStorage.setItem(consentStorageKey, JSON.stringify(preferences));
  document.cookie = `${consentCookieName}=${encodeURIComponent(consentCookieValue(preferences))}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("velora:consent", { detail: preferences }));
}

function AnalyticsScripts({ preferences }: { preferences: ConsentPreferences | null }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const allowAnalytics = Boolean(preferences?.analytics);
  const allowMarketing = Boolean(preferences?.marketing);

  return (
    <>
      {allowAnalytics && gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: '${allowMarketing ? "granted" : "denied"}' });
              gtag('js', new Date());
              gtag('config', '${gaId}', { send_page_view: true });
            `}
          </Script>
        </>
      ) : null}
      {allowMarketing && metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
            (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('consent', 'grant');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}
      {allowMarketing && tiktokPixelId ? (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
              ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
              ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
              for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
              ttq.load=function(e){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
              ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
              ttq._o=ttq._o||{};var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
              var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${tiktokPixelId}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      ) : null}
    </>
  );
}

export function Analytics() {
  const consentRaw = useSyncExternalStore(subscribeToConsent, readStoredConsentRaw, () => null);
  const preferences = useMemo(() => parseConsentPreferences(consentRaw), [consentRaw]);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<ConsentPreferences>(() => defaultConsentPreferences());
  const [showConsentPrompt, setShowConsentPrompt] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowConsentPrompt(!preferences), preferences ? 0 : 6000);
    return () => window.clearTimeout(timeout);
  }, [preferences]);

  const save = (next: ConsentPreferences) => {
    persistConsent(next);
    setDraft(next);
    setCustomizing(false);
  };

  return (
    <>
      <AnalyticsScripts preferences={preferences} />
      {!preferences && showConsentPrompt ? (
        <div className="storefront-bottom-bar fixed inset-x-0 bottom-0 z-[90] border-t border-[var(--border)] bg-[#151922] shadow-[0_-18px_70px_rgba(0,0,0,0.42)]">
          <div className="storefront-container flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:py-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Privacy choices</p>
              <p className="mt-1.5 text-sm leading-6 text-[var(--muted)] md:hidden">
                Essential storage stays on. Choose whether to allow optional analytics and marketing.
              </p>
              <p className="mt-2 hidden text-sm leading-6 text-[var(--muted)] md:block">
                We use essential storage for checkout and optional analytics or marketing pixels to improve the store. You can accept all, reject optional tracking, or choose each category.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button type="button" onClick={() => { setDraft(preferences ?? defaultConsentPreferences()); setCustomizing(true); }} className="storefront-action inline-flex h-11 items-center gap-2 border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.1em] hover:bg-[var(--hover)]">
                <SlidersHorizontal className="size-4" /> Customize
              </button>
              <button type="button" onClick={() => save(rejectedConsentPreferences())} className="storefront-action inline-flex h-11 items-center gap-2 border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.1em] hover:bg-[var(--hover)]">
                <X className="size-4" /> Reject
              </button>
              <button type="button" onClick={() => save(acceptedConsentPreferences())} className="storefront-action col-span-2 inline-flex h-11 items-center justify-center gap-2 bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#17262D] hover:bg-[var(--foreground)] hover:text-[var(--background)] sm:col-span-1">
                <Check className="size-4" /> Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {customizing ? (
        <div className="storefront-overlay fixed inset-0 z-[100] bg-black/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Privacy preferences" data-state="open">
          <div className="mx-auto max-w-xl storefront-framed p-5 shadow-2xl [animation:drawer-full-in_0.3s_var(--motion-ease-emphasized)_both]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Privacy preferences</p>
                <h2 className="mt-2 text-2xl font-semibold">Control optional tracking</h2>
              </div>
              <button type="button" onClick={() => setCustomizing(false)} className="storefront-action grid size-10 place-items-center border border-[var(--border)] hover:bg-[var(--hover)]" aria-label="Close privacy preferences">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 divide-y divide-[var(--border)] storefront-railed">
              {([
                ["necessary", "Necessary", "Required for cart, checkout, account security, and preference storage.", true],
                ["analytics", "Analytics", "Helps us understand product discovery, checkout friction, and store performance.", false],
                ["marketing", "Marketing", "Allows Meta and TikTok pixels for campaign measurement and retargeting.", false],
                ["preferences", "Preferences", "Remembers non-essential store preferences between visits.", false],
              ] satisfies Array<[ConsentToggleKey, string, string, boolean]>).map(([key, label, copy, locked]) => (
                <label key={String(key)} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{copy}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={key === "necessary" ? true : Boolean(draft[key])}
                    disabled={Boolean(locked)}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      [key]: event.target.checked,
                      updatedAt: new Date().toISOString(),
                    }))}
                    className="size-5 accent-[var(--accent)]"
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => save(rejectedConsentPreferences())} className="storefront-action h-11 border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.1em] hover:bg-[var(--hover)]">Reject optional</button>
              <button type="button" onClick={() => save({ ...draft, necessary: true, updatedAt: new Date().toISOString() })} className="storefront-action h-11 bg-[var(--accent)] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#17262D] hover:bg-[var(--foreground)] hover:text-[var(--background)]">Save choices</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
