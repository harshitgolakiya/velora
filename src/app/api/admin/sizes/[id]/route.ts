import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminSize } from "@/lib/admin-catalog";
import { prisma } from "@/lib/prisma";

const sizeSchema = z.object({
  name: z.string().min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = sizeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid size payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const name = parsed.data.name.trim();
  const duplicate = await prisma.size.findFirst({
    where: {
      name,
      NOT: { id },
    },
  });

  if (duplicate) {
    return NextResponse.json({ message: "Size already exists" }, { status: 409 });
  }

  try {
    const current = await prisma.size.findUnique({
      where: { id },
      include: { _count: { select: { variants: true } } },
    });

    if (!current) {
      return NextResponse.json({ message: "Size not found" }, { status: 404 });
    }

    const size = await prisma.size.update({
      where: { id },
      data: current._count.variants === 0 ? { id: name, name } : { name },
      include: { _count: { select: { variants: true } } },
    });

    await recordAdminActivity({
      action: `Updated size ${size.name}`,
      entityType: "size",
      entityId: size.id,
      actor: auth.access.name,
      metadata: { previousId: id },
    });

    return NextResponse.json({ size: mapAdminSize(size) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update size";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const size = await prisma.size.findUnique({
    where: { id },
    include: { _count: { select: { variants: true } } },
  });

  if (!size) {
    return NextResponse.json({ message: "Size not found" }, { status: 404 });
  }

  if (size._count.variants > 0) {
    return NextResponse.json(
      { message: "This size is used by variants and cannot be deleted" },
      { status: 409 },
    );
  }

  await prisma.size.delete({ where: { id } });

  await recordAdminActivity({
    action: `Deleted size ${size.name}`,
    entityType: "size",
    entityId: size.id,
    actor: auth.access.name,
  });

  return NextResponse.json({ ok: true });
}
