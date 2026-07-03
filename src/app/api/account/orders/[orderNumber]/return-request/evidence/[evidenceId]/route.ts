import { getAuthorizedAccountOrder } from "@/lib/account-orders";
import { requireCustomerSession } from "@/lib/account-data";
import { readReturnEvidence } from "@/lib/return-evidence-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ orderNumber: string; evidenceId: string }> }) {
  const session = await requireCustomerSession();
  if (!session?.user?.id || !session.user.email) return new Response("Unauthorized", { status: 401 });
  const { orderNumber, evidenceId } = await params;
  const order = await getAuthorizedAccountOrder({ orderNumber, userId: session.user.id, email: session.user.email });
  const evidence = order?.returnRequests[0]?.evidence.find((item) => item.id === evidenceId);
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
