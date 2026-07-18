import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeUaePhone, requireCustomerSession } from "@/lib/account-data";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireCustomerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const csrf = requireSameOriginRequest(request);
  if (csrf) return csrf;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Check your address details", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.address.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const address = await prisma.address.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ address });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireCustomerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const csrf = requireSameOriginRequest(request);
  if (csrf) return csrf;

  const { id } = await params;
  const existing = await prisma.address.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const linkedOrder = await prisma.order.findFirst({
    where: {
      OR: [{ shippingAddressId: id }, { billingAddressId: id }],
    },
    select: { id: true },
  });

  if (linkedOrder) {
    await prisma.address.update({
      where: { id },
      data: { userId: null },
    });
    return NextResponse.json({ deleted: true, detached: true });
  }

  await prisma.address.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
