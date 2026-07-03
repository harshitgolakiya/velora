import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { passwordSchema } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";

const adminRoles = ["SUPER_ADMIN", "MANAGER", "ORDER_MANAGER", "CONTENT_EDITOR"] as const;

const createAdminUserSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: passwordSchema,
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

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("security:write");
  if ("response" in auth) return auth.response;

  const parsed = createAdminUserSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid admin user payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const passwordHash = await bcrypt.hash(data.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role as UserRole,
      },
    });

    await recordAdminActivity({
      action: `Created admin user ${user.email} as ${user.role}`,
      entityType: "admin_user",
      entityId: user.id,
      actor: auth.access.name,
      metadata: { role: user.role },
    });

    return NextResponse.json({ user: mapAdminUser(user) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create admin user";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ message: "A user with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
