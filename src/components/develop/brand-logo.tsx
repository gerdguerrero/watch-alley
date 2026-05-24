import Image from "next/image";
import { BRAND_ASSETS } from "@/lib/brand/assets";

interface BrandLogoProps {
  variant?: "gold" | "white" | "dpFlat" | "blackLockup" | "whiteLockup";
  className?: string;
  priority?: boolean;
  sizes?: string;
}

const LOGO_SRC = {
  gold: BRAND_ASSETS.logoGold,
  white: BRAND_ASSETS.logoWhite,
  dpFlat: BRAND_ASSETS.logoDpFlat,
  blackLockup: BRAND_ASSETS.logoOnBlack,
  whiteLockup: BRAND_ASSETS.logoOnWhite,
} as const;

export function BrandLogo({
  variant = "dpFlat",
  className = "h-14 w-14",
  priority = false,
  sizes = "56px",
}: BrandLogoProps) {
  return (
    <span className={`relative block shrink-0 ${className}`}>
      <Image
        src={LOGO_SRC[variant]}
        alt="The Watch Alley"
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain object-center"
      />
    </span>
  );
}
