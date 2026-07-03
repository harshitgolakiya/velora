import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const adminRoles = ["SUPER_ADMIN", "MANAGER", "ORDER_MANAGER", "CONTENT_EDITOR"] as const;

const updateAdminUserSchema = z.object({
  name: z.string().min(2),
  role: z.enum(adminRoles),
});

function mapAdminUser(row: {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    name: row.name ?? row.email,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("security:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = updateAdminUserSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid admin user payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const current = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });

  if (!current) {
    return NextResponse.json({ message: "Admin user not found" }, { status: 404 });
  }

  const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  if (current.role === "SUPER_ADMIN" && parsed.data.role !== "SUPER_ADMIN" && superAdminCount <= 1) {
    return NextResponse.json({ message: "At least one super admin is required" }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name.trim(),
      role: parsed.data.role as UserRole,
    },
  });

  await recordAdminActivity({
    action: `Updated admin user ${user.email} role to ${user.role}`,
    entityType: "admin_user",
    entityId: user.id,
    actor: auth.access.name,
    metadata: { previousRole: current.role, nextRole: user.role },
  });

  return NextResponse.json({ user: mapAdminUser(user) });
}
