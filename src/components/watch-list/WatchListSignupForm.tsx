"use client";

import { track } from "@vercel/analytics";
import { useMemo, useState } from "react";
import {
  BRAND_OPTIONS,
  CATEGORY_OPTIONS,
  WATCH_LIST_CONSENT_TEXT,
  WATCH_LIST_CONSENT_VERSION,
} from "@/lib/watch-list/constants";
import { COUNTRIES, countryCodeToFlag } from "@/lib/watch-list/countries";
import { CountrySelect } from "./CountrySelect";

interface WatchListSignupFormProps {
  source: string;
  compact?: boolean;
  showPreferences?: boolean;
  defaultExpandedPreferences?: boolean;
  className?: string;
  stacked?: boolean;
  onSuccess?: () => void;
}

type SubmitState = "idle" | "pending" | "success" | "error";

function utmFromLocation() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}

function getChecked(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// ── Reusable styled form primitives ─────────────────────────────────

const inputBase =
  "min-h-12 w-full rounded-xl border border-amber-300/15 bg-black/35 px-4 py-3 text-sm text-cream outline-none transition-all duration-200 placeholder:text-cream-60/50 hover:border-amber-300/25 focus:border-amber-300/60 focus:bg-black/50";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300/80 flex items-center gap-0.5";

function RequiredAsterisk() {
  return <span className="text-amber-300 ml-0.5">*</span>;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className={labelClass}>
      {children}
      {required && <RequiredAsterisk />}
    </span>
  );
}

// ── Component ───────────────────────────────────────────────────────

export function WatchListSignupForm({
  source,
  compact = false,
  showPreferences = false,
  defaultExpandedPreferences = false,
  className = "",
  stacked = false,
  onSuccess,
}: WatchListSignupFormProps) {
  const formStartedAt = useMemo(() => Date.now(), []);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [preferencesExpanded, setPreferencesExpanded] = useState(defaultExpandedPreferences);
  const [selectedCountryCode, setSelectedCountryCode] = useState("PH");

  // Derive phone prefix from selected country
  const selectedCountry = COUNTRIES.find((c) => c.code === selectedCountryCode);
  const phonePrefix = selectedCountry?.phoneCode || "+63";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setState("pending");
    setMessage("");

    const preferences = showPreferences
      ? {
          brands: getChecked(formData, "brands"),
          categories: getChecked(formData, "categories"),
          budgetMinPhp: getText(formData, "budgetMinPhp"),
          budgetMaxPhp: getText(formData, "budgetMaxPhp"),
          purchaseIntent: getText(formData, "purchaseIntent"),
          notes: getText(formData, "notes"),
        }
      : undefined;

    // Combine phone prefix + number for WhatsApp
    const rawPhone = getText(formData, "whatsapp") || "";
    const whatsApp = rawPhone ? `${phonePrefix}${rawPhone.replace(/^0+/, "")}` : undefined;

    const payload = {
      email: getText(formData, "email"),
      firstName: getText(formData, "firstName"),
      country: getText(formData, "country"),
      whatsApp,
      preferences,
      consentAccepted: formData.get("consentAccepted") === "on",
      consentText: WATCH_LIST_CONSENT_TEXT,
      consentVersion: WATCH_LIST_CONSENT_VERSION,
      source,
      sourcePath:
        typeof window === "undefined"
          ? undefined
          : `${window.location.pathname}${window.location.search}`,
      utm: utmFromLocation(),
      website: getText(formData, "website") || "",
      formStartedAt,
    };

    try {
      const response = await fetch("/api/watch-list/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string; result?: unknown };
      if (!response.ok || !body.ok) {
        throw new Error(body.message || "Please check the form and try again.");
      }
      track("Watch List Signup", { source, preferences: showPreferences });
      setState("success");
      setMessage("You're on The Watch List. We'll send the right pieces, not the loudest ones.");
      form.reset();
      onSuccess?.();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Please try again.");
    }
  }

  // ── Compact variant (footer) ──────────────────────────────────
  if (compact) {
    return (
      <form onSubmit={onSubmit} className={`flex flex-col gap-4 ${className}`}>
        <div className="hidden" aria-hidden="true">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <FieldLabel required>Email</FieldLabel>
              <input
                className={inputBase}
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="collector@email.com"
              />
            </label>
            <div className="flex flex-col gap-2">
              <FieldLabel required>Country</FieldLabel>
              <CountrySelect
                name="country"
                required
                onChange={setSelectedCountryCode}
                className={inputBase}
              />
            </div>
          </div>

          <label className="flex items-start gap-3 text-left text-cream-60 text-[11px] leading-5">
            <input
              type="checkbox"
              name="consentAccepted"
              required
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-300/30 bg-black accent-amber-300"
            />
            <span>{WATCH_LIST_CONSENT_TEXT}</span>
          </label>

          <button
            type="submit"
            disabled={state === "pending"}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-amber-300 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#090806] transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
          >
            {state === "pending" ? "Joining" : "Join"}
          </button>

          {message && (
            <p
              className={`text-sm leading-6 ${state === "error" ? "text-red-200" : "text-amber-100"}`}
              aria-live="polite"
            >
              {message}
            </p>
          )}
        </div>
      </form>
    );
  }

  // ── Full variant ───────────────────────────────────────────────
  return (
    <form onSubmit={onSubmit} className={`flex flex-col gap-5 ${className}`}>
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {/* Row 1: Name | Email | Country (stacked vertically to prevent compression) */}
      <div className="grid gap-4 grid-cols-1">
        <label className="flex flex-col gap-2">
          <FieldLabel required>Name</FieldLabel>
          <input
            className={inputBase}
            name="firstName"
            autoComplete="given-name"
            required
            placeholder="Your first name"
          />
        </label>
        <label className="flex flex-col gap-2">
          <FieldLabel required>Email</FieldLabel>
          <input
            className={inputBase}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="collector@email.com"
          />
        </label>
        <div className="flex flex-col gap-2">
          <FieldLabel required>Country</FieldLabel>
          <CountrySelect
            name="country"
            required
            onChange={setSelectedCountryCode}
            className={inputBase}
          />
        </div>
      </div>

      {/* Row 2: WhatsApp (optional) */}
      <label className="flex flex-col gap-2">
        <FieldLabel>WhatsApp number</FieldLabel>
        <p className="text-[11px] leading-5 text-cream-60/60">
          Optional. We&apos;ll only message you about pieces that match your taste.
        </p>
        <div className="flex items-stretch gap-0">
          {/* Country code badge */}
          <div className="flex items-center gap-1.5 shrink-0 rounded-l-xl border border-r-0 border-amber-300/15 bg-black/35 px-3.5 py-3">
            <span className="text-base leading-none">{countryCodeToFlag(selectedCountryCode)}</span>
            <span className="text-sm text-cream-60 font-mono">{phonePrefix}</span>
          </div>
          <input
            className={`${inputBase} rounded-l-none !border-l-0 flex-1`}
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="912 345 6789"
          />
        </div>
      </label>

      {/* Preferences (collapsible) */}
      {showPreferences && (
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => setPreferencesExpanded(!preferencesExpanded)}
            className="w-fit text-left font-mono text-[10px] uppercase tracking-[0.22em] text-amber-200 hover:text-amber-300 transition-colors flex items-center gap-1.5 py-1 focus:outline-none"
            aria-expanded={preferencesExpanded}
          >
            {preferencesExpanded ? (
              <>
                <svg
                  className="h-2.5 w-2.5 fill-current text-amber-300"
                  viewBox="0 0 10 10"
                  aria-hidden="true"
                >
                  <path d="M1 4h8v2H1z" />
                </svg>
                Hide preferences
              </>
            ) : (
              <>
                <svg
                  className="h-2.5 w-2.5 fill-current text-amber-300"
                  viewBox="0 0 10 10"
                  aria-hidden="true"
                >
                  <path d="M6 1H4v3H1v2h3v3h2V6h3V4H6V1z" />
                </svg>
                Add preferences (brands, budget, timing)
              </>
            )}
          </button>

          <div
            className={`grid gap-6 border-y border-amber-300/10 transition-all duration-300 ease-in-out ${
              preferencesExpanded
                ? "max-h-[1600px] py-5 mt-3 opacity-100"
                : "max-h-0 py-0 mt-0 opacity-0 overflow-hidden border-none"
            }`}
          >
            <fieldset className="space-y-3">
              <legend className={labelClass}>Brands</legend>
              <div className="flex flex-wrap gap-2">
                {BRAND_OPTIONS.map((brand) => (
                  <label
                    key={brand}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-amber-300/15 px-3.5 py-2 text-xs text-cream-60 transition-all duration-200 has-[:checked]:border-amber-300/70 has-[:checked]:bg-amber-300/10 has-[:checked]:text-amber-200 hover:border-amber-300/30"
                  >
                    <input type="checkbox" name="brands" value={brand} className="sr-only" />
                    {brand}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className={labelClass}>Condition</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((category) => (
                  <label
                    key={category.value}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-amber-300/15 px-3.5 py-2 text-xs text-cream-60 transition-all duration-200 has-[:checked]:border-amber-300/70 has-[:checked]:bg-amber-300/10 has-[:checked]:text-amber-200 hover:border-amber-300/30"
                  >
                    <input
                      type="checkbox"
                      name="categories"
                      value={category.value}
                      className="sr-only"
                    />
                    {category.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className={labelClass}>Budget from (PHP)</span>
                <input
                  className={inputBase}
                  name="budgetMinPhp"
                  inputMode="numeric"
                  placeholder="₱10,000"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClass}>Budget to (PHP)</span>
                <input
                  className={inputBase}
                  name="budgetMaxPhp"
                  inputMode="numeric"
                  placeholder="₱200,000"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className={labelClass}>Timing</span>
              <select className={inputBase} name="purchaseIntent" defaultValue="">
                <option value="">Open to anything</option>
                <option value="just-browsing">Just browsing</option>
                <option value="ready-now">Ready to buy now</option>
                <option value="next-30-days">Within 30 days</option>
                <option value="next-90-days">Within 90 days</option>
                <option value="specific-reference">Hunting a specific reference</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className={labelClass}>Collector note</span>
              <textarea
                className={`${inputBase} min-h-28 resize-y`}
                name="notes"
                placeholder="References you're hunting, case sizes, dial colors, or anything that helps us curate for you."
              />
            </label>
          </div>
        </div>
      )}

      {/* Consent */}
      <label className="flex items-start gap-3 text-left text-cream-60 text-[12px] leading-5 my-2 cursor-pointer select-none">
        <input
          type="checkbox"
          name="consentAccepted"
          required
          className="mt-1 h-4 w-4 shrink-0 rounded border-amber-300/30 bg-black accent-amber-300 cursor-pointer"
        />
        <span>{WATCH_LIST_CONSENT_TEXT}</span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={state === "pending"}
        className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-300 px-8 py-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#090806] transition-all duration-200 hover:opacity-85 hover:shadow-[0_4px_24px_rgba(189,154,50,0.25)] disabled:cursor-wait disabled:opacity-60 ${
          stacked ? "w-full" : "w-full sm:w-fit"
        }`}
      >
        {state === "pending" ? "Joining The Watch List..." : "Join The Watch List"}
      </button>

      {message && (
        <p
          className={`text-sm leading-6 ${state === "error" ? "text-red-200" : "text-amber-100"}`}
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </form>
  );
}
