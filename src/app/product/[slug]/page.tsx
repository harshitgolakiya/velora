import { cache } from "react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductDetail } from "@/components/store/product-detail";
import {
  DeferredProductReviews,
  DeferredProductTabs,
  DeferredRecentlyViewedProducts,
  DeferredRecommendationRail,
} from "@/components/store/product-page-deferred";
import { getCmsProduct, getCmsProducts, getCmsRecommendationProducts } from "@/lib/cms";
import { compactProductsForList } from "@/lib/catalog-performance";
import { getProductRecommendations } from "@/lib/product-recommendations";
import { getRecommendationSettings } from "@/lib/store-settings";
import { buildReviewStructuredData } from "@/lib/review-presentation";
import { absoluteUrl, localizedAlternates, primaryImage, productJsonLd } from "@/lib/seo";

const getProductForPage = cache((slug: string) => getCmsProduct(slug));
const getProductsForStaticParams = cache(() => getCmsProducts("en"));
const getRecommendationSettingsForPage = cache(() => getRecommendationSettings());
const getRecommendationProductsForPage = cache((limit: number) => getCmsRecommendationProducts(undefined, limit));

export async function generateStaticParams() {
  const products = await getProductsForStaticParams();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductForPage(slug);
  const title = product?.seoTitle ?? product?.name ?? "Product";
  const description = product?.seoDescription ?? product?.description ?? "Premium Velora activewear designed for movement.";

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
  const [product, recommendationSettings] = await Promise.all([
    getProductForPage(slug),
    getRecommendationSettingsForPage(),
  ]);
  if (!product) notFound();
  const candidateCount = recommendationSettings.enabled
    ? Math.max(recommendationSettings.maxItems * 3, 12)
    : 8;
  const listProducts = compactProductsForList(await getRecommendationProductsForPage(candidateCount));

  const related = recommendationSettings.enabled
    ? getProductRecommendations({
        product,
        products: listProducts,
        limit: recommendationSettings.maxItems,
        strategy: recommendationSettings.strategy,
        manualProductIds: recommendationSettings.manualOverrides[product.id] ?? [],
      })
    : [];

  return (
    <section className="storefront-container-narrow pb-32 pt-6 sm:pb-28 sm:pt-10">
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
        className="hidden sm:block"
        items={[
          { label: "Shop", href: "/shop" },
          { label: product.category, href: "/shop" },
          { label: product.name },
        ]}
      />

      <ProductDetail product={product} />

      <div className="mt-8 sm:mt-12 lg:mt-0" data-pdp-lower-content>
        {/* Full-width tabs */}
        <DeferredProductTabs product={product} />
        <DeferredProductReviews product={product} />

        {/* People Also Bought */}
        <div className="mt-10 scroll-mt-28 sm:mt-14 lg:mt-16">
        {recommendationSettings.enabled ? (
          <>
            <p className="eyebrow text-center">Complete the look</p>
            <h2 className="display-lg mt-3 text-center">You may also like</h2>
            <DeferredRecommendationRail
              sourceProductId={product.id}
              products={
                related.length
                  ? related
                  : listProducts
                      .filter((item) => item.id !== product.id)
                      .slice(0, recommendationSettings.maxItems)
              }
              strategy={recommendationSettings.strategy}
            />
          </>
        ) : null}
        <DeferredRecentlyViewedProducts current={product.slug} products={listProducts} />
        </div>
      </div>
    </section>
  );
}
