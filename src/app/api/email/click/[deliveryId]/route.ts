import { NextResponse } from "next/server";
import { markEmailClicked } from "@/lib/email-delivery";

function safeRedirectTarget(value: string | null) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  if (!value) return `${siteUrl}/shop`;
  try {
    const target = new URL(value, siteUrl);
    const site = new URL(siteUrl);
    if (target.origin !== site.origin) return `${siteUrl}/shop`;
    return target.toString();
  } catch {
    return `${siteUrl}/shop`;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ deliveryId: string }> }) {
  const { deliveryId } = await params;
  await markEmailClicked(deliveryId).catch(() => undefined);
  return NextResponse.redirect(safeRedirectTarget(new URL(request.url).searchParams.get("to")));
}
