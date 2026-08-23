import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ContentBlockRenderer } from "@/components/store/content-block-renderer";
import { getPublishedPageContent } from "@/lib/content-cms";
import { localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = { alternates: localizedAlternates("/story") };

export default async function StoryPage() {
  const page = await getPublishedPageContent("story");
  const storyImage = "/images/activewear-demo/active-neutral.jpg";
  const fallbackBlocks = [
    {
      id: "story-hero",
      type: "HERO" as const,
      eyebrow: "The story",
      heading: "Quiet pieces, cut for modern wardrobes.",
      body: "Velora creates premium activewear that moves naturally between workouts, Pilates, yoga, tennis, active days, and everyday life.",
      imageUrl: storyImage,
    },
    {
      id: "story-text",
      type: "TEXT" as const,
      heading: "Designed around how women actually move",
      body: "Each piece starts with support, stretch, coverage, and repeat wear. The result is activewear that performs in motion and feels considered long after the workout ends.",
    },
  ];
  const blocks = page?.blocks?.length
    ? page.blocks.map((block) =>
        block.type === "HERO" && block.imageUrl?.startsWith("/images/velora/")
          ? { ...block, imageUrl: storyImage }
          : block,
      )
    : fallbackBlocks;
  return (
    <section className="storefront-container-narrow py-8">
      <Breadcrumbs items={[{ label: "The Story" }]} />
      <ContentBlockRenderer blocks={blocks} />
    </section>
  );
}
