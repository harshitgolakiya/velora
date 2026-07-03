import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminColor } from "@/lib/admin-catalog";
import { prisma } from "@/lib/prisma";

const colorSchema = z.object({
  name: z.string().min(1),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const parsed = colorSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid color payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const existing = await prisma.color.findFirst({
    where: { name: { equals: data.name.trim() } },
  });

  if (existing) {
    return NextResponse.json({ message: "Color already exists" }, { status: 409 });
  }

  const color = await prisma.color.create({
    data: {
      name: data.name.trim(),
      hex: data.hex,
    },
    include: { _count: { select: { variants: true } } },
  });

  await recordAdminActivity({
    action: `Created color ${color.name}`,
    entityType: "color",
    entityId: color.id,
    actor: auth.access.name,
    metadata: { hex: color.hex },
  });

  return NextResponse.json({ color: mapAdminColor(color) }, { status: 201 });
}
