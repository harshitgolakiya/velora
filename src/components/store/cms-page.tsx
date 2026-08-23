import { Breadcrumbs } from "./breadcrumbs";
import { ContentBlockRenderer } from "./content-block-renderer";
import { getPublishedPageContent, type ContentBlock } from "@/lib/content-cms";

export async function CmsPage({ slug, label, fallback }: { slug: string; label: string; fallback: ContentBlock[] }) {
  const page = await getPublishedPageContent(slug);
  return (
    <section className="page-transition storefront-container-narrow py-8 sm:py-10">
      <Breadcrumbs items={[{ label }]} />
      {page?.summary ? (
        <p className="storefront-body-copy mb-10 max-w-3xl border-s-2 border-[var(--accent)] bg-[var(--surface)] px-5 py-4 text-[var(--muted)]">
          {page.summary}
        </p>
      ) : null}
      <ContentBlockRenderer blocks={page?.blocks.length ? page.blocks : fallback} />
    </section>
  );
}
