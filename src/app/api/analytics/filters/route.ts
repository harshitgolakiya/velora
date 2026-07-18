import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storefrontFilterEventSchema } from "@/lib/analytics-event-contract";
import { requireSameOriginRequest } from "@/lib/request-security";

export async function POST(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const parsed = storefrontFilterEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid filter analytics payload" }, { status: 400 });
  }

  try {
    const { eventName, consentCategory, dedupeKey, ...data } = parsed.data;
    void eventName;
    void consentCategory;
    void dedupeKey;
    await prisma.storefrontFilterEvent.create({ data });
  } catch {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
