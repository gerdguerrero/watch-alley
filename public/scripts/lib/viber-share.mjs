// Viber's legacy forward URI truncates decoded text at roughly 200 UTF-16
// units. Keep the complete canonical link near the top of the message and
// whole caption lines inside that ceiling; otherwise the app silently drops
// the link that makes the share useful.
export const LEGACY_VIBER_URI_BUDGET = 200;

const DEFAULT_PUBLIC_ORIGIN = 'https://www.thewatchalley.com';
const VIBER_URI_PREFIX = 'viber://forward?text=';

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

function listingTitle(listing) {
  let name = cleanInline(listing?.name, 240);
  if (name) {
    // Names often end with "- Ref. XXX"; drop that trailing mention so the
    // reference is not printed twice (it already sits in the share URL).
    const reference = cleanInline(listing?.reference, 100);
    if (reference) {
      const bareRef = reference.replace(/^Ref\.\s*/i, '');
      const escaped = bareRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const trailing = new RegExp(`(?:\\s*[-·|]\\s*(?:Ref\\.\\s*)?${escaped})\\s*$`, 'i');
      const stripped = name.replace(trailing, '').trim();
      if (stripped) name = stripped;
    }
    return name;
  }
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

function inclusionLine(listing) {
  const set = cleanInline(listing?.inclusionSet, 160);
  if (set) return `Includes: ${set}`;
  const parts = [];
  if (listing?.hasBox) parts.push('original box');
  if (listing?.hasPapers) parts.push('papers / warranty');
  return parts.length ? `Includes: ${parts.join(' / ')}` : '';
}

function hasSaleBadge(listing) {
  return [listing?.badge, ...(Array.isArray(listing?.badges) ? listing.badges : [])]
    .some((value) => /\bsale\b/i.test(String(value || '')));
}

function headParts(listing) {
  const parts = [];
  if (hasSaleBadge(listing)) parts.push('SALE!');
  const title = listingTitle(listing);
  if (title) parts.push(title);
  return parts;
}

function detailParts(listing) {
  const parts = [];
  const condition = cleanInline(listing?.conditionLabel, 100);
  if (condition) parts.push(condition);
  const inclusion = inclusionLine(listing);
  if (inclusion) parts.push(inclusion);
  const price = formatPhp(listing?.price);
  if (price) parts.push(price);
  return parts;
}

function buildOwnerStyleBody(listing) {
  const head = headParts(listing).join('\n\n');
  const details = detailParts(listing).join('\n');
  return [head, details].filter(Boolean).join('\n\n');
}

function messageLength(value) {
  // JavaScript string length is UTF-16 code units, which matches the legacy
  // Viber URI limit more closely than Array.from(value).length would.
  return value.length;
}

/**
 * Fit the head block - the optional SALE! banner plus the title - alongside
 * the canonical link. The link is never shortened, because it is the whole
 * point of the share, so an unusually long title drops trailing whole words
 * instead. Nothing is ever cut mid-word, and a title that cannot keep even a
 * single word is dropped so the bare link still goes out intact.
 */
function headWithUrlWithinBudget(parts, url) {
  const fits = (value) => messageLength(value) <= LEGACY_VIBER_URI_BUDGET;
  const compose = (title) => {
    const lines = [...parts.slice(0, -1), title].filter(Boolean);
    return lines.length ? `${lines.join('\n\n')}\n${url}` : url;
  };

  const title = parts.length ? parts[parts.length - 1] : '';
  const words = title.split(' ').filter(Boolean);
  for (let keep = words.length; keep > 0; keep -= 1) {
    const candidate = compose(words.slice(0, keep).join(' '));
    if (fits(candidate)) return candidate;
  }
  const bare = compose('');
  return fits(bare) ? bare : url;
}

/**
 * Build the viber://forward payload. The canonical link sits right after the
 * title so it survives Viber's tail truncation and its crawler can render the
 * Open Graph photo preview. Caption detail lines follow and are kept whole -
 * never mid-word ellipses - dropping trailing lines only when a very long
 * title would otherwise exceed Viber's 200 UTF-16-unit URI ceiling.
 */
export function buildViberSharePayload(listing, options = {}) {
  const origin = options.origin || DEFAULT_PUBLIC_ORIGIN;
  const url = publicWatchUrl(listing?.slug, origin);
  if (messageLength(url) > LEGACY_VIBER_URI_BUDGET) {
    throw new Error('This listing URL is too long to share through Viber safely');
  }

  const parts = headParts(listing);
  const completeHeadWithUrl = parts.length ? `${parts.join('\n\n')}\n${url}` : url;
  const headWithUrl = headWithUrlWithinBudget(parts, url);
  const details = detailParts(listing);

  let message = headWithUrl;
  let bodyTruncated = headWithUrl !== completeHeadWithUrl;
  for (let keep = details.length; keep >= 0; keep -= 1) {
    const detailText = details.slice(0, keep).join('\n');
    const candidate = detailText ? `${headWithUrl}\n\n${detailText}` : headWithUrl;
    if (messageLength(candidate) <= LEGACY_VIBER_URI_BUDGET) {
      message = candidate;
      bodyTruncated = bodyTruncated || keep < details.length;
      break;
    }
  }

  return {
    href: `${VIBER_URI_PREFIX}${encodeURIComponent(message)}`,
    message,
    messageLength: messageLength(message),
    bodyTruncated,
    url,
  };
}

/**
 * Build the full, untruncated message for the copy-paste handoff. Viber's
 * composer accepts far more than the 200 UTF-16-unit URI ceiling, so the
 * copy path can carry every field with its paragraph spacing. The URL stays
 * the final line so pasting still triggers the Open Graph preview card.
 */
export function buildViberFullMessage(listing, options = {}) {
  const origin = options.origin || DEFAULT_PUBLIC_ORIGIN;
  const url = publicWatchUrl(listing?.slug, origin);
  const body = buildOwnerStyleBody(listing);
  return body ? `${body}\n\n${url}` : url;
}
