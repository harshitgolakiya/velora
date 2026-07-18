import { NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function checkDatabase() {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "ok" as const,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    logger.warn("Database health check failed", { error });
    return {
      status: "failed" as const,
      latencyMs: Math.round(performance.now() - startedAt),
      message: error instanceof Error ? error.message : "Database check failed",
    };
  }
}

export async function GET() {
  const database = await checkDatabase();
  const ok = database.status === "ok";

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      service: "velora",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RELEASE_VERSION ?? "local",
      checkedAt: new Date().toISOString(),
      checks: { database },
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
