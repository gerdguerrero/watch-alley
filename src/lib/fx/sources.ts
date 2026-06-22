/**
 * PHP↔USD exchange rate sources, in fallback order:
 *
 *   1. Wise API (via /api/wise-rate server proxy) - official mid-market rate.
 *      Token lives in WISE_API_TOKEN env var, never exposed to the browser.
 *   2. exchangerate.host - free, no key, ECB mid-market. Direct from client.
 *   3. Offline default (58) so the page never shows $0.
 *
 * All fetched rates are mid-market. WISE_SPREAD (0.4%) is applied in
 * format.ts so the USD figure matches what the buyer actually pays.
 */

export const FALLBACK_URL = "https://api.exchangerate.host/latest?base=USD&symbols=PHP";
export const OFFLINE_DEFAULT_PHP_PER_USD = 58;

export const WISE_SPREAD = 0.004; // 0.4%
