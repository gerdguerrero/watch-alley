"use client";

import { useEffect } from "react";
import {
  PRIMARY_URL,
  FALLBACK_URL,
  OFFLINE_DEFAULT_PHP_PER_USD,
} from "@/lib/fx/sources";
import { formatUsdFromPhp } from "@/lib/fx/format";

const CACHE_KEY = "WA_FX_PHP_USD_V2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const APPLIED_ATTR = "data-fx-applied";

function readCache(): number | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rate?: number; at?: number };
    if (!parsed || typeof parsed.rate !== "number" || !Number.isFinite(parsed.rate)) {
      return null;
    }
    if (Date.now() - Number(parsed.at ?? 0) > CACHE_TTL_MS) return null;
    return parsed.rate;
  } catch {
    return null;
  }
}

function writeCache(rate: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, at: Date.now() }));
  } catch {
    /* localStorage unavailable (private browsing / quota) — non-fatal */
  }
}

async function fetchRate(url: string): Promise<number> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`FX ${url}: ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  const php = Number(data?.rates?.PHP);
  if (!Number.isFinite(php) || php <= 0) throw new Error(`FX ${url}: no PHP rate`);
  return php;
}

async function getRate(): Promise<number> {
  const cached = readCache();
  if (cached) return cached;
  try {
    const rate = await fetchRate(PRIMARY_URL);
    writeCache(rate);
    return rate;
  } catch (primaryErr) {
    console.warn("FX primary failed, trying fallback", primaryErr);
    try {
      const rate = await fetchRate(FALLBACK_URL);
      writeCache(rate);
      return rate;
    } catch (fallbackErr) {
      console.warn("FX fallback failed, using offline default", fallbackErr);
      return OFFLINE_DEFAULT_PHP_PER_USD;
    }
  }
}

/**
 * Walks every `<span data-price-php>` placeholder and fills it with `≈ $X USD`.
 *
 * Idempotent: nodes already filled (`data-fx-applied="1"`) are skipped. No
 * MutationObserver — explicit re-run on hydrate is enough for our render
 * surface, and avoids the feedback loop that took down the Vite site once.
 */
function applyToPlaceholders(rate: number) {
  const nodes = document.querySelectorAll<HTMLElement>("[data-price-php]");
  for (const el of nodes) {
    if (el.getAttribute(APPLIED_ATTR) === "1") continue;
    const php = Number(el.getAttribute("data-price-php"));
    const formatted = formatUsdFromPhp(php, rate);
    if (formatted) {
      el.textContent = formatted;
      el.setAttribute(APPLIED_ATTR, "1");
    }
  }
}

/**
 * Drop a single `<UsdPriceMount />` anywhere in a page's tree to enable USD
 * augmentation on every `<span data-price-php="...">` placeholder in the DOM.
 *
 * The component itself renders nothing. It hydrates once per route.
 */
export function UsdPriceMount() {
  useEffect(() => {
    let cancelled = false;
    void getRate().then((rate) => {
      if (!cancelled) applyToPlaceholders(rate);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
