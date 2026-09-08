/**
 * WhatsApp number normalisation for The Watch List forms.
 *
 * Pure, dependency-free, safe in Server and Client Components.
 *
 * Why this exists: between 2026-06-23 and 2026-09-07 the signup route rejected
 * every submission whose optional WhatsApp field contained a space, a dash or
 * a second "+" (for example "+63 912 345 6789"), because the form only stripped
 * leading zeros and the database RPC validates against strict E.164. The RPC
 * raised, the API answered with a generic 500, and the whole signup was lost
 * (54 failures from 25 people in one week per Vercel's error clusters).
 *
 * Rule: an optional contact field must never be able to reject a signup.
 * Anything that cannot be read becomes `undefined` and the signup proceeds.
 */

/** E.164: "+", a non-zero country digit, then 6 to 14 more digits (15 total max). */
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Normalise what a visitor typed into an E.164 number, or return `undefined`.
 *
 * - `raw` may contain spaces, dashes, dots, parentheses, a leading "+" or "00".
 * - `dialPrefix` is the selected country's dial code (e.g. "+63"). It is applied
 *   only when the visitor did not type an international prefix themselves.
 *   When it is empty (server side, where the country is not known), a number
 *   without its own international prefix is dropped rather than guessed.
 * - Trunk zeros are removed ("0912…" -> "912…"). A prefix the visitor typed
 *   without "+" ("63 912…" with dial code +63) is not doubled.
 */
export function normalizeWhatsApp(
  raw: string | null | undefined,
  dialPrefix = ""
): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const prefixDigits = digitsOnly(dialPrefix);
  let digits = digitsOnly(trimmed);
  if (!digits) return undefined;

  if (trimmed.startsWith("+")) {
    // Visitor supplied the country code; keep it as typed.
  } else if (trimmed.startsWith("00")) {
    // International call prefix form: "0063 912…" -> "63 912…".
    digits = digits.replace(/^00/, "");
  } else if (prefixDigits) {
    const local = digits.replace(/^0+/, "");
    // A visitor who typed their own dial code without "+" ("63 912 345 6789")
    // must not have it doubled, but a local number can legitimately begin with
    // the same digits (Indian mobiles start with 91 under dial code +91), so
    // only treat it as prefixed when it is too long to be a local number:
    // dial code plus at least nine subscriber digits.
    const alreadyPrefixed =
      local.startsWith(prefixDigits) && local.length >= prefixDigits.length + 9;
    digits = alreadyPrefixed ? local : `${prefixDigits}${local}`;
  } else {
    // No prefix known and none typed: refuse to guess a country.
    return undefined;
  }

  const candidate = `+${digits}`;
  return E164_PATTERN.test(candidate) ? candidate : undefined;
}

/** True when `value` is already a well-formed E.164 number. */
export function isE164(value: string | null | undefined): value is string {
  return typeof value === "string" && E164_PATTERN.test(value);
}
