import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function PATCH(request: Request) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const parsed = reorderSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid homepage section order", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await prisma.$transaction(
    parsed.data.ids.map((id, sortOrder) =>
      prisma.homepageSection.update({
        where: { id },
        data: { sortOrder },
      }),
    ),
  );

  await recordAdminActivity({
    action: "Reordered homepage sections",
    entityType: "homepage_section",
    actor: auth.access.name,
    metadata: { ids: parsed.data.ids },
  });
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
