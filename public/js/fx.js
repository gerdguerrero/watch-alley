// PHP → USD price augmentation for The Watch Alley.
//
// Why this exists: client wants USD shown alongside PHP prices, sourced "like
// Wise" (mid-market) rather than Google's commercial rate. Wise itself has no
// public FX endpoint, so we use exchangerate.host — a free, no-key public API
// that publishes ECB-derived mid-market rates. Wise's published rate is
// mid-market + ~0.4% spread, so this estimate is within ~0.5% of what a
// buyer sees in the Wise app at payment time. The final amount is still
// calculated by Wise during checkout; the figure shown here is a quote.
//
// How it works:
//   • On first load each day, fetch USD per 1 PHP from exchangerate.host.
//   • Cache the rate in localStorage for 24h (key: WA_FX_PHP_USD_V1).
//   • After cards/details render, call WatchAlleyFx.enhance(root) and every
//     <span class="price-usd" data-price-php="<NUMBER>"></span> placeholder is
//     filled with "≈ $X,XXX".
//
// Idempotent: re-enhancing the same node updates the figure rather than
// stacking duplicates.

(function () {
  'use strict';

  var CACHE_KEY = 'WA_FX_PHP_USD_V1';
  var CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  // Primary: exchangerate.host (no key required, ECB mid-market).
  // We ask for USD as the base and read the PHP cross-rate, then invert.
  // open.er-api.com is kept as a fallback in case exchangerate.host rate-limits.
  var PRIMARY_URL = 'https://api.exchangerate.host/latest?base=USD&symbols=PHP';
  var FALLBACK_URL = 'https://open.er-api.com/v6/latest/USD';

  // Conservative offline default in case both APIs fail. Tuned to a recent
  // PHP/USD mid-market rate; never lower than reality so we don't accidentally
  // under-quote a buyer.
  var OFFLINE_DEFAULT_PHP_PER_USD = 58;

  var ratePromise = null;
  var lastRate = null;

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.rate !== 'number' || !isFinite(parsed.rate)) return null;
      if (Date.now() - Number(parsed.at || 0) > CACHE_TTL_MS) return null;
      return parsed.rate;
    } catch (_) {
      return null;
    }
  }

  function writeCache(rate) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rate: rate, at: Date.now() }));
    } catch (_) {
      // localStorage may be unavailable (private browsing / quota). Non-fatal.
    }
  }

  async function fetchPrimary() {
    var res = await fetch(PRIMARY_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('exchangerate.host ' + res.status);
    var data = await res.json();
    var phpPerUsd = data && data.rates && Number(data.rates.PHP);
    if (!isFinite(phpPerUsd) || phpPerUsd <= 0) throw new Error('exchangerate.host: no PHP rate');
    return phpPerUsd;
  }

  async function fetchFallback() {
    var res = await fetch(FALLBACK_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('open.er-api ' + res.status);
    var data = await res.json();
    var phpPerUsd = data && data.rates && Number(data.rates.PHP);
    if (!isFinite(phpPerUsd) || phpPerUsd <= 0) throw new Error('open.er-api: no PHP rate');
    return phpPerUsd;
  }

  function getRate() {
    if (ratePromise) return ratePromise;
    var cached = readCache();
    if (cached) {
      lastRate = cached;
      ratePromise = Promise.resolve(cached);
      return ratePromise;
    }
    ratePromise = (async function () {
      try {
        var rate = await fetchPrimary();
        writeCache(rate);
        lastRate = rate;
        return rate;
      } catch (primaryErr) {
        console.warn('FX: primary rate fetch failed, trying fallback', primaryErr);
        try {
          var fallbackRate = await fetchFallback();
          writeCache(fallbackRate);
          lastRate = fallbackRate;
          return fallbackRate;
        } catch (fallbackErr) {
          console.warn('FX: both sources failed, using offline default', fallbackErr);
          lastRate = OFFLINE_DEFAULT_PHP_PER_USD;
          return OFFLINE_DEFAULT_PHP_PER_USD;
        }
      }
    })();
    return ratePromise;
  }

  function formatUsdAmount(php, phpPerUsd) {
    if (!isFinite(php) || php <= 0 || !isFinite(phpPerUsd) || phpPerUsd <= 0) return '';
    var usd = php / phpPerUsd;
    // For amounts ≥ $100, drop cents; below that, show one decimal so small
    // accessories don't all read as "$0".
    var formatted;
    if (usd >= 100) {
      formatted = usd.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else {
      formatted = usd.toLocaleString('en-US', { maximumFractionDigits: 1 });
    }
    return '≈ $' + formatted + ' USD';
  }

  function applyToPlaceholders(root, phpPerUsd) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-price-php]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var php = Number(el.getAttribute('data-price-php'));
      el.textContent = formatUsdAmount(php, phpPerUsd);
    }
  }

  function enhance(root) {
    getRate().then(function (rate) {
      applyToPlaceholders(root, rate);
    });
  }

  // Auto-enhance whatever's already in the DOM when this script loads, then
  // expose enhance() for renderers that mount cards after page load.
  window.WatchAlleyFx = {
    enhance: enhance,
    getRate: getRate,
    formatUsd: function (php) {
      return lastRate ? formatUsdAmount(Number(php), lastRate) : '';
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { enhance(document); });
  } else {
    enhance(document);
  }

  // Auto-enhance dynamically-rendered cards (carousel, modal, lazy fetches).
  // Renderers don't need to call enhance() themselves — any new node with a
  // [data-price-php] placeholder is filled the moment it lands in the DOM.
  if (typeof MutationObserver === 'function') {
    var pending = false;
    var observer = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      // Coalesce bursts of additions into a single rate-bound run.
      Promise.resolve().then(function () {
        pending = false;
        if (lastRate) applyToPlaceholders(document, lastRate);
        else enhance(document);
      });
    });
    var attach = function () {
      observer.observe(document.body, { childList: true, subtree: true });
    };
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach);
  }
})();
