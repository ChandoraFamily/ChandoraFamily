import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Chandora – Official Family Tree & Lineage Archive",
    short_name: "Chandora",
    description:
      "Official Chandora family tree, genealogy archive, and ancestral pedigree records at chandora.in. Curated by Ajay Kumar Chandora.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#080b20",
    theme_color: "#080b20",
    categories: ["lifestyle", "utilities", "education"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
