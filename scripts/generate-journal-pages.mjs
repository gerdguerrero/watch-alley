// Build-time journal page generator.
//
// Rewrites dist/journal.html so the index list reflects the database state
// at deploy time (provides immediate first paint + SEO for the /journal
// listing). Per-post pages are NOT generated as static files — they are
// served by the dynamic /journal/post.html template (with a Vercel rewrite
// from /journal/:slug). This means admin saves go LIVE immediately without
// any redeploy.
//
// Runs as part of `pnpm postbuild`. Idempotent.

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
import { renderMarkdown, escapeHtml } from './lib/markdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const distJournalIndex = path.join(distDir, 'journal.html');
const SITE_ORIGIN = 'https://watchalley.ph';

function fail(message) {
  console.error(`Journal generator failed: ${message}`);
  process.exit(1);
}

// ── Tiny .env.local loader (matches sync-watches-from-supabase.mjs) ──────
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
loadEnv();

const SUPABASE_URL = process.env.WATCH_ALLEY_SUPABASE_URL;
const SUPABASE_KEY = process.env.WATCH_ALLEY_SUPABASE_ANON_KEY;

// ── Fetch published posts ────────────────────────────────────────────────
async function fetchPublishedPosts() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR-NEW-PROJECT-REF')) {
    console.warn('Journal generator: WATCH_ALLEY_SUPABASE_URL not set; skipping (no posts to render).');
    return [];
  }
  if (!SUPABASE_KEY) {
    console.warn('Journal generator: WATCH_ALLEY_SUPABASE_ANON_KEY not set; skipping.');
    return [];
  }
  const endpoint = new URL('/rest/v1/journal_posts', SUPABASE_URL);
  endpoint.searchParams.set('select', 'slug,title,summary,body_markdown,hero_image,tags,author,read_minutes,published_at');
  endpoint.searchParams.set('status', 'eq.published');
  endpoint.searchParams.set('order', 'published_at.desc');

  const response = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    fail(`Supabase responded ${response.status} ${response.statusText}. ${body.slice(0, 240)}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

// ── Per-post HTML template ───────────────────────────────────────────────
function formatPublishedDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function inferReadMinutes(post) {
  if (Number.isFinite(post.read_minutes) && post.read_minutes > 0) return post.read_minutes;
  const words = (post.body_markdown || '').trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

function buildArticleHtml(post, cssHref) {
  const url = `${SITE_ORIGIN}/journal/${post.slug}`;
  const title = post.title || 'Watch Alley Journal';
  const summary = post.summary || '';
  const bodyHtml = renderMarkdown(post.body_markdown || '');
  const dateLabel = formatPublishedDate(post.published_at);
  const readMin = inferReadMinutes(post);
  const author = post.author || 'The Watch Alley';
  const heroOg = post.hero_image
    ? (post.hero_image.startsWith('http') ? post.hero_image : `${SITE_ORIGIN}${post.hero_image}`)
    : `${SITE_ORIGIN}/assets/logo.jpg`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} — The Watch Alley PH</title>
<meta name="description" content="${escapeHtml(summary)}" />
<meta name="theme-color" content="#191713" />
<link rel="canonical" href="${escapeHtml(url)}" />
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(summary)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:image" content="${escapeHtml(heroOg)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Petrona:ital,wght@0,400..700;1,400..700&family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="${escapeHtml(cssHref)}" />
<style>
  .article-wrap { max-width: 720px; margin: 0 auto; padding: clamp(40px, 6vw, 80px) clamp(20px, 4vw, 32px); }
  .article-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--gold); }
  .article-title { font-family: 'Petrona', Georgia, serif; font-size: clamp(32px, 5vw, 56px); font-weight: 500; line-height: 1.08; margin: 14px 0 16px; color: var(--cream); }
  .article-title em { font-style: italic; color: var(--gold); }
  .article-meta { font-family: 'Spectral', Georgia, serif; font-style: italic; font-size: 13px; color: var(--cream-60); margin-bottom: 28px; }
  .article-hero { width: 100%; max-width: 720px; margin: 0 0 28px; }
  .article-hero img { width: 100%; height: auto; display: block; border: 1px solid var(--gold-20); }
  .article-body p { font-family: 'Spectral', Georgia, serif; font-size: 17px; line-height: 1.75; color: var(--cream-80); margin: 0 0 18px; max-width: 64ch; }
  .article-body h2 { font-family: 'Petrona', Georgia, serif; font-size: clamp(22px, 2.6vw, 28px); color: var(--cream); margin: 36px 0 12px; line-height: 1.2; }
  .article-body h3 { font-family: 'Petrona', Georgia, serif; font-size: clamp(18px, 2.2vw, 22px); color: var(--cream); margin: 28px 0 10px; line-height: 1.25; }
  .article-body em { color: var(--cream); font-style: italic; }
  .article-body strong { color: var(--cream); font-weight: 600; }
  .article-body a { color: var(--gold); border-bottom: 1px solid var(--gold-20); padding-bottom: 1px; transition: border-color 0.2s ease; }
  .article-body a:hover { border-bottom-color: var(--gold); }
  .article-body ul, .article-body ol { margin: 8px 0 18px 22px; color: var(--cream-80); font-size: 17px; line-height: 1.75; }
  .article-body li { margin-bottom: 6px; }
  .article-body blockquote {
    margin: 28px 0;
    padding: 18px 22px;
    border-top: 1px solid var(--gold-20);
    border-bottom: 1px solid var(--gold-20);
    font-family: 'Petrona', Georgia, serif;
    font-style: italic;
    font-size: 18px;
    color: var(--cream);
    line-height: 1.5;
  }
  .article-body blockquote p { margin: 0; max-width: none; font-size: 18px; }
  .article-body code { font-family: 'JetBrains Mono', monospace; font-size: 14px; background: rgba(201,162,75,0.10); padding: 2px 6px; }
  .article-body pre { background: rgba(0,0,0,0.4); border: 1px solid var(--gold-20); padding: 14px 16px; overflow-x: auto; margin: 16px 0; }
  .article-body pre code { background: transparent; padding: 0; font-size: 13px; line-height: 1.6; color: var(--cream-80); }
  .article-body img { width: 100%; height: auto; margin: 20px 0; border: 1px solid var(--gold-20); }
  .article-body hr { border: none; border-top: 1px solid var(--gold-20); margin: 32px 0; }
  .article-tags {
    margin: 36px 0 0;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .article-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--cream-60);
    border: 1px solid var(--gold-20);
    padding: 6px 12px;
  }
  .article-back {
    display: inline-flex;
    margin-top: 48px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--cream-60);
  }
  .article-back:hover { color: var(--gold); }
</style>
</head>
<body>

<header class="trust-nav">
  <a class="trust-nav-home" href="../">The Watch Alley</a>
  <nav>
    <a href="../#arrivals">Available</a>
    <a href="../#sold-archive">Sold Archive</a>
    <a href="../journal.html">Journal</a>
    <a href="../#viber">Viber</a>
    <a href="../#contact">Contact</a>
  </nav>
</header>

<main class="trust-page">
  <article class="article-wrap">
    <div class="article-eyebrow">${escapeHtml((post.tags && post.tags[0]) || 'Journal')}${dateLabel ? ` · ${escapeHtml(dateLabel)}` : ''}</div>
    <h1 class="article-title">${escapeHtml(title)}</h1>
    <p class="article-meta">By ${escapeHtml(author)} · ${readMin} min read</p>
    ${post.hero_image ? `<figure class="article-hero"><img src="${escapeHtml(post.hero_image)}" alt="${escapeHtml(title)}" /></figure>` : ''}
    <div class="article-body">
${bodyHtml}
    </div>
    ${Array.isArray(post.tags) && post.tags.length > 0 ? `<div class="article-tags">${post.tags.map((t) => `<span class="article-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    <a class="article-back" href="../journal.html">← Back to the Journal</a>
  </article>
</main>

<footer style="padding: 24px clamp(20px, 4vw, 80px); border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-family: 'Spectral', Georgia, serif; font-style: italic; font-size: 13px; color: var(--cream-60);">
  <span>© 2026 The Watch Alley PH, Manila.</span>
  <span><a href="../privacy.html">Privacy</a> · <a href="../terms.html">Terms</a> · <a href="../authenticity.html">Authenticity</a></span>
</footer>

</body>
</html>
`;
}

// ── Index page rewriter ──────────────────────────────────────────────────
function rewriteJournalIndex(distHtml, posts) {
  // Replace the <section class="journal-list" …>…</section> block with one
  // entry per published post. The CSS for these is already in journal.html.
  const listOpen = distHtml.indexOf('<section class="journal-list"');
  if (listOpen === -1) return distHtml;
  const listEnd = distHtml.indexOf('</section>', listOpen);
  if (listEnd === -1) return distHtml;
  const listClose = listEnd + '</section>'.length;

  const entries = posts.map((post, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const dateLabel = formatPublishedDate(post.published_at);
    const tag = (post.tags && post.tags[0]) || 'Journal';
    const readMin = inferReadMinutes(post);
    return `    <a class="journal-entry" href="/journal/${escapeHtml(post.slug)}">
      <div class="journal-num">${num}</div>
      <div class="journal-entry-body">
        <div class="journal-entry-meta">${escapeHtml(tag)}${dateLabel ? ` · ${escapeHtml(dateLabel)}` : ''} · ${readMin} min read</div>
        <div class="journal-entry-title">${escapeHtml(post.title)}</div>
        <p class="journal-entry-summary">${escapeHtml(post.summary)}</p>
      </div>
      <span class="journal-entry-arrow">→</span>
    </a>`;
  }).join('\n');

  const replacement = `<section class="journal-list" aria-label="Recent journal entries">
${entries || '    <p class="admin-meta" style="padding: 24px 0; color: var(--cream-60); font-style: italic;">No journal entries yet.</p>'}
  </section>`;

  return distHtml.slice(0, listOpen) + replacement + distHtml.slice(listClose);
}

// ── Cleanup stale article files ──────────────────────────────────────────
function cleanStaleArticleFiles(distJournalDir, keepSlugs) {
  if (!existsSync(distJournalDir)) return 0;
  const keep = new Set(keepSlugs);
  let removed = 0;
  for (const entry of readdirSync(distJournalDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.html')) continue;
    const slug = entry.name.replace(/\.html$/, '');
    if (!keep.has(slug)) {
      rmSync(path.join(distJournalDir, entry.name), { force: true });
      removed += 1;
    }
  }
  return removed;
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(distJournalIndex)) {
    console.warn('Journal generator: dist/journal.html not found; skipping (build did not produce it).');
    return;
  }

  const indexHtmlText = readFileSync(distJournalIndex, 'utf8');
  const posts = await fetchPublishedPosts();

  const distJournalDir = path.join(distDir, 'journal');
  mkdirSync(distJournalDir, { recursive: true });

  // Per-post HTML files are NOT generated. The dynamic /journal/post.html
  // template (with a Vercel rewrite for /journal/:slug) serves every post
  // by reading the slug from the URL and fetching from Supabase. This way,
  // admin saves go live immediately without a redeploy.
  //
  // Clean up any stale per-post HTML files left from previous deploys.
  const removed = cleanStaleArticleFiles(distJournalDir, []);

  // Rewrite the index list inside dist/journal.html so the listing has a
  // live snapshot for first paint + SEO (the dynamic JS in journal.html
  // also re-fetches and replaces it once the page hydrates).
  const updatedIndex = rewriteJournalIndex(indexHtmlText, posts);
  writeFileSync(distJournalIndex, updatedIndex);

  // Manifest so generate-watch-pages.mjs can include slugs in the sitemap.
  const slugs = posts.map((p) => String(p.slug || '').trim()).filter(Boolean);
  writeFileSync(path.join(distJournalDir, '_manifest.json'), JSON.stringify({ slugs }, null, 2));

  console.log(`Journal pages: listing rewritten with ${posts.length} posts. Stale per-post files removed: ${removed}.`);
}

await main();
