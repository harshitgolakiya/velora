import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductDetail } from "@/components/store/product-detail";
import { ProductReviews } from "@/components/store/product-reviews";
import { ProductTabs } from "@/components/store/product-tabs";
import { RecentlyViewedProducts } from "@/components/store/recently-viewed-products";
import { RecommendationRail } from "@/components/store/recommendation-rail";
import { getCmsProduct, getCmsProducts } from "@/lib/cms";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProductRecommendations } from "@/lib/product-recommendations";
import { getRecommendationSettings } from "@/lib/store-settings";
import { buildReviewStructuredData } from "@/lib/review-presentation";
import { absoluteUrl, localizedAlternates, primaryImage, productJsonLd } from "@/lib/seo";

export async function generateStaticParams() {
  const products = await getCmsProducts("en");
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getCmsProduct(slug);
  const title = product?.seoTitle ?? product?.name ?? "Product";
  const description = product?.seoDescription ?? product?.description ?? "Premium Velora activewear product.";

  return {
    title,
    description,
    alternates: localizedAlternates(`/product/${slug}`),
    openGraph: {
      title,
      description,
      type: "website",
      url: absoluteUrl(`/product/${slug}`),
      images: (product?.socialImage ? [product.socialImage] : product?.images)?.map((image) => ({
        url: absoluteUrl(image),
        width: 1200,
        height: 1500,
        alt: product?.name ?? "Velora product",
      })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(product?.socialImage ?? primaryImage(product?.images))],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, products, session, recommendationSettings] = await Promise.all([
    getCmsProduct(slug),
    getCmsProducts(),
    getServerSession(authOptions),
    getRecommendationSettings(),
  ]);
  if (!product) notFound();
  const fitPreferences = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferredSize: true, fitPreference: true, compressionPreference: true },
      })
    : null;

  const related = recommendationSettings.enabled
    ? getProductRecommendations({
        product,
        products,
        limit: recommendationSettings.maxItems,
        strategy: recommendationSettings.strategy,
        manualProductIds: recommendationSettings.manualOverrides[product.id] ?? [],
      })
    : [];

  return (
    <section className="mx-auto max-w-360 px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            ...productJsonLd(product),
            review: buildReviewStructuredData(product.reviewItems ?? []),
          }),
        }}
      />

      <Breadcrumbs
        items={[
          { label: "Shop", href: "/shop" },
          { label: product.category, href: "/shop" },
          { label: product.name },
        ]}
      />

      <ProductDetail product={product} fitPreferences={fitPreferences ?? undefined} />

      {/* Full-width tabs */}
      <ProductTabs product={product} />
      <ProductReviews product={product} />

      {/* People Also Bought */}
      {recommendationSettings.enabled ? <div className="mt-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Complete the look
        </p>
        <h2 className="mt-2 text-center text-4xl font-medium">You may also like</h2>
        <RecommendationRail
          sourceProductId={product.id}
          products={related.length ? related : products.filter((item) => item.id !== product.id).slice(0, recommendationSettings.maxItems)}
          strategy={recommendationSettings.strategy}
        />
      </div> : null}
      <RecentlyViewedProducts current={product.slug} products={products} />
    </section>
  );
}
