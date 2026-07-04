import Image from "next/image";
import { BRAND_ASSETS } from "@/lib/brand/assets";

/**
 * Single source of truth for rendering the Watch Alley mark.
 *
 * Pick the `variant` that matches the slot's aspect ratio:
 *   • Square / chip slots                     → `icon`, `badge`
 *   • Header lockups (wider than tall)        → `primary`, `gold`, `white`
 *   • Footer / cramped horizontal slots       → `inline`, `horizontal`
 *   • Print / single-colour reproduction      → `monochrome`
 *
 * Every variant is SVG, so the mark stays crisp at any DPR without serving
 * multiple raster sizes.
 */
type BrandLogoVariant =
  | "icon"
  | "badge"
  | "primary"
  | "gold"
  | "white"
  | "horizontal"
  | "inline"
  | "monochrome";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /**
   * Defaults to "" so the logo is treated as decorative when paired with a
   * visible wordmark in the same link. Pass a meaningful label when the
   * BrandLogo is the only content of the link/button.
   */
  alt?: string;
}

const LOGO_SRC: Record<BrandLogoVariant, string> = {
  icon: BRAND_ASSETS.twaIcon,
  badge: BRAND_ASSETS.twaBadge,
  primary: BRAND_ASSETS.twaPrimary,
  gold: BRAND_ASSETS.twaGold,
  white: BRAND_ASSETS.twaWhite,
  horizontal: BRAND_ASSETS.horizontal,
  inline: BRAND_ASSETS.inline,
  monochrome: BRAND_ASSETS.monochrome,
};

export function BrandLogo({
  variant = "primary",
  className = "h-14 w-14",
  priority = false,
  sizes = "56px",
  alt = "",
}: BrandLogoProps) {
  return (
    <span className={`relative block shrink-0 ${className}`}>
      <Image
        src={LOGO_SRC[variant]}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain object-center"
      />
    </span>
  );
}
