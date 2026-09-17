import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeProvider } from "@/lib/theme-context";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const display = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chandora.in"),
  title: {
    default:
      "Chandora – Official Family Tree & Lineage Directory | chandora.in",
    template: "%s | Chandora",
  },
  description:
    "Official Chandora family tree, genealogy directory, and ancestral records at chandora.in. Explore Chandora heritage, pedigree search, and family history curated by Ajay Kumar Chandora.",
  keywords: [
    "chandora",
    "Chandora",
    "chandora.in",
    "ajay chandora",
    "ajay kumar chandora",
    "ram chander chandora",
    "ajay",
    "chandora family",
    "chandora family tree",
    "chandora vanshavali",
    "chandora genealogy",
    "chandora ancestry",
    "chandora lineage",
    "chandora gotra",
    "agnikula chandora",
    "chandora pedigree",
  ],
  authors: [
    { name: "Ajay Kumar Chandora", url: "https://chandora.in" },
    { name: "Ram Chander Chandora" },
  ],
  creator: "Ajay Kumar Chandora",
  publisher: "Chandora Family Heritage",
  applicationName: "Chandora",
  category: "Genealogy & Family History",
  alternates: {
    canonical: "https://chandora.in/",
    languages: {
      en: "https://chandora.in/",
      hi: "https://chandora.in/",
      "x-default": "https://chandora.in/",
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["hi_IN"],
    url: "https://chandora.in/",
    siteName: "Chandora",
    title: "Chandora – Official Chandora Family Tree & Lineage Directory",
    description:
      "Explore the authentic Chandora lineage, family tree, and ancestral records at chandora.in. Curated by Ajay Kumar Chandora.",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Chandora Family Royal Lineage Crest",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chandora – Official Chandora Family Tree & Lineage Directory",
    description:
      "Explore the authentic Chandora family tree, genealogy records, and ancestral lineage at chandora.in.",
    images: ["/icon-512.png"],
    creator: "@chandora",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chandora",
  },
};

export const viewport: Viewport = {
  themeColor: "#080b20",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://chandora.in/#website",
      url: "https://chandora.in/",
      name: "Chandora",
      alternateName: [
        "Chandora Family Tree",
        "Chandora Lineage",
        "chandora.in",
        "चन्दोरा",
        "चांदोरा",
        "चाँदोरा",
        "चान्दोरा",
        "Chandora Vanshavali",
      ],
      description:
        "Official genealogy directory, pedigree archive, and historical lineage records of the Chandora family.",
      inLanguage: ["en", "hi"],
      publisher: {
        "@id": "https://chandora.in/#organization",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://chandora.in/#organization",
      name: "Chandora Family Lineage",
      url: "https://chandora.in/",
      logo: "https://chandora.in/icon-512.png",
      founder: [
        {
          "@type": "Person",
          name: "Ajay Kumar Chandora",
          email: "mailto:ajaykumarchandora@gmail.com",
        },
        {
          "@type": "Person",
          name: "Ram Chander Chandora",
        },
      ],
      knowsAbout: [
        "Chandora Genealogy",
        "Chandora Lineage",
        "Chandora Family History",
        "Pedigree Research",
      ],
    },
    {
      "@type": "WebApplication",
      "@id": "https://chandora.in/#webapp",
      name: "Chandora Family Tree & Lineage App",
      applicationCategory: "ReferenceApplication",
      operatingSystem: "All",
      url: "https://chandora.in/",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-body antialiased bg-[#080b20] text-slate-100">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              {children}
              <PwaRegister />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
