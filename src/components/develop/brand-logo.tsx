import Image from "next/image";
import { BRAND_ASSETS } from "@/lib/brand/assets";

interface BrandLogoProps {
  variant?: "gold" | "white" | "blackLockup" | "whiteLockup";
  className?: string;
  priority?: boolean;
  sizes?: string;
}

const LOGO_SRC = {
  gold: BRAND_ASSETS.logoGold,
  white: BRAND_ASSETS.logoWhite,
  blackLockup: BRAND_ASSETS.logoOnBlack,
  whiteLockup: BRAND_ASSETS.logoOnWhite,
} as const;

export function BrandLogo({
  variant = "gold",
  className = "h-12 w-40",
  priority = false,
  sizes = "160px",
}: BrandLogoProps) {
  return (
    <span className={`relative block shrink-0 ${className}`}>
      <Image
        src={LOGO_SRC[variant]}
        alt="The Watch Alley"
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain object-left"
      />
    </span>
  );
}
