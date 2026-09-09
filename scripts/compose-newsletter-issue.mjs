/**
 * Compose a Watch List issue from a spec file, end to end.
 *
 * Replaces what was previously done by hand for the 2026-09 restart issue:
 * picking watches, downloading their photographs, resizing them, writing the
 * body HTML with hardcoded paths, and pasting the result into the admin. All
 * of that is now one command.
 *
 * What it does
 *   1. Reads a spec: subject, preheader, prose, and an ordered list of watch
 *      slugs each with a one-line note.
 *   2. Pulls those watches from the live `public.watches` view, so prices,
 *      references and condition labels can never drift from the site.
 *   3. Downloads each primary photograph and writes an email-sized derivative
 *      into `public/newsletter/<slug>/`. The stored originals run 500 KB to
 *      1 MB; four of those would make a 4 MB email.
 *   4. Renders body HTML and a plain-text alternative from the same source, so
 *      the two cannot drift.
 *   5. Upserts the issue as a **draft** when a service-role key is present.
 *      Never approves, never schedules, never sends.
 *
 * Usage
 *   node scripts/compose-newsletter-issue.mjs docs/newsletter/2026-09-restart/issue.json
 *   node scripts/compose-newsletter-issue.mjs <spec> --dry-run   # no DB write
 *
 * Environment
 *   NEXT_PUBLIC_SUPABASE_URL       required
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  required, reads the public watches view
 *   SUPABASE_SERVICE_ROLE_KEY      optional; without it the draft is written
 *                                  to disk for review instead of to the database
 *
 * Two deliberate choices, both learned the hard way:
 *
 *   Images are JPEG, not the stored `.thumb.webp` siblings, because Outlook
 *   desktop cannot decode WebP. They are letterboxed onto #13110F, which is
 *   exactly the email background, so the padding is invisible while no watch
 *   is ever cropped — the listing photographs are square and a cover crop
 *   clips lugs.
 *
 *   Markup uses the shell's semantic classes (`eyebrow`, `muted`,
 *   `accent-heading`, `heading`, `btn-outline`) and never an inline colour.
 *   The shell restyles those under `prefers-color-scheme: light`; an inline
 *   hex survives the sanitizer and then renders, for example, #d1d1cd body
 *   text at 1.43:1 on the light-mode background. Invisible.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const EMAIL_BG = { r: 0x13, g: 0x11, b: 0x0f };
const IMAGE_WIDTH = 1104;
const IMAGE_HEIGHT = 828;
const SITE = "https://www.thewatchalley.com";

const [specPath, ...flags] = process.argv.slice(2);
const dryRun = flags.includes("--dry-run");

if (!specPath) {
  console.error("usage: node scripts/compose-newsletter-issue.mjs <spec.json> [--dry-run]");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
  process.exit(1);
}

const spec = JSON.parse(await readFile(specPath, "utf8"));
const required = ["slug", "subject", "preheader", "internalTitle", "watches"];
for (const key of required) {
  if (!spec[key]) {
    console.error(`spec is missing "${key}"`);
    process.exit(1);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const peso = (n) => (typeof n === "number" && n > 0 ? `₱${n.toLocaleString("en-PH")}` : "Inquire");

/** Fetch the chosen watches from the public view, preserving the spec's order. */
async function fetchWatches(slugs) {
  const filter = slugs.map((s) => `"${s}"`).join(",");
  const url = `${SUPABASE_URL}/rest/v1/watches?slug=in.(${encodeURIComponent(filter)})&select=slug,brand,model,name,reference,price,condition_label,category,status,primary_image`;
  const res = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } });
  if (!res.ok) throw new Error(`watches fetch failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length) throw new Error(`not published or not found: ${missing.join(", ")}`);

  const sold = slugs.filter((s) => bySlug.get(s).status === "sold");
  if (sold.length) throw new Error(`already sold, do not feature: ${sold.join(", ")}`);

  return slugs.map((s) => bySlug.get(s));
}

/** Write an email-sized derivative and return the site-relative path. */
async function prepareImage(watch, outDir, name) {
  if (!watch.primary_image) return null;
  const res = await fetch(watch.primary_image);
  if (!res.ok) {
    console.warn(`  ! ${watch.slug}: image fetch ${res.status}, card will render without a photo`);
    return null;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const file = path.join(outDir, `${name}.jpg`);
  await sharp(buffer)
    .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: "contain", background: EMAIL_BG })
    .jpeg({ quality: 82, mozjpeg: true, progressive: true })
    .toFile(file);
  const { size } = await sharp(file).metadata().then(async () => (await import("node:fs")).statSync(file));
  console.log(`  image ${name.padEnd(12)} ${Math.round(size / 1024)} KB`);
  return `/newsletter/${spec.slug}/${name}.jpg`;
}

/**
 * One watch card. `max-width: 552px` is exactly the shell's desktop content
 * width (600 container less 48 padding), so the image fills the column on
 * desktop and shrinks with it on a phone.
 */
function watchCardHtml(watch, note, imagePath) {
  const href = `/watch/${watch.slug}`;
  const title = note.title || watch.model || watch.name;
  // Price, reference and slug always come from the database so they cannot
  // drift from the site. Brand and condition are labels the inventory spells
  // for an operator rather than for prose ("Casio GSHOCK", "9.2-9.5/10
  // condition"), so the spec may override those two, and only those two.
  const meta = [note.brandLabel || watch.brand, note.conditionLabel || watch.condition_label, note.badge]
    .filter(Boolean)
    .join(" · ");
  const alt = note.alt || `${note.brandLabel || watch.brand} ${title}`;
  const img = imagePath
    ? `<a href="${href}"><img src="${imagePath}" alt="${escapeHtml(alt)}" style="width:100%;max-width:552px;height:auto;border-width:1px;border-style:solid;border-color:rgba(189,154,50,0.18)" /></a>\n`
    : "";
  return `${img}<p class="eyebrow">${escapeHtml(meta)}</p>
<h3 class="accent-heading"><a href="${href}">${escapeHtml(title)}</a></h3>
<p><strong>${peso(watch.price)}</strong><br /><span class="muted">${escapeHtml(note.note || "")}</span></p>`;
}

function watchCardText(watch, note) {
  const title = note.title || watch.model || watch.name;
  // Price, reference and slug always come from the database so they cannot
  // drift from the site. Brand and condition are labels the inventory spells
  // for an operator rather than for prose ("Casio GSHOCK", "9.2-9.5/10
  // condition"), so the spec may override those two, and only those two.
  const meta = [note.brandLabel || watch.brand, note.conditionLabel || watch.condition_label, note.badge]
    .filter(Boolean)
    .join(" · ");
  return `${meta}\n${title} ( ${SITE}/watch/${watch.slug} )\n${peso(watch.price)} — ${note.note || ""}`;
}

// ── compose ────────────────────────────────────────────────────────────────
console.log(`composing "${spec.slug}"`);

const slugs = spec.watches.map((w) => w.slug);
const watches = await fetchWatches(slugs);
console.log(`  ${watches.length} watches resolved from the live view`);

const outDir = path.join("public", "newsletter", spec.slug);
await mkdir(outDir, { recursive: true });

const cards = [];
const cardsText = [];
for (let i = 0; i < watches.length; i++) {
  const watch = watches[i];
  const note = spec.watches[i];
  const imagePath = await prepareImage(watch, outDir, note.image || watch.slug.slice(0, 24));
  cards.push(watchCardHtml(watch, note, imagePath));
  cardsText.push(watchCardText(watch, note));
}

const bodyHtml = [
  `<p class="eyebrow">${escapeHtml(spec.eyebrow || "The Watch List")}</p>`,
  `<h2 class="heading">${escapeHtml(spec.headline || spec.subject)}</h2>`,
  spec.introHtml || "",
  "<hr />",
  cards.join("\n\n<hr />\n\n"),
  "<hr />",
  spec.outroHtml || "",
]
  .filter(Boolean)
  .join("\n\n");

const bodyText = [
  spec.eyebrow || "The Watch List",
  "",
  spec.headline || spec.subject,
  "",
  (spec.introText || "").trim(),
  "",
  "----------------------------------------",
  "",
  cardsText.join("\n\n"),
  "",
  "----------------------------------------",
  "",
  (spec.outroText || "").trim(),
]
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const reviewDir = path.dirname(specPath);
await writeFile(path.join(reviewDir, "body.html"), bodyHtml, "utf8");
await writeFile(path.join(reviewDir, "body.txt"), bodyText, "utf8");
console.log(`  body ${bodyHtml.length} chars html, ${bodyText.length} chars text`);

const row = {
  slug: spec.slug,
  internal_title: spec.internalTitle,
  public_title: spec.publicTitle || spec.subject,
  subject: spec.subject,
  preheader: spec.preheader,
  body_html: bodyHtml,
  body_text: bodyText,
  status: "draft",
  source_type: "composed",
  hero_image_url: spec.heroImageUrl || null,
  archive_visible: false,
};

if (dryRun || !SERVICE_KEY) {
  const reason = dryRun ? "--dry-run" : "no SUPABASE_SERVICE_ROLE_KEY";
  console.log(`\n  draft NOT written to the database (${reason}).`);
  console.log(`  review: ${path.join(reviewDir, "body.html")}`);
  process.exit(0);
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_issues?on_conflict=slug`, {
  method: "POST",
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify(row),
});
if (!res.ok) throw new Error(`draft upsert failed: ${res.status} ${await res.text()}`);
const [saved] = await res.json();
console.log(`\n  draft saved: ${saved.id} (${saved.status})`);
console.log("  it is a draft. Approving, scheduling and sending stay manual, on purpose.");
