/**
 * Mid-market PHP↔USD rate source:
 *
 *   1. Wise public API (api.wise.com/v1/rates) — official mid-market rate,
 *      no key required. This is what the buyer sees in the Wise app at
 *      payment time, just before Wise adds its ~0.4% transfer spread.
 *   2. exchangerate.host — free, no key, ECB mid-market. Fallback.
 *   3. A conservative offline default so the page never shows $0.
 */

export const WISE_URL =
  "https://api.wise.com/v1/rates?source=USD&target=PHP";
export const FALLBACK_URL = "https://api.exchangerate.host/latest?base=USD&symbols=PHP";
export const OFFLINE_DEFAULT_PHP_PER_USD = 58;
