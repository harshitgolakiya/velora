import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomerSession } from "@/lib/account-data";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function PUT(request: Request) {
  const session = await requireCustomerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const csrf = requireSameOriginRequest(request);
  if (csrf) return csrf;

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Check your profile details", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user });
}
