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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = colorSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid color payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const duplicate = await prisma.color.findFirst({
    where: {
      name: { equals: data.name.trim() },
      NOT: { id },
    },
  });

  if (duplicate) {
    return NextResponse.json({ message: "Color already exists" }, { status: 409 });
  }

  try {
    const color = await prisma.color.update({
      where: { id },
      data: {
        name: data.name.trim(),
        hex: data.hex,
      },
      include: { _count: { select: { variants: true } } },
    });

    await recordAdminActivity({
      action: `Updated color ${color.name}`,
      entityType: "color",
      entityId: color.id,
      actor: auth.access.name,
      metadata: { hex: color.hex },
    });

    return NextResponse.json({ color: mapAdminColor(color) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update color";
    const status = message.includes("Record to update not found") ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const color = await prisma.color.findUnique({
    where: { id },
    include: { _count: { select: { variants: true } } },
  });

  if (!color) {
    return NextResponse.json({ message: "Color not found" }, { status: 404 });
  }

  if (color._count.variants > 0) {
    return NextResponse.json(
      { message: "This color is used by variants and cannot be deleted" },
      { status: 409 },
    );
  }

  await prisma.color.delete({ where: { id } });

  await recordAdminActivity({
    action: `Deleted color ${color.name}`,
    entityType: "color",
    entityId: color.id,
    actor: auth.access.name,
    metadata: { hex: color.hex },
  });

  return NextResponse.json({ ok: true });
}
