import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeUaePhone, requireCustomerSession } from "@/lib/account-data";
import { prisma } from "@/lib/prisma";

const addressSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().transform(normalizeUaePhone).pipe(
    z.string().regex(/^(?:\+971|00971|0)?5\d{8}$/),
  ),
  line1: z.string().trim().min(8).max(160),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().max(30).optional(),
});

export async function POST(request: Request) {
  const session = await requireCustomerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Check your address details", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const address = await prisma.address.create({
    data: {
      ...parsed.data,
      userId: session.user.id,
      country: "United Arab Emirates",
    },
  });

  return NextResponse.json({ address }, { status: 201 });
}
