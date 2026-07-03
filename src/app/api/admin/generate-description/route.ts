import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiPermission } from "@/lib/admin-api";

const schema = z.object({
  prompt: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request payload" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "AI service not configured — add ANTHROPIC_API_KEY to your environment." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are a copywriter for Velora, a premium activewear brand for women. Write a compelling, concise product description (2-3 sentences, approximately 60 words) for the following product or attributes: "${parsed.data.prompt}". Focus on performance features, fabric quality, and warm-weather lifestyle appeal. Output only the description text, with no labels, preamble, or quotes.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[generate-description] Anthropic error:", response.status, body);
      return NextResponse.json({ message: "AI service returned an error" }, { status: 502 });
    }

    const data = (await response.json()) as {
      content?: { type: string; text: string }[];
    };

    const text = data.content?.find((block) => block.type === "text")?.text ?? "";
    return NextResponse.json({ description: text.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
