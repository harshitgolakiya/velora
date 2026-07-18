import type { Metadata } from "next";
import { CmsPage } from "@/components/store/cms-page";
import { getPageContentMetadata } from "@/lib/content-cms";

export function generateMetadata(): Promise<Metadata> {
  return getPageContentMetadata({
    slug: "size-guide",
    path: "/size-guide",
    title: "Activewear Size Guide",
    description: "General body measurements and fit guidance.",
  });
}

export default function SizeGuidePage() { return <CmsPage slug="size-guide" label="Size Guide" fallback={[{ id: "size-hero", type: "HERO", eyebrow: "Fit guide", heading: "Choose your intended fit.", body: "Use body measurements as a starting point, then account for the support level and stretch of each fabric." }, { id: "size-table", type: "COMPARISON", heading: "Women’s size guide", items: [{ name: "XS", support: "Bust 78–82 cm", feel: "Waist 60–64 cm", bestFor: "Hip 86–90 cm" }, { name: "S", support: "Bust 83–87 cm", feel: "Waist 65–69 cm", bestFor: "Hip 91–95 cm" }, { name: "M", support: "Bust 88–92 cm", feel: "Waist 70–74 cm", bestFor: "Hip 96–100 cm" }, { name: "L", support: "Bust 93–99 cm", feel: "Waist 75–81 cm", bestFor: "Hip 101–107 cm" }] }, { id: "size-help", type: "TEXT", heading: "Between sizes?", body: "Choose the smaller size for a firmer compressive fit or the larger size for easier movement. Product-specific fit notes take priority over this general guide." }]} />; }
