"use client";

import { track } from "@vercel/analytics";
import { useMemo, useState } from "react";
import {
  BRAND_OPTIONS,
  CATEGORY_OPTIONS,
  WATCH_LIST_CONSENT_TEXT,
  WATCH_LIST_CONSENT_VERSION,
} from "@/lib/watch-list/constants";
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

    const payload = {
      email: getText(formData, "email"),
      firstName: getText(formData, "firstName"),
      country: getText(formData, "country"),
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
      track("Watch List Signup", {
        source,
        preferences: showPreferences,
      });
      setState("success");
      setMessage("You're on The Watch List. We'll send the right pieces, not the loudest ones.");
      form.reset();
      onSuccess?.();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Please try again.");
    }
  }

  const inputClass =
    "min-h-12 w-full rounded-xl border border-amber-300/15 bg-black/35 px-4 py-3 text-sm text-cream outline-none transition-colors placeholder:text-cream-60/70 focus:border-amber-300/60";
  const compactInputClass =
    "min-h-12 w-full rounded-lg border border-amber-300/15 bg-black/35 px-4 py-3 text-sm text-cream outline-none transition-colors placeholder:text-cream-60/70 focus:border-amber-300/60";
  const labelClass = "font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/80";

  return (
    <form onSubmit={onSubmit} className={`flex flex-col gap-4 ${className}`}>
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {compact ? (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span id={`${source}-watch-list-email-label`} className={labelClass}>
                Email
              </span>
              <input
                aria-labelledby={`${source}-watch-list-email-label`}
                className={compactInputClass}
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="collector@email.com"
              />
            </label>
            <div className="flex flex-col gap-2">
              <span id={`${source}-watch-list-country-label`} className={labelClass}>
                Country
              </span>
              <CountrySelect
                id={`${source}-watch-list-country`}
                name="country"
                required
                className={compactInputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={state === "pending"}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-amber-300 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#090806] transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
          >
            {state === "pending" ? "Joining" : "Join"}
          </button>
        </div>
      ) : (
        <div className={`grid gap-3 ${stacked ? "grid-cols-1" : "md:grid-cols-3"}`}>
          <label className="flex flex-col gap-2">
            <span className={labelClass}>Name</span>
            <input className={inputClass} name="firstName" autoComplete="given-name" />
          </label>
          <label className="flex flex-col gap-2">
            <span className={labelClass}>Email</span>
            <input
              className={inputClass}
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="collector@email.com"
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className={labelClass}>Country</span>
            <CountrySelect
              id={`${source}-watch-list-country`}
              name="country"
              required
              className={inputClass}
            />
          </div>
        </div>
      )}

      {showPreferences && (
        <div className="flex flex-col gap-4">
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
            className={`grid gap-5 border-y border-amber-300/10 transition-all duration-300 ease-in-out ${
              preferencesExpanded
                ? "max-h-[1400px] py-5 opacity-100"
                : "max-h-0 py-0 opacity-0 overflow-hidden border-none"
            }`}
          >
            <fieldset className="space-y-3">
              <legend className={labelClass}>Brands</legend>
              <div className="flex flex-wrap gap-2">
                {BRAND_OPTIONS.map((brand) => (
                  <label
                    key={brand}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-amber-300/15 px-3 py-2 text-xs text-cream-60 transition-colors has-[:checked]:border-amber-300/70 has-[:checked]:text-amber-200"
                  >
                    <input type="checkbox" name="brands" value={brand} className="sr-only" />
                    {brand}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className={labelClass}>Preference</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((category) => (
                  <label
                    key={category.value}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-amber-300/15 px-3 py-2 text-xs text-cream-60 transition-colors has-[:checked]:border-amber-300/70 has-[:checked]:text-amber-200"
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

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className={labelClass}>From PHP</span>
                <input className={inputClass} name="budgetMinPhp" inputMode="numeric" />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClass}>To PHP</span>
                <input className={inputClass} name="budgetMaxPhp" inputMode="numeric" />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className={labelClass}>Timing</span>
              <select className={inputClass} name="purchaseIntent" defaultValue="">
                <option value="">Open</option>
                <option value="just-browsing">Just browsing</option>
                <option value="ready-now">Ready now</option>
                <option value="next-30-days">Next 30 days</option>
                <option value="next-90-days">Next 90 days</option>
                <option value="specific-reference">Specific reference</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className={labelClass}>Collector note</span>
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                name="notes"
                placeholder="References, case sizes, dial colors, or anything you want us to remember."
              />
            </label>
          </div>
        </div>
      )}

      <label
        className={`flex items-start gap-3 text-left text-cream-60 ${
          compact ? "text-[11px] leading-5" : "text-[12px] leading-5"
        }`}
      >
        <input
          type="checkbox"
          name="consentAccepted"
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-300/30 bg-black accent-amber-300"
        />
        <span>{WATCH_LIST_CONSENT_TEXT}</span>
      </label>

      {!compact && (
        <button
          type="submit"
          disabled={state === "pending"}
          className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-300 px-6 py-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#090806] transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60 ${
            stacked ? "" : "sm:w-fit"
          }`}
        >
          {state === "pending" ? "Joining The Watch List" : "Join The Watch List"}
        </button>
      )}

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
