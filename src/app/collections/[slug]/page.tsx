import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { PageHeader } from "@/components/store/page-header";
import { ShopControls } from "@/components/store/shop-controls";
import { compactProductsForList } from "@/lib/catalog-performance";
import { getCmsCategories, getCmsCategoryDetails, getCmsCollection, getCmsCollections, getCmsProducts } from "@/lib/cms";
import { absoluteUrl, collectionJsonLd, localizedAlternates } from "@/lib/seo";

export async function generateStaticParams() {
  const collections = await getCmsCollections("en");
  return collections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getCmsCollection(slug);
  const title = collection?.seoTitle ?? collection?.name ?? "Collection";
  const description = collection?.seoDescription ?? collection?.summary;
  return {
    title,
    description,
    alternates: localizedAlternates(`/collections/${slug}`),
    openGraph: {
      title,
      description,
      type: "website",
      url: absoluteUrl(`/collections/${slug}`),
      images: collection?.socialImage || collection?.image ? [{ url: absoluteUrl(collection.socialImage ?? collection.image), alt: collection.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: collection?.socialImage || collection?.image ? [absoluteUrl(collection.socialImage ?? collection.image)] : undefined,
    },
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [collection, products, categories, categoryDetails, collections] = await Promise.all([
    getCmsCollection(slug),
    getCmsProducts(),
    getCmsCategories(),
    getCmsCategoryDetails(),
    getCmsCollections(),
  ]);
  if (!collection) notFound();
  const collectionProducts = products.filter((product) => product.collections?.includes(slug) || product.collection === slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd(collection, collectionProducts.length)) }}
      />
      <PageHeader eyebrow="Collection" title={collection.name} description={collection.summary} image={collection.image} />
      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Shop", href: "/shop" }, { label: collection.name }]} />
        <ShopControls
          collection={slug}
          products={compactProductsForList(products)}
          categories={categories}
          categoryDetails={categoryDetails}
          collections={collections}
        />
      </section>
    </>
  );
}
