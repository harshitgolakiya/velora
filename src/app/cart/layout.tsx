import type { Metadata } from "next";
import { localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = { alternates: localizedAlternates("/cart") };

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
