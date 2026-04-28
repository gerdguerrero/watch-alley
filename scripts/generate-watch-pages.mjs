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

// Detects whether a watch row is a draft. Defaults to published when the
// flag is missing (e.g. older static-JSON callers).
function isDraft(watch) {
  return watch && watch.published === false;
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
  const draft = isDraft(watch);

  return {
    title: `<title>${escapeHtml(draft ? `[DRAFT] ${title}` : title)}</title>`,
    description: `<meta name="description" content="${escapeHtml(description)}">`,
    canonical: `<link rel="canonical" href="${escapeHtml(url)}">`,
    // Draft listings must never get indexed and must not pass into social
    // graphs. We send strong noindex/nofollow + Google's noimageindex hint
    // and skip OG/Twitter card emission so drafts don't get cached by FB.
    robots: draft
      ? `<meta name="robots" content="noindex,nofollow,noimageindex,noarchive">`
      : '',
    og: draft ? '' : [
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
    // No Schema.org Product JSON-LD on drafts: search engines should not
    // ingest pricing/availability for unpublished pieces.
    productJsonLd: draft
      ? ''
      : `<script type="application/ld+json">\n${buildProductJsonLd(watch)}\n  </script>`,
  };
}

// HTML banner injected into the body of a draft page. Heritage-craft
// register: paper background, walnut ink, gold rule, fixed-position bar.
function draftBannerHtml(watch) {
  const slug = escapeHtml(watch.slug || '');
  return `<div role="status" aria-live="polite" style="
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    padding: 10px 18px;
    background: oklch(0.92 0.018 80);
    color: oklch(0.28 0.02 60);
    border-bottom: 1px solid oklch(0.55 0.12 70);
    display: flex; gap: 14px; align-items: center; justify-content: center;
    flex-wrap: wrap;
    font-family: 'JetBrains Mono', Menlo, monospace;
    font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
  "><strong style="color: oklch(0.40 0.10 70);">DRAFT · ${slug}</strong><span style="font-family: Georgia, serif; font-style: italic; text-transform: none; letter-spacing: 0; font-size: 13px;">Not published. Visible only via this preview link.</span></div>\n<style>body { padding-top: 44px; }</style>`;
}

function rewriteHead(html, watch) {
  const inj = renderHeadInjections(watch);
  const draft = isDraft(watch);

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

  // 4. OG/Twitter block — published gets a watch-specific block; drafts
  //    get the strong robots meta in its place.
  out = out.replace(
    /<meta property="og:type"[\s\S]*?<meta name="twitter:card"[\s\S]*?>/,
    draft ? inj.robots : inj.og
  );

  // 5. JSON-LD (published only). Leaves the LocalBusiness block already in
  //    place; appends the per-watch Product+Offer JSON-LD just before
  //    </head>. Drafts skip this entirely.
  if (inj.productJsonLd) {
    out = out.replace(/<\/head>/, `  ${inj.productJsonLd}\n</head>`);
  }

  // 6. Draft banner injected at the top of <body> so the operator can
  //    visually distinguish a preview from a live page.
  if (draft) {
    out = out.replace(/<body>/, `<body>\n${draftBannerHtml(watch)}`);
  }

  return out;
}

function rewriteSitemap(watches, journalSlugs = []) {
  const today = new Date().toISOString().slice(0, 10);
  const base = [
    { loc: `${SITE_ORIGIN}/`, freq: 'weekly', priority: '1.0' },
    { loc: `${SITE_ORIGIN}/journal`, freq: 'weekly', priority: '0.8' },
    ...journalSlugs.map((slug) => ({
      loc: `${SITE_ORIGIN}/journal/${slug}`,
      freq: 'monthly',
      priority: '0.7',
      lastmod: today,
    })),
    { loc: `${SITE_ORIGIN}/authenticity.html`, freq: 'monthly', priority: '0.8' },
    { loc: `${SITE_ORIGIN}/terms.html`, freq: 'monthly', priority: '0.6' },
    { loc: `${SITE_ORIGIN}/privacy.html`, freq: 'monthly', priority: '0.6' },
  ];
  // Drafts never appear in the sitemap.
  const entries = base.concat(
    watches.filter((w) => !isDraft(w)).map((w) => ({
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

// Tiny .env.local loader matching scripts/sync-watches-from-supabase.mjs.
function loadEnv() {
  const envPath = path.join(projectRoot, '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Pull draft listings from Supabase using the service role. Drafts never
// land in public/data/watches.json (which is the published-only fallback);
// the build pipeline is the only place that can see them, so the operator
// can preview at /watch/<slug> after a deploy.
async function fetchDraftsFromSupabase() {
  loadEnv();
  const url = process.env.WATCH_ALLEY_SUPABASE_URL;
  const serviceKey = process.env.WATCH_ALLEY_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || url.includes('YOUR-NEW-PROJECT-REF') || !serviceKey) {
    console.warn('Watch generator: service-role env not set; drafts will not render this build.');
    return [];
  }

  const endpoint = new URL('/rest/v1/watches', url);
  endpoint.searchParams.set('select', '*');
  endpoint.searchParams.set('published', 'eq.false');

  const response = await fetch(endpoint, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.warn(`Watch generator: drafts fetch responded ${response.status}. ${body.slice(0, 240)}`);
    return [];
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) return [];
  // Convert from snake_case DB rows to the camelCase shape the rest of the
  // generator expects. Mirrors public/data/watches.json.
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    model: row.model,
    reference: row.reference,
    name: row.name,
    price: Number(row.price ?? 0),
    currency: row.currency || 'PHP',
    status: row.status || 'available',
    conditionLabel: row.condition_label,
    badge: row.badge,
    movement: row.movement,
    caseSize: row.case_size,
    set: row.inclusion_set,
    material: row.material,
    edition: row.edition,
    description: row.description,
    disclosure: row.disclosure,
    provenance: row.provenance || '',
    primaryImage: row.primary_image,
    images: Array.isArray(row.images) ? row.images : [],
    inquirySubject: row.inquiry_subject,
    inquiryBody: row.inquiry_body,
    soldAt: row.sold_at || null,
    soldPrice: row.sold_price ?? null,
    hasBox: row.has_box,
    hasPapers: row.has_papers,
    serviceHistory: row.service_history,
    featured: row.featured === true,
    lowStock: row.low_stock === true,
    published: row.published === true, // false here by definition
  }));
}

async function main() {
  if (!existsSync(distIndex)) fail(`dist/index.html not found — run \`pnpm build\` first.`);
  if (!existsSync(inventoryPath)) fail(`inventory not found at ${inventoryPath}`);

  const indexHtml = readFileSync(distIndex, 'utf8');
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const publishedWatches = Array.isArray(inventory.watches) ? inventory.watches : [];
  if (publishedWatches.length === 0) fail('inventory has no watches');

  // Drafts are pulled live from Supabase (RLS-blocked from anon; service
  // role bypasses). They render with noindex + a draft banner and are
  // excluded from the sitemap.
  const drafts = await fetchDraftsFromSupabase();
  const watches = publishedWatches.concat(drafts);

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

  // The journal generator writes its own slugs to a tiny manifest so we can
  // include them in the sitemap without coupling the two scripts. If the
  // manifest doesn't exist yet (first build, or generator skipped), the
  // sitemap simply omits journal article URLs and the index page link still
  // works.
  let journalSlugs = [];
  const manifestPath = path.join(distDir, 'journal', '_manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (Array.isArray(manifest.slugs)) journalSlugs = manifest.slugs;
    } catch {
      /* ignore — manifest is best-effort */
    }
  }

  // Rewrite sitemap with all watch URLs.
  writeFileSync(distSitemap, rewriteSitemap(watches, journalSlugs));

  const draftCount = drafts.length;
  console.log(
    `Watch pages: ${written} written to dist/watch/ (${publishedWatches.length} published + ${draftCount} draft). Stale dirs removed: ${removed}. Sitemap regenerated (${journalSlugs.length} journal articles).`
  );
}

await main();
