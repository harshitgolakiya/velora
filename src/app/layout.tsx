import type { Metadata } from "next";
import { headers } from "next/headers";
import { Poppins } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { DeferredRootEffects } from "@/components/store/deferred-root-effects";
import { getPublishedGlobalContent } from "@/lib/global-content-store";
import { dirForLocale, type Locale } from "@/lib/i18n";
import { localizedAlternates, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["400", "600"],
});

const themeInitScript = `
(() => {
  try {
    const savedTheme = window.localStorage.getItem("velora-theme");
    const preferredTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = preferredTheme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://velora.ae"),
  alternates: localizedAlternates("/"),
  title: {
    default: "Velora | Premium Activewear",
    template: "%s | Velora",
  },
  description: "Premium activewear for workouts, Pilates, yoga, tennis, active days, and everyday movement.",
  openGraph: {
    title: "Velora",
    description: "Premium activewear designed for training, studio sessions, active days, and everyday life.",
    type: "website",
    siteName: "Velora",
    locale: "en_AE",
    images: [
      {
        url: "/images/activewear-demo/active-duo.jpg",
        width: 1440,
        height: 900,
        alt: "Velora premium activewear campaign",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Velora | Premium Activewear",
    description: "Premium activewear for workouts, studio sessions, active days, and everyday movement.",
    images: ["/images/activewear-demo/active-duo.jpg"],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = ((await headers()).get("x-velora-locale") === "ar" ? "ar" : "en") satisfies Locale;
  const globalContent = await getPublishedGlobalContent();

  return (
    <html lang={locale} dir={dirForLocale(locale)} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${poppins.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationJsonLd(), websiteJsonLd()]) }}
        />
        <DeferredRootEffects />
        <AppShell globalContent={globalContent}>{children}</AppShell>
      </body>
    </html>
  );
}
