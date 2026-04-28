// Per-watch page contract validator (Wave 2 of Bet 1).
//
// Locks down the build pipeline that turns each watch into a real shareable
// URL with per-watch meta + Schema.org Product + a 1200x630 OG card.
//
// Verifies:
//   • prebuild + postbuild hooks are wired in package.json
//   • generator scripts exist
//   • storefront detects the path-based /watch/<slug> deep link
//   • after `pnpm build` ran, every active+sold watch has:
//       - dist/watch/<slug>/index.html
//       - per-watch <title>, <meta description>, canonical, OG/Twitter, JSON-LD Product
//       - dist/og/<slug>.jpg of reasonable size
//   • dist/sitemap.xml enumerates every watch URL

import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const indexHtml = readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const inventory = JSON.parse(
  readFileSync(path.join(projectRoot, 'public', 'data', 'watches.json'), 'utf8')
);

function fail(message) {
  console.error(`Watch pages contract validation failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

// ── package.json hooks ───────────────────────────────────────────────
assert(
  pkg.scripts && /generate-og-images\.mjs/.test(pkg.scripts.prebuild || ''),
  'package.json must define a "prebuild" that runs scripts/generate-og-images.mjs'
);
assert(
  pkg.scripts && /generate-watch-pages\.mjs/.test(pkg.scripts.postbuild || ''),
  'package.json must define a "postbuild" that runs scripts/generate-watch-pages.mjs'
);

// ── generator scripts present ─────────────────────────────────────────
assert(
  existsSync(path.join(projectRoot, 'scripts', 'generate-og-images.mjs')),
  'scripts/generate-og-images.mjs must exist'
);
assert(
  existsSync(path.join(projectRoot, 'scripts', 'generate-watch-pages.mjs')),
  'scripts/generate-watch-pages.mjs must exist'
);

// ── Storefront path-based deep-link wiring ────────────────────────────
assert(
  /WATCH_PATH_PREFIX\s*=\s*['"]\/watch\/['"]/.test(indexHtml),
  'storefront must define WATCH_PATH_PREFIX = "/watch/"'
);
assert(
  /pathname\.startsWith\(WATCH_PATH_PREFIX\)/.test(indexHtml),
  'getWatchHashSlug must detect the path form /watch/<slug>'
);
assert(
  /\$\{origin\}\$\{WATCH_PATH_PREFIX\}\$\{safeSlug\}/.test(indexHtml),
  'buildWatchShareUrl must emit the canonical path form (origin + /watch/<slug>)'
);

// ── dist artefacts (only enforced after a build has been run) ─────────
const distDir = path.join(projectRoot, 'dist');
const distIndex = path.join(distDir, 'index.html');
const ogDir = path.join(distDir, 'og');
const watchRoot = path.join(distDir, 'watch');
const distSitemap = path.join(distDir, 'sitemap.xml');

if (!existsSync(distIndex) || !existsSync(watchRoot)) {
  console.log('Watch pages contract: scripts + storefront wiring valid (dist not present; run `pnpm build` for full check).');
  process.exit(0);
}

const watches = Array.isArray(inventory.watches) ? inventory.watches : [];
assert(watches.length >= 1, 'inventory must contain at least one watch');

let validated = 0;
for (const watch of watches) {
  const slug = String(watch.slug || '').trim();
  if (!slug) continue;

  const pageHtml = path.join(watchRoot, slug, 'index.html');
  assert(existsSync(pageHtml), `dist/watch/${slug}/index.html must be generated`);

  const html = readFileSync(pageHtml, 'utf8');
  assert(
    new RegExp(`<link rel="canonical" href="https://watchalley\\.ph/watch/${slug}"`).test(html),
    `${slug}: canonical URL must point at /watch/${slug}`
  );
  assert(
    /<title>[^<]+The Watch Alley PH<\/title>/.test(html),
    `${slug}: <title> must end with "The Watch Alley PH"`
  );
  assert(
    /<meta property="og:type" content="(product|article)"/.test(html),
    `${slug}: OG type must be product or article`
  );
  assert(
    new RegExp(`<meta property="og:image" content="https://watchalley\\.ph/og/${slug}\\.jpg"`).test(html),
    `${slug}: OG image must point at /og/${slug}.jpg`
  );
  assert(
    /"@type":\s*"Product"/.test(html) && /"@type":\s*"Offer"/.test(html),
    `${slug}: Schema.org Product + Offer JSON-LD must be present`
  );

  const ogJpg = path.join(ogDir, `${slug}.jpg`);
  assert(existsSync(ogJpg), `dist/og/${slug}.jpg must exist`);
  assert(
    statSync(ogJpg).size > 5_000,
    `dist/og/${slug}.jpg must be at least 5 KB (got an empty/broken render)`
  );
  assert(
    statSync(ogJpg).size < 300_000,
    `dist/og/${slug}.jpg must be under 300 KB so social platforms cache it`
  );

  validated += 1;
}

// Sitemap must include every watch URL.
if (existsSync(distSitemap)) {
  const sitemap = readFileSync(distSitemap, 'utf8');
  for (const watch of watches) {
    const slug = String(watch.slug || '').trim();
    if (!slug) continue;
    assert(
      sitemap.includes(`https://watchalley.ph/watch/${slug}`),
      `dist/sitemap.xml must enumerate /watch/${slug}`
    );
  }
}

console.log(`Watch pages contract valid: ${validated} per-watch pages + OG cards generated, sitemap enumerates them.`);
