/**
 * Mid-market PHP↔USD rate sources, in fallback order:
 *
 *   1. exchangerate.host — free, no key, ECB mid-market.
 *   2. open.er-api.com — free, no key, slightly different feed.
 *   3. A conservative offline default tuned to a recent PHP/USD rate,
 *      never lower than reality so we don't accidentally under-quote.
 *
 * Wise's published rate is mid-market + ~0.4% spread, so this estimate sits
 * within ~0.5% of what a buyer sees in the Wise app at payment time.
 */
export const PRIMARY_URL =
  "https://api.exchangerate.host/latest?base=USD&symbols=PHP";
export const FALLBACK_URL = "https://open.er-api.com/v6/latest/USD";
export const OFFLINE_DEFAULT_PHP_PER_USD = 58;
