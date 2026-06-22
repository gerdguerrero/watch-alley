import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const CANVAS_SIZE = 512;
const COMPASS_SOURCE_SIZE = 360;
const COMPASS_CENTER = { x: 178.86, y: 181.39 };
const COMPASS_RENDER_SIZE = 452;
const BACKGROUND = "#050504";
const GOLD = "#BD9A32";

const outputTargets = {
  png: ["src/app/icon.png", "src/app/apple-icon.png", "public/icon.png", "public/apple-touch-icon.png"],
  ico: ["src/app/favicon.ico", "public/favicon.ico"],
};

function svgDataUri(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function renderIcon(size) {
  const compassSvg = await readFile("public/brand/twa-logo-icon.svg", "utf8");
  const renderScale = COMPASS_RENDER_SIZE / COMPASS_SOURCE_SIZE;
  const x = CANVAS_SIZE / 2 - COMPASS_CENTER.x * renderScale;
  const y = CANVAS_SIZE / 2 - COMPASS_CENTER.y * renderScale;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}">
  <rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" rx="96" fill="${BACKGROUND}" />
  <image href="${svgDataUri(compassSvg.replaceAll("#BD9A32", GOLD))}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${COMPASS_RENDER_SIZE}" height="${COMPASS_RENDER_SIZE}" />
</svg>`;

  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

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

const png512 = await renderIcon(512);
for (const target of outputTargets.png) {
  await writeFile(target, png512);
}

const icoImages = await Promise.all([16, 32, 48].map(async (size) => ({ size, buffer: await renderIcon(size) })));
const ico = makeIco(icoImages);
for (const target of outputTargets.ico) {
  await writeFile(target, ico);
}

console.log(`Generated ${outputTargets.png.length} PNG icons and ${outputTargets.ico.length} ICO files.`);
