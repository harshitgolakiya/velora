import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ContentBlockRenderer } from "@/components/store/content-block-renderer";
import { getPublishedPageContent } from "@/lib/content-cms";
import { localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = { alternates: localizedAlternates("/story") };

export default async function StoryPage() {
  const page = await getPublishedPageContent("story");
  return (
    <section className="mx-auto max-w-360 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "The Story" }]} />
      <ContentBlockRenderer blocks={page?.blocks ?? [{ id: "story-hero", type: "HERO", eyebrow: "The story", heading: "Designed for composed movement.", body: "Technical pieces with quiet branding, warm-weather intelligence, and styling that works beyond training.", imageUrl: "/images/velora/story.jpg" }, { id: "story-text", type: "TEXT", heading: "Built for movement everywhere", body: "A considered wardrobe for training, travel, and the hours between. Every silhouette begins with function, then removes everything unnecessary." }]} />
    </section>
  );
}
