export const DEFAULT_VIBER_MESSAGE_BUDGET = 7000;
export const LEGACY_VIBER_URI_BUDGET = 200;

const DEFAULT_PUBLIC_ORIGIN = 'https://www.thewatchalley.com';
const VIBER_URI_PREFIX = 'viber://forward?text=';
const WATCH_URL_PATTERN = /https:\/\/(?:www\.)?thewatchalley\.com\/watch\/\S+/gi;

/**
 * Adapt the persisted admin row into the public-only fields allowed in a
 * Viber share. Deliberately accepts no form state: an unsaved checkbox or
 * edited price must never produce a message that disagrees with its URL.
 */
export function savedPublicWatchForViber(watch) {
  if (!watch?.slug || watch.published !== true) return null;
  return {
    slug: watch.slug,
    name: watch.name,
    brand: watch.brand,
    model: watch.model,
    reference: watch.reference,
    price: watch.price,
    conditionLabel: watch.condition_label,
    inclusionSet: watch.inclusion_set,
    hasBox: watch.has_box === true,
    hasPapers: watch.has_papers === true,
    category: watch.category,
    badge: watch.badge,
    badges: Array.isArray(watch.badges) ? watch.badges : [],
    edition: watch.edition,
    description: watch.description,
    status: watch.status,
  };
}

function wellFormed(value) {
  const text = String(value || '');
  return typeof text.toWellFormed === 'function'
    ? text.toWellFormed()
    : Array.from(text, (character) => {
        const codeUnit = character.charCodeAt(0);
        const isLoneSurrogate = character.length === 1 && codeUnit >= 0xd800 && codeUnit <= 0xdfff;
        return isLoneSurrogate ? '�' : character;
      }).join('');
}

function cleanInline(value, maxLength = 240) {
  const clean = wellFormed(value).replace(/\s+/g, ' ').trim();
  return Array.from(clean).slice(0, maxLength).join('').trim();
}

function cleanSavedBody(value) {
  return wellFormed(value)
    .replace(/\r\n?/g, '\n')
    .replace(WATCH_URL_PATTERN, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => !/^\s*🔗\s*$/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function listingTitle(listing) {
  const name = cleanInline(listing?.name, 240);
  if (name) return name;
  const brand = cleanInline(listing?.brand, 80);
  const model = cleanInline(listing?.model, 180);
  if (brand && model.toLowerCase().includes(brand.toLowerCase())) return model;
  return [brand, model].filter(Boolean).join(' ') || 'The Watch Alley timepiece';
}

function formatPhp(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price on request';
  return `Php ${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

function publicWatchUrl(slug, origin) {
  const cleanSlug = wellFormed(slug).trim();
  if (!cleanSlug) throw new Error('A saved public listing slug is required');
  const cleanOrigin = String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, '');
  return `${cleanOrigin}/watch/${encodeURIComponent(cleanSlug)}`;
}

function conditionHeading(listing) {
  if (listing?.category === 'brand-new') return 'Brand New';
  if (listing?.category === 'pre-owned') return 'Pre-owned';
  const condition = cleanInline(listing?.conditionLabel, 100);
  if (/\bbrand[ -]?new\b/i.test(condition)) return 'Brand New';
  if (/\bpre[ -]?owned\b/i.test(condition)) return 'Pre-owned';
  return condition || '';
}

function conditionDetail(listing) {
  if (listing?.category === 'brand-new') return '';
  const condition = cleanInline(listing?.conditionLabel, 100)
    .replace(/^brand[ -]?new\b\s*/i, '')
    .replace(/^pre[ -]?owned\b\s*/i, '')
    .trim();
  if (!condition) return '';
  return /condition$/i.test(condition) ? condition : `${condition} condition`;
}

function inclusionText(listing) {
  const explicit = cleanInline(listing?.inclusionSet, 160);
  if (explicit) return explicit;
  if (listing?.hasBox && listing?.hasPapers) return 'complete set';
  if (listing?.hasBox) return 'with original box';
  if (listing?.hasPapers) return 'with papers / warranty';
  return '';
}

function hasSaleBadge(listing) {
  return [listing?.badge, ...(Array.isArray(listing?.badges) ? listing.badges : [])]
    .some((value) => /\bsale\b/i.test(String(value || '')));
}

function buildOwnerStyleBody(listing) {
  const savedBody = cleanSavedBody(listing?.description);
  if (savedBody) return savedBody;

  const title = listingTitle(listing);
  const condition = conditionHeading(listing);
  const reference = cleanInline(listing?.reference, 100);
  const edition = cleanInline(listing?.edition, 220);
  const referenceLine = [reference, edition].filter(Boolean).join(' - ');
  const inclusion = inclusionText(listing);
  const conditionLine = conditionDetail(listing);
  // Reinsert deliberate paragraph gaps after filtering optional sections.
  const paragraphs = [];
  if (hasSaleBadge(listing)) paragraphs.push('SALE!');
  paragraphs.push([condition, title].filter(Boolean).join('\n'));
  if (referenceLine) paragraphs.push(referenceLine);
  paragraphs.push([
    formatPhp(listing?.price),
    inclusion ? `- ${inclusion}` : '',
    conditionLine ? `- ${conditionLine}` : '',
  ].filter(Boolean).join('\n'));
  return paragraphs.filter(Boolean).join('\n\n');
}

function messageLength(value) {
  return value.length;
}

function truncateBody(value, budget, suffix = '...') {
  if (messageLength(value) <= budget) return value;
  const contentBudget = Math.max(0, budget - messageLength(suffix));
  let raw = '';
  for (const character of Array.from(value)) {
    if (messageLength(raw) + messageLength(character) > contentBudget) break;
    raw += character;
  }
  const lineBoundary = raw.lastIndexOf('\n');
  const wordBoundary = raw.lastIndexOf(' ');
  const boundary = Math.max(lineBoundary, wordBoundary);
  const excerpt = (boundary > contentBudget - 40 ? raw.slice(0, boundary) : raw)
    .trim()
    .replace(/[.,;:!?-]+$/, '');
  return `${excerpt || raw.trim()}${suffix}`;
}

/**
 * Build a user-mediated Viber post. The saved owner-written sales copy is
 * preserved, and the canonical product URL is always the final line so Viber
 * can crawl its Open Graph image. The legacy direct Viber URI is exposed only
 * when the complete decoded message fits its historical 200-unit ceiling;
 * longer posts use the native share sheet or copy fallback in the admin UI.
 */
export function buildViberSharePayload(listing, options = {}) {
  const messageBudget = Number(options.messageBudget) || DEFAULT_VIBER_MESSAGE_BUDGET;
  const origin = options.origin || DEFAULT_PUBLIC_ORIGIN;
  const url = publicWatchUrl(listing?.slug, origin);
  const completeBody = buildOwnerStyleBody(listing);
  const separator = '\n\n';
  const bodyBudget = messageBudget - messageLength(separator) - messageLength(url);
  if (bodyBudget < 8) throw new Error('This listing URL is too long to share through Viber safely');

  const body = truncateBody(completeBody, bodyBudget);
  const message = `${body}${separator}${url}`;
  if (messageLength(message) > messageBudget) {
    throw new Error('This listing is too long to hand off safely to Viber');
  }

  return {
    href:
      messageLength(message) <= LEGACY_VIBER_URI_BUDGET
        ? `${VIBER_URI_PREFIX}${encodeURIComponent(message)}`
        : null,
    message,
    messageLength: messageLength(message),
    bodyTruncated: body !== completeBody,
    url,
  };
}
