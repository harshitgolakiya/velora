import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProductDetailPage } from "@/components/admin/product-detail-page";
import { getAdminCatalogOptions, getAdminProduct, getAdminProductActivityLogs } from "@/lib/admin-catalog";
import { getAdminAccess } from "@/lib/admin-permissions";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Product | Admin",
    description: "Velora admin product workspace.",
    robots: { index: false, follow: false },
  };
}

export default async function AdminProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getAdminAccess();
  if (!access) redirect(`/admin-login?callbackUrl=/admin/products/${id}`);
  const [product, options, auditLogs] = await Promise.all([
    getAdminProduct(id),
    getAdminCatalogOptions(),
    getAdminProductActivityLogs(id),
  ]);

  if (!product) notFound();

  return (
    <ProductDetailPage
      product={product}
      categories={options.categories}
      collections={options.collections}
      tags={options.tags}
      mediaAssets={options.mediaAssets}
      auditLogs={auditLogs}
    />
  );
}
