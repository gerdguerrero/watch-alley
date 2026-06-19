"use client";

import { track } from "@vercel/analytics";
import { useMemo, useState } from "react";
import {
  BRAND_OPTIONS,
  WATCH_LIST_CONSENT_TEXT,
  WATCH_LIST_CONSENT_VERSION,
} from "@/lib/watch-list/constants";

interface SourcingRequestFormProps {
  source?: string;
}

type SubmitState = "idle" | "pending" | "success" | "error";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getChecked(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);
}

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

export function SourcingRequestForm({ source = "watch-list-sourcing" }: SourcingRequestFormProps) {
  const formStartedAt = useMemo(() => Date.now(), []);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setState("pending");
    setMessage("");

    try {
      const response = await fetch("/api/watch-list/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: getText(formData, "name"),
          email: getText(formData, "email"),
          firstName: getText(formData, "name"),
          phone: getText(formData, "phone"),
          preferredContact: getText(formData, "preferredContact"),
          brands: getChecked(formData, "brands"),
          reference: getText(formData, "reference"),
          budgetMinPhp: getText(formData, "budgetMinPhp"),
          budgetMaxPhp: getText(formData, "budgetMaxPhp"),
          timeline: getText(formData, "timeline"),
          conditionPreference: getText(formData, "conditionPreference"),
          wristSize: getText(formData, "wristSize"),
          notes: getText(formData, "notes"),
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
        }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) throw new Error(body.message || "Please try again.");

      track("Sourcing Request", { source });
      setState("success");
      setMessage("Request received. We'll review the brief and reply with the next sensible step.");
      form.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Please try again.");
    }
  }

  const inputClass =
    "min-h-12 w-full rounded-xl border border-amber-300/15 bg-black/35 px-4 py-3 text-sm text-cream outline-none transition-colors placeholder:text-cream-60/70 focus:border-amber-300/60";
  const labelClass = "font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/80";

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Name</span>
          <input className={inputClass} name="name" autoComplete="name" required />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Email</span>
          <input className={inputClass} name="email" type="email" autoComplete="email" required />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Phone</span>
          <input className={inputClass} name="phone" autoComplete="tel" />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Contact</span>
          <select className={inputClass} name="preferredContact" defaultValue="email">
            <option value="email">Email</option>
            <option value="messenger">Messenger</option>
            <option value="viber">Viber</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </label>
      </div>

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

      <label className="flex flex-col gap-2">
        <span className={labelClass}>Reference</span>
        <input
          className={inputClass}
          name="reference"
          placeholder="Reference, model, dial, size, or a sold piece you liked"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>From PHP</span>
          <input className={inputClass} name="budgetMinPhp" inputMode="numeric" />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>To PHP</span>
          <input className={inputClass} name="budgetMaxPhp" inputMode="numeric" />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Timeline</span>
          <select className={inputClass} name="timeline" defaultValue="">
            <option value="">Open</option>
            <option value="now">Ready now</option>
            <option value="30-days">30 days</option>
            <option value="90-days">90 days</option>
            <option value="patient">Patient for the right piece</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Condition</span>
          <select className={inputClass} name="conditionPreference" defaultValue="">
            <option value="">Open</option>
            <option value="brand-new">Brand new</option>
            <option value="pre-owned">Pre-owned</option>
            <option value="either">Either</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>Wrist size</span>
        <input className={inputClass} name="wristSize" placeholder="Optional" />
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>Brief</span>
        <textarea
          className={`${inputClass} min-h-32 resize-y`}
          name="notes"
          required
          placeholder="Tell us what would make this the right watch."
        />
      </label>

      <label className="flex items-start gap-3 text-[12px] leading-5 text-cream-60">
        <input
          type="checkbox"
          name="consentAccepted"
          required
          className="mt-1 h-4 w-4 shrink-0 rounded border-amber-300/30 bg-black accent-amber-300"
        />
        <span>{WATCH_LIST_CONSENT_TEXT}</span>
      </label>

      <button
        type="submit"
        disabled={state === "pending"}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-300 px-6 py-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#090806] transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60 sm:w-fit"
      >
        {state === "pending" ? "Sending Request" : "Start a Sourcing Request"}
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
