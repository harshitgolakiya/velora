import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiftCardQuote } from "@/lib/gift-cards";

const schema = z.object({
  code: z.string().trim().min(1),
  payableAmount: z.coerce.number().min(0),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid gift-card request" }, { status: 400 });
  }

  const quote = await getGiftCardQuote(parsed.data.code, parsed.data.payableAmount);
  if (!quote.valid) {
    return NextResponse.json(
      { code: "GIFT_CARD_INVALID", message: quote.reason },
      { status: 400 },
    );
  }

  return NextResponse.json({ giftCard: quote });
}
