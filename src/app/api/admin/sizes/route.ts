import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminSize } from "@/lib/admin-catalog";
import { prisma } from "@/lib/prisma";

const sizeSchema = z.object({
  name: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const parsed = sizeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid size payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const name = parsed.data.name.trim();
  const existing = await prisma.size.findFirst({ where: { name } });

  if (existing) {
    return NextResponse.json({ message: "Size already exists" }, { status: 409 });
  }

  const size = await prisma.size.create({
    data: { id: name, name },
    include: { _count: { select: { variants: true } } },
  });

  await recordAdminActivity({
    action: `Created size ${size.name}`,
    entityType: "size",
    entityId: size.id,
    actor: auth.access.name,
  });

  return NextResponse.json({ size: mapAdminSize(size) }, { status: 201 });
}
