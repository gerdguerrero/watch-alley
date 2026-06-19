"use client";

import { track } from "@vercel/analytics";
import { useMemo, useState } from "react";
import { WATCH_LIST_CONSENT_TEXT, WATCH_LIST_CONSENT_VERSION } from "@/lib/watch-list/constants";

interface WatchAlertFormProps {
  watchId: string;
  watchSlug: string;
  watchTitle: string;
  brand: string;
  reference?: string;
  source?: string;
}

type SubmitState = "idle" | "pending" | "success" | "error";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function WatchAlertForm({
  watchId,
  watchSlug,
  watchTitle,
  brand,
  reference,
  source = "sold-watch-alert",
}: WatchAlertFormProps) {
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
      const response = await fetch("/api/watch-list/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: getText(formData, "email"),
          firstName: getText(formData, "firstName"),
          watchId,
          watchSlug,
          watchTitle,
          brand,
          reference,
          alertType: "similar-watch",
          notes: getText(formData, "notes"),
          consentAccepted: formData.get("consentAccepted") === "on",
          consentText: WATCH_LIST_CONSENT_TEXT,
          consentVersion: WATCH_LIST_CONSENT_VERSION,
          source,
          sourcePath:
            typeof window === "undefined"
              ? undefined
              : `${window.location.pathname}${window.location.search}`,
          website: getText(formData, "website") || "",
          formStartedAt,
          metadata: { watchStatus: "sold" },
        }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) throw new Error(body.message || "Please try again.");

      track("Watch Alert Signup", { source, brand, watchSlug });
      setState("success");
      setMessage("Noted. We'll watch for similar pieces and reach out when one makes sense.");
      form.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4"
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
          This piece is sold. Want one like this?
        </p>
        <p className="mt-2 text-[12px] leading-5 text-amber-50/75">
          Join the alert list for this reference, nearby alternatives, or the next strong example.
        </p>
      </div>

      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-2">
        <input
          name="firstName"
          autoComplete="given-name"
          className="min-h-11 rounded-lg border border-amber-300/15 bg-black/35 px-3 text-sm text-cream outline-none placeholder:text-cream-60/70 focus:border-amber-300/60"
          placeholder="Name"
        />
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="min-h-11 rounded-lg border border-amber-300/15 bg-black/35 px-3 text-sm text-cream outline-none placeholder:text-cream-60/70 focus:border-amber-300/60"
          placeholder="Email"
        />
        <textarea
          name="notes"
          className="min-h-20 rounded-lg border border-amber-300/15 bg-black/35 px-3 py-3 text-sm text-cream outline-none placeholder:text-cream-60/70 focus:border-amber-300/60"
          placeholder="Size, dial, budget, or condition preferences"
        />
      </div>

      <label className="flex items-start gap-2 text-[11px] leading-5 text-amber-50/65">
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
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-300 px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#090806] transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
      >
        {state === "pending" ? "Saving Alert" : "Notify Me of Similar Watches"}
      </button>

      {message && (
        <p
          className={`text-[12px] leading-5 ${state === "error" ? "text-red-200" : "text-amber-100"}`}
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </form>
  );
}
