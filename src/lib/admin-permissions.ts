import "server-only";

import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export const adminPermissions = {
  SUPER_ADMIN: ["*"],
  MANAGER: [
    "admin:read",
    "catalog:write",
    "orders:write",
    "customers:read",
    "inventory:write",
    "marketing:write",
    "media:write",
    "analytics:read",
  ],
  ORDER_MANAGER: ["admin:read", "orders:write", "customers:read", "inventory:write"],
  CONTENT_EDITOR: ["admin:read", "catalog:write", "marketing:write", "media:write", "analytics:read"],
  CUSTOMER: [],
} as const satisfies Record<UserRole, readonly string[]>;

export type AdminPermission =
  | "*"
  | "admin:read"
  | "catalog:write"
  | "orders:write"
  | "customers:read"
  | "inventory:write"
  | "marketing:write"
  | "media:write"
  | "analytics:read"
  | "security:write";

export type AdminAccess = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  isDevelopmentFallback: boolean;
};

function normalizeRole(role?: string | null): UserRole {
  if (role && role in UserRole) return role as UserRole;
  return UserRole.CUSTOMER;
}

function hasPermission(role: UserRole, permission: AdminPermission) {
  const permissions: readonly string[] = adminPermissions[role];
  return permissions.includes("*") || permissions.includes(permission);
}

function parseCustomPermissions(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((permission): permission is string => typeof permission === "string")
      : [];
  } catch {
    return [];
  }
}

function accessHasPermission(access: AdminAccess, permission: AdminPermission) {
  return access.permissions.includes("*") || access.permissions.includes(permission);
}

export async function getAdminAccess(): Promise<AdminAccess | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminRole: { select: { permissions: true } },
      },
    });
    const role = normalizeRole(user?.role);
    const permissions = Array.from(
      new Set([
        ...adminPermissions[role],
        ...parseCustomPermissions(user?.adminRole?.permissions),
      ]),
    );

    if (!user || (!hasPermission(role, "admin:read") && !permissions.includes("admin:read"))) {
      return null;
    }

    return {
      id: user.id,
      name: user.name ?? "Admin user",
      email: user.email,
      role,
      permissions,
      isDevelopmentFallback: false,
    };
  }

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_INSECURE_ADMIN_FALLBACK === "true"
  ) {
    return {
      id: "development-admin",
      name: "Development admin",
      email: "dev@velora.local",
      role: UserRole.SUPER_ADMIN,
      permissions: [...adminPermissions.SUPER_ADMIN],
      isDevelopmentFallback: true,
    };
  }

  return null;
}

export async function requireAdminPermission(permission: AdminPermission) {
  const access = await getAdminAccess();

  if (!access) {
    const error = new Error("Authentication required");
    error.name = "AdminAuthenticationError";
    throw error;
  }

  if (!accessHasPermission(access, permission)) {
    const error = new Error("Forbidden");
    error.name = "AdminPermissionError";
    throw error;
  }

  return access;
}
