import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { getAdminAccess } from "@/lib/admin-permissions";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  if (await getAdminAccess()) redirect("/admin");
  const params = await searchParams;
  const callbackUrl = params.callbackUrl?.startsWith("/admin")
    ? params.callbackUrl
    : "/admin";

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--background)] p-5 text-[var(--foreground)]">
      <section className="w-full max-w-md border border-[var(--border)] bg-[var(--surface)] p-7 shadow-xl sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Velora operations</p>
        <h1 className="mt-3 font-serif text-4xl">Admin sign in</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Use an authorized Velora admin account. Access is checked against the current database role on every request.
        </p>
        <AdminLoginForm callbackUrl={callbackUrl} />
      </section>
    </main>
  );
}

