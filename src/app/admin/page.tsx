import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin/admin-console";
import { getAdminCatalog } from "@/lib/admin-catalog";
import { getAdminAccess } from "@/lib/admin-permissions";

export const metadata: Metadata = {
  title: "Admin",
  description: "Velora ecommerce operations dashboard.",
};

export default async function AdminPage() {
  const access = await getAdminAccess();
  if (!access) redirect("/admin-login?callbackUrl=/admin");

  const catalog = await getAdminCatalog();
  return <AdminConsole access={access} catalog={catalog} />;
}
