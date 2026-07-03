import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { readReturnEvidence } from "@/lib/return-evidence-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;
  const { id, evidenceId } = await params;
  const evidence = await prisma.returnRequestEvidence.findFirst({ where: { id: evidenceId, requestId: id } });
  if (!evidence) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readReturnEvidence(evidence.storageKey);
    return new Response(bytes, {
      headers: {
        "Content-Type": evidence.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${evidence.originalName.replace(/["\r\n]/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
