// Homepage News & Promos / journal dispatches contract validator.
//
// Guards the public homepage feed so CMS posts remain visible, live, and
// operator-friendly after publish.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const indexHtml = readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

function fail(message) {
  console.error(`Journal dispatches validation failed: ${message}`);
  process.exit(1);
}
function assert(condition, message) { if (!condition) fail(message); }

assert(/<section id="news"/.test(indexHtml), 'homepage must declare the News & Promos section');
assert(/id="news-grid"/.test(indexHtml), 'News & Promos must include #news-grid as the render target');
assert(/const SUPABASE_JOURNAL_ENDPOINT\s*=\s*['"]https:\/\/[^'"]+\.supabase\.co\/rest\/v1\/journal_posts['"]/.test(indexHtml), 'homepage must read journal dispatches from Supabase');
assert(/status['"]\s*,\s*['"]eq\.published/.test(indexHtml), 'homepage journal feed must request only published posts');
assert(/order['"]\s*,\s*['"]published_at\.desc/.test(indexHtml), 'homepage journal feed must show newest published posts first');
assert(!/Accept-Profile['"]?\s*:\s*['"]watch_alley['"]/.test(indexHtml), 'homepage journal feed must query the exposed public view, not the private watch_alley schema');
assert(/function revealJournalDispatches\s*\(/.test(indexHtml), 'homepage must explicitly reveal async-injected journal cards');
assert(/renderJournalFallback\(\)/.test(indexHtml), 'homepage must render a visible fallback when Supabase journal fetch fails');
assert(/newsGrid\.innerHTML\s*=\s*JOURNAL_FALLBACK_HTML/.test(indexHtml), 'fallback renderer must inject JOURNAL_FALLBACK_HTML');
assert(/revealJournalDispatches\(\)/.test(indexHtml), 'journal dispatch render paths must reveal injected content');
assert(/href="\/journal"/.test(indexHtml), 'News & Promos view-all link must point to /journal');
assert(/href="\/journal\/\$\{escapeHtml\(featured\.slug\)\}"/.test(indexHtml), 'featured dispatch CTA must use canonical /journal/<slug> links');
assert(/class="news-card" href="\/journal\/\$\{escapeHtml\(post\.slug\)\}"/.test(indexHtml), 'dispatch cards must use canonical /journal/<slug> links');
assert(/if \(!featured\)[\s\S]*?renderJournalFallback\(\)/.test(indexHtml), 'renderJournalDispatches must handle an empty post list safely');

console.log('Journal dispatches contract valid: homepage News & Promos reads live published posts, falls back visibly, and links to /journal.');
