import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminTag } from "@/lib/admin-catalog";
import { prisma } from "@/lib/prisma";

const tagSchema = z.object({
  name: z.string().trim().min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = tagSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid tag payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const name = parsed.data.name;
  const duplicate = await prisma.tag.findFirst({ where: { name, NOT: { id } } });
  if (duplicate) {
    return NextResponse.json({ message: "Tag already exists" }, { status: 409 });
  }

  try {
    const tag = await prisma.tag.update({
      where: { id },
      data: { name },
      include: { _count: { select: { products: true } } },
    });

    await recordAdminActivity({
      action: `Updated tag ${tag.name}`,
      entityType: "tag",
      entityId: tag.id,
      actor: auth.access.name,
    });

    return NextResponse.json({ tag: mapAdminTag(tag) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update tag";
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
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!tag) {
    return NextResponse.json({ message: "Tag not found" }, { status: 404 });
  }

  if (tag._count.products > 0) {
    return NextResponse.json(
      { message: "This tag is assigned to products and cannot be deleted" },
      { status: 409 },
    );
  }

  await prisma.tag.delete({ where: { id } });

  await recordAdminActivity({
    action: `Deleted tag ${tag.name}`,
    entityType: "tag",
    entityId: tag.id,
    actor: auth.access.name,
  });

  return NextResponse.json({ ok: true });
}
