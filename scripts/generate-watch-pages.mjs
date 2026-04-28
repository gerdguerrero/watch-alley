// Post-build per-watch page generator.
//
// For every watch in public/data/watches.json, copies dist/index.html to
// dist/watch/<slug>/index.html and replaces the <title>, <meta description>,
// the OG/Twitter meta block, and the existing LocalBusiness JSON-LD with a
// per-watch variant (canonical URL, OG image at /og/<slug>.png, Schema.org
// Product + Offer). Vercel's cleanUrls + trailingSlash:false serves these at
// /watch/<slug>.
//
// Also rewrites dist/sitemap.xml to enumerate every watch URL.
//
// Idempotent. Run via `pnpm postbuild` (auto-invoked after `pnpm build`).

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const distIndex = path.join(distDir, 'index.html');
const distSitemap = path.join(distDir, 'sitemap.xml');
const inventoryPath = path.join(projectRoot, 'public', 'data', 'watches.json');

const SITE_ORIGIN = 'https://watchalley.ph';

function fail(message) {
  console.error(`Watch page generator failed: ${message}`);
  process.exit(1);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function formatPhp(price) {
  if (!Number.isFinite(Number(price))) return '';
  return `₱${Number(price).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

function buildWatchTitle(watch) {
  const brand = (watch.brand || '').trim();
  const name = (watch.name || '').trim();
  // Avoid double-name like "OMEGA × SWATCH — MoonSwatch — Mission to Mars"
  // when brand and name overlap (the watch.name often already prefixes the
  // collab line). Drop brand if it appears in the name (case-insensitive).
  const brandInName = brand && name && name.toLowerCase().includes(brand.toLowerCase());
  const stem = brandInName
    ? name
    : [brand, name].filter(Boolean).join(' — ');
  const isSold = watch.status === 'sold';
  const alreadyMarkedSold = /\(sold\)/i.test(stem);
  const tail = isSold && !alreadyMarkedSold ? ' (Sold)' : '';
  return `${stem || 'Watch'}${tail} · The Watch Alley PH`;
}

function buildWatchDescription(watch) {
  // Lead with provenance if it exists (the editorial story is the strongest
  // discovery hook). Fall back to description, then a generic catalog line.
  const candidates = [watch.provenance, watch.description].filter(
    (s) => typeof s === 'string' && s.trim().length > 20
  );
  const text = candidates[0] || `Curated ${watch.brand || 'watch'} listing at The Watch Alley PH, Manila.`;
  const stripped = text.replace(/\s+/g, ' ').trim();
  return stripped.length > 240 ? `${stripped.slice(0, 237)}…` : stripped;
}

function buildProductJsonLd(watch) {
  const url = `${SITE_ORIGIN}/watch/${watch.slug}`;
  const ogImage = `${SITE_ORIGIN}/og/${watch.slug}.jpg`;
  const isSold = watch.status === 'sold';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: watch.name,
    sku: watch.id,
    brand: { '@type': 'Brand', name: watch.brand },
    model: watch.model,
    mpn: watch.reference,
    description: buildWatchDescription(watch),
    url,
    image: [ogImage],
    category: 'Watches',
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: watch.currency || 'PHP',
      price: String(isSold ? watch.soldPrice ?? watch.price : watch.price),
      itemCondition: /brand new/i.test(watch.conditionLabel || '')
        ? 'https://schema.org/NewCondition'
        : 'https://schema.org/UsedCondition',
      availability: isSold
        ? 'https://schema.org/SoldOut'
        : watch.status === 'reserved'
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/InStock',
      seller: {
        '@type': 'LocalBusiness',
        name: 'The Watch Alley PH',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Bonifacio Global City',
          addressRegion: 'Metro Manila',
          addressCountry: 'PH',
        },
      },
    },
  };

  return JSON.stringify(jsonLd, null, 2);
}

function renderHeadInjections(watch) {
  const url = `${SITE_ORIGIN}/watch/${watch.slug}`;
  const ogImage = `${SITE_ORIGIN}/og/${watch.slug}.jpg`;
  const title = buildWatchTitle(watch);
  const description = buildWatchDescription(watch);

  return {
    title: `<title>${escapeHtml(title)}</title>`,
    description: `<meta name="description" content="${escapeHtml(description)}">`,
    canonical: `<link rel="canonical" href="${escapeHtml(url)}">`,
    og: [
      `<meta property="og:type" content="${watch.status === 'sold' ? 'article' : 'product'}">`,
      `<meta property="og:title" content="${escapeHtml(title)}">`,
      `<meta property="og:description" content="${escapeHtml(description)}">`,
      `<meta property="og:image" content="${escapeHtml(ogImage)}">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="og:url" content="${escapeHtml(url)}">`,
      `<meta property="og:locale" content="en_PH">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${escapeHtml(title)}">`,
      `<meta name="twitter:description" content="${escapeHtml(description)}">`,
      `<meta name="twitter:image" content="${escapeHtml(ogImage)}">`,
    ].join('\n  '),
    productJsonLd: `<script type="application/ld+json">\n${buildProductJsonLd(watch)}\n  </script>`,
  };
}

function rewriteHead(html, watch) {
  const inj = renderHeadInjections(watch);

  // 1. Title
  let out = html.replace(/<title>[\s\S]*?<\/title>/, inj.title);

  // 2. Description meta
  out = out.replace(
    /<meta name="description" content="[\s\S]*?">/,
    inj.description
  );

  // 3. Canonical
  out = out.replace(
    /<link rel="canonical" href="[\s\S]*?">/,
    inj.canonical
  );

  // 4. OG/Twitter block — replace from `<meta property="og:type"` up to the
  //    last twitter:card meta in the head.
  out = out.replace(
    /<meta property="og:type"[\s\S]*?<meta name="twitter:card"[\s\S]*?>/,
    inj.og
  );

  // 5. JSON-LD: leave the existing LocalBusiness block in place and append
  //    the per-watch Product JSON-LD just before </head>. Two JSON-LD blocks
  //    is allowed and SEO-friendly.
  out = out.replace(/<\/head>/, `  ${inj.productJsonLd}\n</head>`);

  return out;
}

function rewriteSitemap(watches) {
  const today = new Date().toISOString().slice(0, 10);
  const base = [
    { loc: `${SITE_ORIGIN}/`, freq: 'weekly', priority: '1.0' },
    { loc: `${SITE_ORIGIN}/journal`, freq: 'weekly', priority: '0.8' },
    { loc: `${SITE_ORIGIN}/journal/seiko-launches-5th-philippine-limited-edition`, freq: 'monthly', priority: '0.7' },
    { loc: `${SITE_ORIGIN}/journal/omega-marks-75-years-of-the-seamaster`, freq: 'monthly', priority: '0.7' },
    { loc: `${SITE_ORIGIN}/journal/moonswatch-resale-cools-time-to-buy`, freq: 'monthly', priority: '0.7' },
    { loc: `${SITE_ORIGIN}/authenticity.html`, freq: 'monthly', priority: '0.8' },
    { loc: `${SITE_ORIGIN}/terms.html`, freq: 'monthly', priority: '0.6' },
    { loc: `${SITE_ORIGIN}/privacy.html`, freq: 'monthly', priority: '0.6' },
  ];
  const entries = base.concat(
    watches.map((w) => ({
      loc: `${SITE_ORIGIN}/watch/${w.slug}`,
      freq: w.status === 'sold' ? 'yearly' : 'weekly',
      priority: w.status === 'sold' ? '0.4' : '0.9',
      lastmod: today,
    }))
  );

  const body = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : '';
      return `  <url>
    <loc>${escapeHtml(entry.loc)}</loc>${lastmod}
    <changefreq>${entry.freq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function cleanStaleWatchDirs(watches) {
  const watchRoot = path.join(distDir, 'watch');
  if (!existsSync(watchRoot)) return 0;
  const keep = new Set(watches.map((w) => w.slug));
  let removed = 0;
  for (const entry of readdirSync(watchRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!keep.has(entry.name)) {
      rmSync(path.join(watchRoot, entry.name), { recursive: true, force: true });
      removed += 1;
    }
  }
  return removed;
}

function main() {
  if (!existsSync(distIndex)) fail(`dist/index.html not found — run \`pnpm build\` first.`);
  if (!existsSync(inventoryPath)) fail(`inventory not found at ${inventoryPath}`);

  const indexHtml = readFileSync(distIndex, 'utf8');
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const watches = Array.isArray(inventory.watches) ? inventory.watches : [];
  if (watches.length === 0) fail('inventory has no watches');

  const watchRoot = path.join(distDir, 'watch');
  mkdirSync(watchRoot, { recursive: true });

  let written = 0;
  for (const watch of watches) {
    const slug = String(watch.slug || '').trim();
    if (!slug) continue;
    const html = rewriteHead(indexHtml, watch);
    const dir = path.join(watchRoot, slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'index.html'), html);
    written += 1;
  }

  const removed = cleanStaleWatchDirs(watches);

  // Rewrite sitemap with all watch URLs.
  writeFileSync(distSitemap, rewriteSitemap(watches));

  console.log(
    `Watch pages: ${written} written to dist/watch/. Stale dirs removed: ${removed}. Sitemap regenerated.`
  );
}

main();
