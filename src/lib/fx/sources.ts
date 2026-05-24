/**
 * Mid-market PHP↔USD rate sources, in fallback order:
 *
 *   1. exchangerate.host — free, no key, ECB mid-market.
 *   2. open.er-api.com — free, no key, different feed.
 *   3. A conservative offline default tuned to a recent PHP/USD rate,
 *      never lower than reality so we don't under-quote.
 *
 * The rate is adjusted by WISE_SPREAD (0.4%) to match Wise's actual
 * payment conversion, so the USD figure the buyer sees is within ~0.5%
 * of what they'd pay in the Wise app.
 */

export const PRIMARY_URL = "https://api.exchangerate.host/latest?base=USD&symbols=PHP";
export const FALLBACK_URL = "https://open.er-api.com/v6/latest/USD";
export const OFFLINE_DEFAULT_PHP_PER_USD = 58;

/**
 * Wise exchange rate markup spread. Wise charges a small spread (avg 0.4%)
 * on international transfers, making the effective PHP-per-USD rate lower
 * than the mid-market rate. Applied so USD quotes match Wise's actual
 * payment conversion.
 */
export const WISE_SPREAD = 0.004; // 0.4%
