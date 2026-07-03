import { NextResponse } from "next/server";
import { getAuthorizedAccountOrder } from "@/lib/account-orders";
import { requireCustomerSession } from "@/lib/account-data";
import { prisma } from "@/lib/prisma";
import { deleteReturnEvidence, MAX_RETURN_EVIDENCE_FILES, storeReturnEvidence } from "@/lib/return-evidence-storage";
import { sendReturnAdminActivityNotification } from "@/lib/return-notifications";
import { scanReturnEvidence } from "@/lib/return-malware-scan";

export async function POST(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const session = await requireCustomerSession();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { orderNumber } = await params;
  const order = await getAuthorizedAccountOrder({ orderNumber, userId: session.user.id, email: session.user.email });
  if (!order) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const returnRequest = order.returnRequests[0];
  if (!returnRequest) return NextResponse.json({ message: "Submit the return request before adding evidence." }, { status: 409 });
  if (!['PENDING', 'AWAITING_CUSTOMER'].includes(returnRequest.status)) {
    return NextResponse.json({ message: "Evidence can no longer be added to this request." }, { status: 409 });
  }

  const form = await request.formData();
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length) return NextResponse.json({ message: "Choose at least one image." }, { status: 400 });
  if (returnRequest.evidence.length + files.length > MAX_RETURN_EVIDENCE_FILES) {
    return NextResponse.json({ message: `A maximum of ${MAX_RETURN_EVIDENCE_FILES} evidence images is allowed.` }, { status: 400 });
  }

  const uploaded = [];
  try {
    for (const file of files) {
      const scan = await scanReturnEvidence(file);
      const stored = await storeReturnEvidence(returnRequest.id, file);
      try {
        const evidence = await prisma.returnRequestEvidence.create({
          data: {
            requestId: returnRequest.id,
            storageKey: stored.storageKey,
            originalName: file.name.slice(0, 240),
            mimeType: stored.mimeType,
            sizeBytes: stored.bytes.byteLength,
            uploadedBy: session.user.email,
            scanStatus: scan.status,
            scanProvider: scan.provider,
            scanReference: scan.reference,
            scannedAt: scan.scannedAt,
          },
        });
        uploaded.push({
          id: evidence.id,
          originalName: evidence.originalName,
          mimeType: evidence.mimeType,
          sizeBytes: evidence.sizeBytes,
          createdAt: evidence.createdAt.toISOString(),
          url: `/api/account/orders/${order.orderNumber}/return-request/evidence/${evidence.id}`,
        });
      } catch (error) {
        await deleteReturnEvidence(stored.storageKey);
        throw error;
      }
    }
    const evidenceEvent = await prisma.returnRequestEvent.create({
      data: {
        requestId: returnRequest.id,
        status: returnRequest.status,
        message: `${uploaded.length} evidence image${uploaded.length === 1 ? "" : "s"} added`,
        actor: session.user.email,
      },
    });
    await sendReturnAdminActivityNotification({ requestId: returnRequest.id, activityId: evidenceEvent.id, orderId: order.id, orderNumber: order.orderNumber, status: returnRequest.status, message: evidenceEvent.message ?? "Customer added evidence" });
    return NextResponse.json({ evidence: uploaded, message: "Evidence uploaded." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to upload evidence." }, { status: 400 });
  }
}
