import { redirect } from "next/navigation";
import { SupportManager } from "@/components/admin/support-manager";
import { getAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminSupportPage() {
  const access = await getAdminAccess();
  if (!access) redirect("/admin-login?callbackUrl=/admin/support");
  const cases = await prisma.supportCase.findMany({ orderBy: [{ priority: "desc" }, { createdAt: "desc" }], take: 300, include: { order: { select: { orderNumber: true, status: true } } } });
  return <SupportManager initialCases={cases.map((item) => ({ ...item, assignedTo: item.assignedTo ?? undefined, adminNote: item.adminNote ?? undefined, order: item.order ? { orderNumber: item.order.orderNumber, status: item.order.status } : undefined, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }))} />;
}
