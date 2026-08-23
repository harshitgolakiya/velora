import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ContentBlockRenderer } from "@/components/store/content-block-renderer";
import { getPageContentMetadata, getPublishedPageContent } from "@/lib/content-cms";

export function generateMetadata(): Promise<Metadata> {
  return getPageContentMetadata({
    slug: "fabric-guide",
    path: "/fabric-guide",
    title: "Fabric and Fit Guide",
    description: "Compare support, handfeel, and climate performance.",
  });
}

export default async function FabricGuidePage() {
  const page = await getPublishedPageContent("fabric-guide");
  return (
    <section className="storefront-container-narrow py-8">
      <Breadcrumbs items={[{ label: "Fabric Guide" }]} />
      <ContentBlockRenderer blocks={page?.blocks ?? [{ id: "fabric-hero", type: "HERO", eyebrow: "Fabric and fit", heading: "Materials with purpose.", body: "Compare support, handfeel, and climate performance before choosing your next layer." }, { id: "fabric-comparison", type: "COMPARISON", heading: "Find your fabric", items: [{ name: "Sculpt", support: "Firm", feel: "Cool and matte", bestFor: "Studio and high-support training" }, { name: "Air", support: "Light", feel: "Featherweight", bestFor: "Warm-weather and outdoor movement" }, { name: "Rib", support: "Medium", feel: "Soft and tactile", bestFor: "Low-impact training and daily wear" }] }]} />
    </section>
  );
}
