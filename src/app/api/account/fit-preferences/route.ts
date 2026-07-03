import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomerSession } from "@/lib/account-data";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  preferredSize: z.string().trim().max(30).nullable(),
  fitPreference: z.enum(["TRUE_TO_SIZE", "FITTED", "RELAXED"]).nullable(),
  compressionPreference: z.enum(["LOW", "MEDIUM", "HIGH"]).nullable(),
});

export async function PUT(request: Request) {
  const session = await requireCustomerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check your fit preferences." }, { status: 400 });

  const preferences = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { preferredSize: true, fitPreference: true, compressionPreference: true },
  });
  return NextResponse.json({ preferences });
}
