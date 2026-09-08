import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

/**
 * Site icon generator.
 *
 * Source of truth is public/brand/twa-watch-icon.svg — the watch mark, drawn
 * transparent so the browser's own tab colour shows through.
 *
 * Two shapes come out of it, because the platforms want different things:
 *
 *   favicon.ico + icon.png   transparent. The tab strip and the manifest's
 *                            `purpose: "any"` slot both composite over whatever
 *                            ground they have, and the mark is designed for it.
 *
 *   apple-icon.png           opaque walnut, mark inset to the maskable safe
 *                            zone. iOS fills a transparent apple-touch-icon
 *                            with black, and an Android maskable icon is
 *                            cropped to a platform shape, so a transparent one
 *                            renders as a hole. Both want a real background and
 *                            the artwork kept inside the inner 80%.
 *
 * The drafting-compass lockup (twa-logo-icon.svg) is untouched and still owns
 * the nav, footer, letterhead and social marks.
 *
 * Run: pnpm run brand:generate-site-icons
 */

const CANVAS = 512;
const WALNUT = "#13110F";
/** Maskable safe zone is the inner 80%; keep the mark comfortably inside it. */
const MASKABLE_SCALE = 0.62;

const SOURCE = "public/brand/twa-watch-icon.svg";

const outputTargets = {
  transparentPng: ["src/app/icon.png", "public/icon.png"],
  maskablePng: ["src/app/apple-icon.png", "public/apple-touch-icon.png"],
  ico: ["src/app/favicon.ico", "public/favicon.ico"],
};

const markSvg = await readFile(SOURCE, "utf8");

/** The mark alone, transparent, at `size` px. */
function renderTransparent(size) {
  return sharp(Buffer.from(markSvg), { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** The mark inset on an opaque walnut square, for iOS and Android maskable. */
async function renderMaskable(size) {
  const inner = Math.round(size * MASKABLE_SCALE);
  const mark = await renderTransparent(inner);
  const offset = Math.round((size - inner) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: WALNUT },
  })
    .composite([{ input: mark, top: offset, left: offset }])
    .png()
    .toBuffer();
}

/** Minimal multi-size .ico container around 32-bit PNG frames. */
function makeIco(images) {
  const headerSize = 6;
  const directorySize = images.length * 16;
  let offset = headerSize + directorySize;
  const header = Buffer.alloc(headerSize + directorySize);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  images.forEach(({ size, buffer }, index) => {
    const entryOffset = headerSize + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset);
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(buffer.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += buffer.length;
  });

  return Buffer.concat([header, ...images.map((image) => image.buffer)]);
}

const transparent512 = await renderTransparent(CANVAS);
for (const target of outputTargets.transparentPng) {
  await writeFile(target, transparent512);
}

const maskable512 = await renderMaskable(CANVAS);
for (const target of outputTargets.maskablePng) {
  await writeFile(target, maskable512);
}

const icoImages = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, buffer: await renderTransparent(size) }))
);
const ico = makeIco(icoImages);
for (const target of outputTargets.ico) {
  await writeFile(target, ico);
}

console.log(
  `Generated ${outputTargets.transparentPng.length} transparent PNG, ` +
    `${outputTargets.maskablePng.length} maskable PNG and ${outputTargets.ico.length} ICO files from ${SOURCE}.`
);
