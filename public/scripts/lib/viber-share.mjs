// Viber's legacy forward URI truncates decoded text at roughly 200 UTF-16
// units. Keep the complete canonical link near the top of the message and
// whole caption lines inside that ceiling; otherwise the app silently drops
// the link that makes the share useful.
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
    id: watch.id,
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

function publicShortUrl(listing, origin) {
  const cleanOrigin = String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, '');
  const id = cleanInline(listing?.id, 40);
  if (id) return `${cleanOrigin}/w/${encodeURIComponent(id)}`;
  return publicWatchUrl(listing?.slug, cleanOrigin);
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
 * Tidy the tail of a shortened caption. Dropping whole lines can leave the
 * excerpt ending on a blank line, or worse on a section label whose contents
 * were cut - a caption that stops at "Specifications:" reads like a bug. Drop
 * a trailing label only when something after it was actually removed.
 */
function trimDanglingTail(lines, droppedSomething) {
  const kept = [...lines];
  while (kept.length) {
    const last = kept[kept.length - 1].trim();
    const isBlank = last === '';
    const isDanglingLabel = droppedSomething && /:$/.test(last);
    if (!isBlank && !isDanglingLabel) break;
    kept.pop();
  }
  return kept;
}

/**
 * Build the viber://forward payload. Uses the short /w/<id> link so the
 * saved description (title, price, condition, and the start of the specs)
 * fits inside Viber's 200 UTF-16-unit URI ceiling. The link sits directly
 * under the title so it survives Viber's tail truncation. Whole lines are
 * kept - never mid-word ellipses - and trailing lines drop first when a
 * description is very long. The link is always intact.
 */
export function buildViberSharePayload(listing, options = {}) {
  const origin = options.origin || DEFAULT_PUBLIC_ORIGIN;
  const shortUrl = publicShortUrl(listing, origin);
  const canonicalUrl = publicWatchUrl(listing?.slug, origin);
  if (messageLength(shortUrl) > LEGACY_VIBER_URI_BUDGET) {
    throw new Error('This listing URL is too long to share through Viber safely');
  }

  const body = cleanSavedBody(listing?.description) || buildOwnerStyleBody(listing);
  const paragraphs = body.split('\n\n');
  const title = paragraphs[0] || '';
  const rest = paragraphs.slice(1).join('\n\n');
  const head = title ? `${title}\n${shortUrl}` : shortUrl;

  // If the title + link still overflow, fall back to the bare link.
  let base = head;
  let droppedTitle = false;
  if (messageLength(base) > LEGACY_VIBER_URI_BUDGET) {
    base = shortUrl;
    droppedTitle = true;
  }

  const restLines = rest.split('\n');
  let message = base;
  let droppedRest = 0;
  // keep === 0 is a real candidate: when not one detail line fits, the share
  // is the head alone and the operator still needs to be told copy was cut.
  for (let keep = restLines.length; keep >= 0; keep -= 1) {
    const kept = trimDanglingTail(restLines.slice(0, keep), keep < restLines.length);
    const excerpt = kept.join('\n').trim();
    const candidate = excerpt ? `${base}\n\n${excerpt}` : base;
    if (messageLength(candidate) <= LEGACY_VIBER_URI_BUDGET) {
      message = candidate;
      droppedRest = restLines.length - kept.length;
      break;
    }
  }

  return {
    href: `${VIBER_URI_PREFIX}${encodeURIComponent(message)}`,
    message,
    messageLength: messageLength(message),
    bodyTruncated: droppedTitle || droppedRest > 0,
    url: canonicalUrl,
  };
}

/**
 * Build the full, untruncated message for the copy-paste handoff. Viber's
 * composer accepts far more than the 200 UTF-16-unit URI ceiling, so the
 * copy path can carry the complete saved description with its paragraph
 * spacing. The canonical URL sits right after the title so pasting triggers
 * the Open Graph preview card.
 */
export function buildViberFullMessage(listing, options = {}) {
  const origin = options.origin || DEFAULT_PUBLIC_ORIGIN;
  const url = publicWatchUrl(listing?.slug, origin);
  const body = cleanSavedBody(listing?.description) || buildOwnerStyleBody(listing);
  const paragraphs = body.split('\n\n');
  const title = paragraphs[0] || '';
  const rest = paragraphs.slice(1).join('\n\n');
  const head = title ? `${title}\n${url}` : url;
  return rest ? `${head}\n\n${rest}` : head;
}
