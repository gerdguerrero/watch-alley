"use client";

import { useEffect } from "react";
import { formatUsdFromPhp } from "@/lib/fx/format";
import { FALLBACK_URL, OFFLINE_DEFAULT_PHP_PER_USD } from "@/lib/fx/sources";

const CACHE_KEY = "WA_FX_PHP_USD_V3";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const APPLIED_ATTR = "data-fx-applied";
const FX_TIMEOUT_MS = 4000;

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
    /* localStorage unavailable - non-fatal */
  }
}

/**
 * Fetch rate from our own server-side Wise proxy.
 * Response: { phpPerUsd: 58.12345 }
 */
async function fetchWiseRate(): Promise<number> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FX_TIMEOUT_MS);
  const res = await fetch("/api/wise-rate", {
    cache: "no-store",
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeout));
  if (!res.ok) throw new Error(`Wise proxy: ${res.status}`);
  const data = (await res.json()) as { phpPerUsd?: number };
  const php = Number(data?.phpPerUsd);
  if (!Number.isFinite(php) || php <= 0) throw new Error("Wise proxy: no PHP rate");
  return php;
}

/**
 * Fallback: fetch from exchangerate.host directly.
 * Response: { rates: { PHP: 58.12345 } }
 */
async function fetchExchangeRateHost(): Promise<number> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FX_TIMEOUT_MS);
  const res = await fetch(FALLBACK_URL, {
    cache: "no-store",
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeout));
  if (!res.ok) throw new Error(`FX fallback: ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  const php = Number(data?.rates?.PHP);
  if (!Number.isFinite(php) || php <= 0) throw new Error("FX fallback: no PHP rate");
  return php;
}

async function getRate(): Promise<number> {
  const cached = readCache();
  if (cached) return cached;

  // 1. Wise (via our server proxy - token stays secret)
  try {
    const rate = await fetchWiseRate();
    writeCache(rate);
    return rate;
  } catch {
    // 2. exchangerate.host (direct - free, no key)
    try {
      const rate = await fetchExchangeRateHost();
      writeCache(rate);
      return rate;
    } catch {
      // 3. Offline default
      return OFFLINE_DEFAULT_PHP_PER_USD;
    }
  }
}

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
