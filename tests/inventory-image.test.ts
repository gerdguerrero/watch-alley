import { describe, expect, it } from "vitest";
import { thumbnailUrl } from "@/lib/inventory/image";

const BUCKET = "https://yrzawkqcifuubtltktbk.supabase.co/storage/v1/object/public/watches";

describe("thumbnailUrl (used by /og-image instead of Storage transforms)", () => {
  it("maps a stored watch photo to its pre-generated WebP sibling", () => {
    expect(thumbnailUrl(`${BUCKET}/twa-001/front.jpg`)).toBe(`${BUCKET}/twa-001/front.thumb.webp`);
    expect(thumbnailUrl(`${BUCKET}/twa-001/front.PNG`)).toBe(`${BUCKET}/twa-001/front.thumb.webp`);
  });

  it("is idempotent for a sibling that is already a thumbnail", () => {
    const thumb = `${BUCKET}/twa-001/front.thumb.webp`;
    expect(thumbnailUrl(thumb)).toBe(thumb);
  });

  it("leaves non-bucket sources alone so nothing requests a missing derivative", () => {
    expect(thumbnailUrl("/watch-assets/alpinist.png")).toBe("/watch-assets/alpinist.png");
    expect(thumbnailUrl("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
    expect(thumbnailUrl("")).toBe("");
    expect(thumbnailUrl(null)).toBe("");
  });

  it("never produces a Storage render (transformation) URL", () => {
    expect(thumbnailUrl(`${BUCKET}/twa-001/front.jpg`)).not.toContain("/render/image/");
  });
});
