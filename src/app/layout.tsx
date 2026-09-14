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
  title: "Chandora Family Tree",
  description:
    "Interactive pedigree and family tree genealogy app with person search, relationship calculations, and lineage exploration.",
  applicationName: "ChandoraTree",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ChandoraTree",
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
  openGraph: {
    title: "Chandora Family Tree",
    description:
      "Interactive pedigree and family tree genealogy app with person search, relationship calculations, and lineage exploration.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
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

