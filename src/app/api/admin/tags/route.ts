import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminTag } from "@/lib/admin-catalog";
import { prisma } from "@/lib/prisma";

const tagSchema = z.object({
  name: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const parsed = tagSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid tag payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const name = parsed.data.name;
  const existing = await prisma.tag.findFirst({ where: { name } });
  if (existing) {
    return NextResponse.json({ message: "Tag already exists" }, { status: 409 });
  }

  const tag = await prisma.tag.create({
    data: { name },
    include: { _count: { select: { products: true } } },
  });

  await recordAdminActivity({
    action: `Created tag ${tag.name}`,
    entityType: "tag",
    entityId: tag.id,
    actor: auth.access.name,
  });

  return NextResponse.json({ tag: mapAdminTag(tag) }, { status: 201 });
}
