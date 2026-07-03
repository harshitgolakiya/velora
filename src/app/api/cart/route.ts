import { NextResponse } from "next/server";
import { z } from "zod";
import { syncCartReservations } from "@/lib/cart-reservations";

const cartSchema = z.object({
  sessionKey: z.string().trim().min(12).max(100),
  items: z
    .array(
      z.object({
        variantId: z.string().trim().min(1),
        quantity: z.coerce.number().int().min(1).max(20),
      }),
    )
    .max(100),
});

export async function PUT(request: Request) {
  const parsed = cartSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid cart payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const cart = await syncCartReservations(
      parsed.data.sessionKey,
      parsed.data.items,
    );
    return NextResponse.json({ ok: true, cart });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to reserve cart",
      },
    );
  }
}
