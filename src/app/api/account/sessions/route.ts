import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomerSession } from "@/lib/account-data";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

const revokeSchema = z.object({
  sessionToken: z.string().trim().min(16).max(120),
});

function deviceLabel(userAgent?: string | null) {
  const value = userAgent ?? "";
  if (/iphone|android.*mobile/i.test(value)) return "Mobile browser";
  if (/ipad|tablet/i.test(value)) return "Tablet browser";
  if (/windows|macintosh|linux/i.test(value)) return "Desktop browser";
  return "Signed-in device";
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? undefined;
}

async function touchCurrentSession(request: Request, userId: string, sessionToken?: string) {
  if (!sessionToken) return;
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? undefined;
  await prisma.accountSession.upsert({
    where: { sessionToken },
    create: {
      sessionToken,
      userId,
      deviceLabel: deviceLabel(userAgent),
      userAgent,
      ipAddress: clientIp(request),
      lastSeenAt: new Date(),
    },
    update: {
      deviceLabel: deviceLabel(userAgent),
      userAgent,
      ipAddress: clientIp(request),
      lastSeenAt: new Date(),
    },
  });
}

export async function GET(request: Request) {
  const session = await requireCustomerSession();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await touchCurrentSession(request, session.user.id, session.user.sessionId);
  const sessions = await prisma.accountSession.findMany({
    where: { userId: session.user.id },
    orderBy: [{ revokedAt: "asc" }, { lastSeenAt: "desc" }],
    take: 20,
  });

  return NextResponse.json({
    currentSessionToken: session.user.sessionId,
    sessions: sessions.map((row) => ({
      sessionToken: row.sessionToken,
      deviceLabel: row.deviceLabel,
      userAgent: row.userAgent,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString(),
      revokedReason: row.revokedReason,
      current: row.sessionToken === session.user.sessionId,
    })),
  });
}

export async function DELETE(request: Request) {
  const session = await requireCustomerSession();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const csrf = requireSameOriginRequest(request);
  if (csrf) return csrf;

  const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid session revoke payload" }, { status: 400 });
  }

  const target = await prisma.accountSession.findFirst({
    where: {
      userId: session.user.id,
      sessionToken: parsed.data.sessionToken,
    },
    select: { sessionToken: true, revokedAt: true },
  });
  if (!target) return NextResponse.json({ message: "Session not found" }, { status: 404 });

  const revokedAt = target.revokedAt ?? new Date();
  await prisma.accountSession.update({
    where: { sessionToken: target.sessionToken },
    data: {
      revokedAt,
      revokedReason: target.sessionToken === session.user.sessionId ? "Customer signed out this device" : "Customer revoked this device",
    },
  });

  return NextResponse.json({
    revoked: true,
    revokedCurrent: target.sessionToken === session.user.sessionId,
    revokedAt: revokedAt.toISOString(),
  });
}
