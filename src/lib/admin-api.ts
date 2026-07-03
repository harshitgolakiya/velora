import "server-only";

import { NextResponse } from "next/server";
import {
  type AdminAccess,
  type AdminPermission,
  requireAdminPermission,
} from "./admin-permissions";
import { checkAdminRateLimit } from "./admin-rate-limit";

export async function requireAdminApiPermission(
  permission: AdminPermission,
): Promise<{ access: AdminAccess } | { response: NextResponse }> {
  try {
    const access = await requireAdminPermission(permission);
    const rateLimit = checkAdminRateLimit(access.id);

    if (!rateLimit.allowed) {
      return {
        response: NextResponse.json(
          { message: "Too many admin requests. Please wait before trying again." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))),
              "X-RateLimit-Limit": String(rateLimit.limit),
              "X-RateLimit-Remaining": String(rateLimit.remaining),
            },
          },
        ),
      };
    }

    return { access };
  } catch (error) {
    const isUnauthenticated =
      error instanceof Error && error.name === "AdminAuthenticationError";
    return {
      response: NextResponse.json(
        {
          message: isUnauthenticated
            ? "Sign in with an admin account to continue."
            : "You do not have permission to perform this admin action.",
        },
        { status: isUnauthenticated ? 401 : 403 },
      ),
    };
  }
}
