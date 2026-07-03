import type { Metadata } from "next";
import { CmsPage } from "@/components/store/cms-page";
import { localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = { alternates: localizedAlternates("/care-guide") };

export default function CareGuidePage() { return <CmsPage slug="care-guide" label="Care Guide" fallback={[{ id: "care-hero", type: "HERO", eyebrow: "Product care", heading: "Keep performance intact.", body: "Simple care choices preserve stretch, colour, and technical finishes." }, { id: "care-cards", type: "CARDS", heading: "The essentials", items: [{ title: "Wash cool", body: "Use a gentle cycle with similar colours and turn pieces inside out." }, { title: "Skip softener", body: "Fabric softener can coat moisture-management fibres and reduce performance." }, { title: "Air dry", body: "Avoid tumble heat. Lay flat or hang away from direct sun." }] }, { id: "care-detail", type: "TEXT", heading: "Always check the garment label", body: "Product-specific care instructions reflect the exact fabric, trims, padding, and finishes used. Remove bra cups when instructed and close zips before washing." }]} />; }
