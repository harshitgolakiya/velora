import type { Metadata } from "next";
import { AccountTokenAction } from "@/components/auth/account-token-action";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return <main className="storefront-container-compact py-12"><AccountTokenAction mode="verify" token={token} /></main>;
}
