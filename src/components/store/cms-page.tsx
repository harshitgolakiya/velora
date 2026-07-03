import { Breadcrumbs } from "./breadcrumbs";
import { ContentBlockRenderer } from "./content-block-renderer";
import { getPublishedPageContent, type ContentBlock } from "@/lib/content-cms";

export async function CmsPage({ slug, label, fallback }: { slug: string; label: string; fallback: ContentBlock[] }) {
  const page = await getPublishedPageContent(slug);
  return <section className="mx-auto max-w-360 px-4 py-8 sm:px-6 lg:px-8"><Breadcrumbs items={[{ label }]} />{page?.summary ? <p className="mb-10 max-w-3xl text-base leading-7 text-[var(--muted)]">{page.summary}</p> : null}<ContentBlockRenderer blocks={page?.blocks.length ? page.blocks : fallback} /></section>;
}
