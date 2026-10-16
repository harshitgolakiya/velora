"use client";

import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn, signOut } from "next-auth/react";
import { Heart, LogOut, MapPin, Package, UserRound } from "lucide-react";
import { authCopy, localeFromPathname, localizedPath } from "@/lib/i18n";

type AccountUser = {
  name?: string | null;
  email?: string | null;
};

type SocialProvider = {
  id: "google" | "facebook";
  label: string;
};

export function AccountAccess({
  user,
  socialProviders = [],
  compact = false,
}: {
  user?: AccountUser;
  socialProviders?: SocialProvider[];
  compact?: boolean;
}) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const copy = authCopy[locale];
  const accountHref = localizedPath("/account", locale);
  const [mode, setMode] = useState<"signin" | "register" | "forgot" | "verify">("signin");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");

  if (user) {
    return (
      <>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            [UserRound, copy.profile, user.email ?? copy.manageYourProfile],
            [Package, copy.orders, copy.ordersConnectSoon],
            [Heart, copy.wishlist, copy.wishlistSyncSoon],
            [MapPin, copy.addresses, copy.addressesAppearSoon],
          ].map(([Icon, title, body]) => (
            <section key={title as string} className="card p-5 transition hover:-translate-y-0.5 hover:border-[var(--foreground)]/35 motion-reduce:transition-none">
              <span className="grid size-10 place-items-center rounded-full bg-[var(--card)] text-[var(--accent-text)]">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{title as string}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body as string}</p>
            </section>
          ))}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: localizedPath("/", locale) })}
          className="storefront-action mt-7 inline-flex h-11 items-center gap-2 border border-[var(--border)] px-5 text-sm font-medium hover:border-[var(--foreground)]/40 hover:bg-[var(--hover)] motion-reduce:transition-none"
        >
          <LogOut className="size-4" />
          {copy.signOut}
        </button>
      </>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    if (mode === "forgot") {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      setMessage(result.message ?? copy.passwordResetSent);
      setSubmitting(false);
      return;
    }

    if (mode === "register") {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email,
          password,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const fieldMessages = Object.values(result.errors?.fieldErrors ?? {})
          .flat()
          .filter(Boolean);
        setError(fieldMessages[0] ?? result.message ?? copy.unableToCreateAccount);
        setSubmitting(false);
        return;
      }
      if (result.verificationRequired) {
        setVerificationEmail(email);
        setMode("verify");
        setMessage(copy.verifyEmailMessage);
        setSubmitting(false);
        return;
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: accountHref,
      redirect: false,
    });
    if (!result?.ok) {
      setError(copy.incorrectCredentials);
      setSubmitting(false);
      return;
    }
    window.location.assign(result.url ?? accountHref);
  }

  async function resendVerification() {
    if (!verificationEmail) return;
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: verificationEmail }),
    });
    const result = await response.json();
    setMessage(result.message ?? copy.verificationResent);
    setSubmitting(false);
  }

  async function signInWithProvider(providerId: SocialProvider["id"]) {
    setSubmitting(true);
    setError(null);
    await signIn(providerId, { callbackUrl: accountHref });
  }

  if (mode === "verify") {
    return (
      <div className={`${compact ? "" : "mt-8"} card max-w-lg p-5 sm:p-6`}>
        <p className="eyebrow eyebrow-muted">{copy.accountCreated}</p>
        <h2 className="display-md mt-3">{copy.verifyYourEmail}</h2>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{message}</p>
        <p className="mt-2 text-sm font-medium">{verificationEmail}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={resendVerification} disabled={submitting} className="btn btn-primary">{copy.resendEmail}</button>
          <button type="button" onClick={() => setMode("signin")} className="btn btn-secondary">{copy.backToSignIn}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? "" : "mt-8"} card max-w-lg p-5 sm:p-6`}>
      <div className="card grid grid-cols-2 bg-[var(--background)] p-1">
        {(["signin", "register"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError(null);
              setMessage(null);
            }}
            className={`storefront-action h-10 text-sm font-semibold transition motion-reduce:transition-none ${mode === value ? "bg-[var(--accent)] text-[var(--on-accent)]" : "hover:bg-[var(--hover)]"}`}
          >
            {value === "signin" ? copy.signIn : copy.createAccount}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        {mode === "signin" && socialProviders.length ? (
          <div className="grid gap-2">
            {socialProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                disabled={submitting}
                onClick={() => void signInWithProvider(provider.id)}
                className="btn btn-secondary"
              >
                <span className="grid size-6 place-items-center rounded-full border border-[var(--border)] text-xs uppercase">{provider.label[0]}</span>
                {copy.signIn} / {provider.label}
              </button>
            ))}
          </div>
        ) : null}
        {mode === "register" ? (
          <label className="grid gap-2 text-sm font-medium">
            {copy.name}
            <input required name="name" autoComplete="name" className="storefront-action h-12 border border-[var(--border)] bg-[var(--background)] px-4 outline-none transition focus:border-[var(--accent)] motion-reduce:transition-none" />
          </label>
        ) : null}
        <label className="grid gap-2 text-sm font-medium">
          {copy.emailAddress}
          <input required name="email" type="email" autoComplete="email" className="storefront-action h-12 border border-[var(--border)] bg-[var(--background)] px-4 outline-none transition focus:border-[var(--accent)] motion-reduce:transition-none" />
        </label>
        {mode !== "forgot" ? (
          <label className="grid gap-2 text-sm font-medium">
            {copy.password}
            <input required name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} className="storefront-action h-12 border border-[var(--border)] bg-[var(--background)] px-4 outline-none transition focus:border-[var(--accent)] motion-reduce:transition-none" />
            {mode === "register" ? <span className="text-xs text-[var(--muted)]">{copy.passwordHint}</span> : null}
          </label>
        ) : null}
        {error ? <p role="alert" className="text-sm text-[var(--sale)]">{error}</p> : null}
        {message ? <p role="status" className="text-sm leading-6 text-[var(--muted)]">{message}</p> : null}
        <button disabled={submitting} className="btn btn-primary">
          {submitting ? copy.pleaseWait : mode === "signin" ? copy.signIn : mode === "register" ? copy.createAccount : copy.sendResetLink}
        </button>
        {mode === "signin" ? (
          <button type="button" onClick={() => { setMode("forgot"); setError(null); setMessage(null); }} className="storefront-action -mx-2 inline-flex min-h-10 w-fit items-center px-2 text-sm underline underline-offset-4">{copy.forgotPassword}</button>
        ) : null}
        {mode === "forgot" ? (
          <button type="button" onClick={() => { setMode("signin"); setError(null); setMessage(null); }} className="storefront-action -mx-2 inline-flex min-h-10 w-fit items-center px-2 text-sm underline underline-offset-4">{copy.backToSignIn}</button>
        ) : null}
      </form>
    </div>
  );
}
