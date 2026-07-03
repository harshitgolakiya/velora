import type { Metadata } from "next";
import { headers } from "next/headers";
import { Poppins } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { Analytics } from "@/components/store/analytics";
import { GlobalRouteProgress } from "@/components/global-route-progress";
import { getPublishedGlobalContent } from "@/lib/global-content-store";
import { dirForLocale, type Locale } from "@/lib/i18n";
import { localizedAlternates, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://velora.ae"),
  alternates: localizedAlternates("/"),
  title: {
    default: "Velora | Premium Activewear",
    template: "%s | Velora",
  },
  description: "Premium activewear essentials shaped for movement, warm-weather city life, and fast checkout.",
  openGraph: {
    title: "Velora",
    description: "Premium activewear designed for movement across warm-weather city life.",
    type: "website",
    siteName: "Velora",
    locale: "en_AE",
    images: [
      {
        url: "/images/velora/hero-sculpted-essentials.jpg",
        width: 1440,
        height: 900,
        alt: "Velora premium activewear campaign",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Velora | Premium Activewear",
    description: "Premium activewear essentials shaped for movement and fast checkout.",
    images: ["/images/velora/hero-sculpted-essentials.jpg"],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = ((await headers()).get("x-velora-locale") === "ar" ? "ar" : "en") satisfies Locale;
  const globalContent = await getPublishedGlobalContent();

  return (
    <html lang={locale} dir={dirForLocale(locale)} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${poppins.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationJsonLd(), websiteJsonLd()]) }}
        />
        <Analytics />
        <GlobalRouteProgress />
        <AppShell globalContent={globalContent}>{children}</AppShell>
      </body>
    </html>
  );
}
