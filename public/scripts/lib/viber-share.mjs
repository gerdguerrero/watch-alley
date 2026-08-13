export const DEFAULT_VIBER_MESSAGE_BUDGET = 200;

const DEFAULT_PUBLIC_ORIGIN = 'https://thewatchalley.com';
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
  const clean = wellFormed(value)
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(clean).slice(0, maxLength).join('').trim();
}

function listingTitle(listing) {
  const name = cleanInline(listing?.name, 180);
  if (name) return name;

  const brand = cleanInline(listing?.brand, 80);
  const model = cleanInline(listing?.model, 140);
  if (brand && model.toLowerCase().includes(brand.toLowerCase())) return model;
  return [brand, model].filter(Boolean).join(' ') || 'The Watch Alley timepiece';
}

function statusCallToAction(status) {
  if (status === 'reserved') {
    return 'Reserved. Reply to check availability or ask about similar pieces.';
  }
  if (status === 'sold') {
    return 'Sold. Reply to ask about similar references.';
  }
  return 'Available now. Reply to inquire or reserve.';
}

function formatPhp(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price on request';
  return `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

function publicWatchUrl(slug, origin) {
  const cleanSlug = wellFormed(slug).trim();
  if (!cleanSlug) throw new Error('A saved public listing slug is required');
  const cleanOrigin = String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, '');
  return `${cleanOrigin}/watch/${encodeURIComponent(cleanSlug)}`;
}

function messageLength(value) {
  // Use UTF-16 code units (JavaScript's native string length) rather than
  // code points. Viber does not define its “character” unit, and this is the
  // conservative interpretation for astral emoji and other surrogate pairs.
  return value.length;
}

function composeMessage({ title, url, offer, callToAction }) {
  const lines = [title, `View: ${url}`];
  if (offer) lines.push('', offer);
  lines.push(callToAction);
  return lines.join('\n');
}

function wordBoundaryExcerpt(value, maxCharacters, suffix = '...') {
  if (messageLength(value) <= maxCharacters) return value;
  const contentBudget = Math.max(0, maxCharacters - messageLength(suffix));
  let raw = '';
  for (const character of Array.from(value)) {
    if (messageLength(raw) + messageLength(character) > contentBudget) break;
    raw += character;
  }
  raw = raw.trim();
  const boundary = raw.replace(/\s+\S*$/, '').trim().replace(/[.,;:!?-]+$/, '');
  return `${boundary || raw}${suffix}`;
}

/**
 * Build a Viber share-picker URI from a saved public listing.
 *
 * Viber's legacy first-party Share Button guidance documented trimming beyond
 * 200 characters. The original URL now serves a generic developer landing
 * page, so the conservative cap remains a compatibility guard and should be
 * device-tested. Full details belong on the canonical product page.
 */
export function buildViberSharePayload(listing, options = {}) {
  const messageBudget = Number(options.messageBudget) || DEFAULT_VIBER_MESSAGE_BUDGET;
  const origin = options.origin || DEFAULT_PUBLIC_ORIGIN;
  const url = publicWatchUrl(listing?.slug, origin);
  const fullTitle = listingTitle(listing);
  const condition = cleanInline(listing?.conditionLabel, 70) || 'Condition on request';
  const price = formatPhp(listing?.price);
  const callToAction = statusCallToAction(cleanInline(listing?.status, 40).toLowerCase());
  let offer = `${price} · ${condition}`;
  let title = fullTitle;
  let message = composeMessage({ title, url, offer, callToAction });

  if (messageLength(message) > messageBudget) {
    offer = price;
    message = composeMessage({ title, url, offer, callToAction });
  }

  if (messageLength(message) > messageBudget) {
    const fixedLength = messageLength(composeMessage({ title: '', url, offer, callToAction }));
    title = wordBoundaryExcerpt(fullTitle, Math.max(8, messageBudget - fixedLength));
    message = composeMessage({ title, url, offer, callToAction });
  }

  if (messageLength(message) > messageBudget) {
    offer = '';
    const fixedLength = messageLength(composeMessage({ title: '', url, offer, callToAction }));
    title = wordBoundaryExcerpt(fullTitle, Math.max(8, messageBudget - fixedLength));
    message = composeMessage({ title, url, offer, callToAction });
  }

  if (messageLength(message) > messageBudget) {
    throw new Error('This listing URL is too long to share through Viber safely');
  }

  return {
    href: `${VIBER_URI_PREFIX}${encodeURIComponent(message)}`,
    message,
    messageLength: messageLength(message),
    titleTruncated: title !== fullTitle,
    url,
  };
}
