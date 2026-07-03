import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { ProductDetail } from "@/components/store/product-detail";
import { ProductTabs } from "@/components/store/product-tabs";
import { getDbProductPreview, getDbProducts } from "@/lib/catalog-db";
import { getAdminAccess } from "@/lib/admin-permissions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "Product preview | Velora Admin",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AdminProductPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getAdminAccess();
  if (!access) redirect(`/admin-login?callbackUrl=/admin/products/${id}/preview`);
  const [product, products] = await Promise.all([getDbProductPreview(id), getDbProducts()]);

  if (!product) notFound();

  const related = products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 max-w-360 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href={`/admin/products/${product.id}`}
            className="inline-flex h-9 items-center gap-2 border border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--hover)]"
          >
            <ArrowLeft className="size-4" />
            Edit product
          </Link>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] sm:inline">
            Admin preview
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`/product/${product.slug}`}
              className="inline-flex h-9 items-center gap-2 border border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--hover)]"
            >
              Public URL
              <ExternalLink className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-360 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
          This preview renders the product exactly through the storefront product components. Draft and scheduled products
          are visible here, but normal shop pages still only fetch published products.
        </div>

        <ProductDetail product={product} />
        <ProductTabs product={product} />

        {related.length ? (
          <div className="mt-20">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Storefront context</p>
                <h2 className="mt-2 font-serif text-3xl">Published related products</h2>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
