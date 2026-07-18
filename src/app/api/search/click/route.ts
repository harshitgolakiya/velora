import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSameOriginRequest } from "@/lib/request-security";
import { recordSearchClickEvent } from "@/lib/search-analytics";

const clickSchema = z.object({
  query: z.string().trim().min(2).max(100),
  source: z.enum(["predictive", "results_page"]).default("results_page"),
  resultType: z.enum(["product", "category", "collection", "page"]),
  resultId: z.string().trim().max(120).optional(),
  href: z.string().trim().min(1).max(240),
  position: z.number().int().min(0).max(500).optional(),
});

export async function POST(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const parsed = clickSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search click payload" }, { status: 400 });
  }

  await recordSearchClickEvent(parsed.data);
  return NextResponse.json({ ok: true });
}
