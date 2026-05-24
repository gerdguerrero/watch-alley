import Image from "next/image";

interface BrandLogoProps {
  variant?: "gold" | "white" | "dpFlat" | "blackLockup" | "whiteLockup";
  className?: string;
  priority?: boolean;
  sizes?: string;
}

const LOGO_SRC = {
  gold: "/favicon.svg",
  white: "/brand/logo-bw.svg",
  dpFlat: "/brand/logo-inline.svg",
  blackLockup: "/brand/logo-horizontal.svg",
  whiteLockup: "/brand/logo-bw.svg",
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
