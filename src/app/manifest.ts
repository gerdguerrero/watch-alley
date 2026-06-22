import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/lib/brand/assets";
import { SITE_DESCRIPTION } from "@/lib/seo/schema";

/**
 * PWA manifest — controls "Add to Home Screen" appearance on iOS and Android
 * and the install card on desktop Chrome. Colours mirror the brand palette so
 * the install splash matches the storefront chrome.
 *
 * Next.js auto-serves this at /manifest.webmanifest and emits the
 * <link rel="manifest"> tag through layout.tsx's metadata.manifest field.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Watch Alley",
    short_name: "Watch Alley",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: BRAND_COLORS.walnut,
    theme_color: BRAND_COLORS.walnut,
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
