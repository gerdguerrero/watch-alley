"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const UNSUBSCRIBE_REASONS = [
  { value: "too-many-emails", label: "Too many emails" },
  { value: "content-not-relevant", label: "Content not relevant to me" },
  { value: "never-signed-up", label: "I never signed up for this" },
  { value: "temporary", label: "Just taking a break" },
  { value: "privacy-concerns", label: "Privacy concerns" },
  { value: "other", label: "Something else" },
] as const;

// ── Status result view (post-unsubscribe) ──────────────────────────
function StatusView({ status }: { status: string }) {
  if (status === "success") {
    return (
      <>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
          The Watch List
        </p>
        <h1 className="mt-5 font-serif text-[clamp(42px,7vw,82px)] leading-[0.95]">
          You are unsubscribed.
        </h1>
        <p className="mt-6 text-[16px] leading-8 text-cream-60">
          You will no longer receive Watch List emails. If you change your mind, you can rejoin
          anytime. Your collector details will be restored.
        </p>
        <RejoinForm />
      </>
    );
  }

  if (status === "invalid") {
    return (
      <>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
          The Watch List
        </p>
        <h1 className="mt-5 font-serif text-[clamp(42px,7vw,82px)] leading-[0.95]">
          This link is not valid.
        </h1>
        <p className="mt-6 text-[16px] leading-8 text-cream-60">
          The unsubscribe link may be incomplete or expired. Reply to the email or contact The Watch
          Alley and we will handle it manually.
        </p>
        <Link
          href="/watch-list"
          className="mt-8 inline-flex rounded-xl bg-amber-300 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#090806]"
        >
          Open The Watch List
        </Link>
      </>
    );
  }

  // "error" or any other status
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
        The Watch List
      </p>
      <h1 className="mt-5 font-serif text-[clamp(42px,7vw,82px)] leading-[0.95]">
        We could not update that subscription.
      </h1>
      <p className="mt-6 text-[16px] leading-8 text-cream-60">
        Please try the link again, or contact The Watch Alley and we will sort it out manually.
      </p>
      <Link
        href="/watch-list"
        className="mt-8 inline-flex rounded-xl bg-amber-300 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#090806]"
      >
        Open The Watch List
      </Link>
    </>
  );
}

// ── Rejoin form (shown after successful unsubscribe) ─────────────────
function RejoinForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState("pending");
    setMessage("");

    try {
      const response = await fetch("/api/watch-list/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          consentAccepted: true,
          consentText:
            "I agree to receive curated watch drops, collector notes, and sourcing updates from The Watch Alley. I understand I can unsubscribe anytime.",
          consentVersion: "watch-list-consent-v1",
          source: "resubscribe-page",
        }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Please check the form and try again.");
      }
      setState("success");
      setMessage("You're back on The Watch List. Welcome back.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <div className="mt-8 border-t border-amber-300/15 pt-6">
      {state === "success" ? (
        <>
          <p className="text-amber-100 text-sm leading-6">{message}</p>
          <Link
            href="/watch-list"
            className="mt-4 inline-flex rounded-xl bg-amber-300 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#090806]"
          >
            Update your collector details
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm leading-6 text-cream-60">
            Enter your email to rejoin The Watch List.
          </p>
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/80">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="collector@email.com"
                className="min-h-12 w-full rounded-xl border border-amber-300/15 bg-black/35 px-4 py-3 text-sm text-cream outline-none transition-colors placeholder:text-cream-60/70 focus:border-amber-300/60 sm:w-64"
              />
            </label>
            <button
              type="submit"
              disabled={state === "pending"}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-300 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#090806] transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
            >
              {state === "pending" ? "Rejoining..." : "Rejoin"}
            </button>
          </form>
          {message && (
            <p className="mt-3 text-sm leading-6 text-red-200" aria-live="polite">
              {message}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Confirmation view (Are you sure?) ────────────────────────────────
function ConfirmationView({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  async function handleConfirm() {
    setState("pending");
    setMessage("");

    try {
      const response = await fetch("/api/watch-list/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason: reason || undefined }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Please try again.");
      }
      // Redirect to success page
      router.push("/watch-list/unsubscribe?status=success");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
        The Watch List
      </p>
      <h1 className="mt-5 font-serif text-[clamp(38px,6vw,68px)] leading-[0.95]">Are you sure?</h1>
      <p className="mt-6 text-[16px] leading-8 text-cream-60">
        You are about to unsubscribe from The Watch List. You will stop receiving curated watch
        drops, collector notes, and sourcing opportunities from Manila.
      </p>

      {/* Feedback form — optional */}
      <div className="mt-8 border-t border-amber-300/15 pt-6">
        <p className="text-sm leading-6 text-cream-60">
          Help us improve: why are you unsubscribing?{" "}
          <span className="text-cream-60/50">(optional)</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {UNSUBSCRIBE_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(reason === r.value ? "" : r.value)}
              className={`rounded-full border px-4 py-2 text-xs transition-colors ${
                reason === r.value
                  ? "border-amber-300/70 bg-amber-300/10 text-amber-200"
                  : "border-amber-300/15 text-cream-60 hover:border-amber-300/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={state === "pending"}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-700/80 px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
        >
          {state === "pending" ? "Unsubscribing..." : "Yes, unsubscribe me"}
        </button>
        <Link
          href="/watch-list"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-amber-300/30 px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200 transition-colors hover:bg-amber-300/10 sm:ml-3"
        >
          No, keep me subscribed
        </Link>
      </div>

      {message && (
        <p className="mt-4 text-sm leading-6 text-red-200" aria-live="polite">
          {message}
        </p>
      )}
    </>
  );
}

// ── Main content (reads search params) ───────────────────────────────
function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const token = searchParams.get("token");

  // If we have a status, show the post-unsubscribe result
  if (status) {
    return <StatusView status={status} />;
  }

  // If we have a token, show the confirmation step
  if (token) {
    return <ConfirmationView token={token} />;
  }

  // No token, no status — generic landing
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
        The Watch List
      </p>
      <h1 className="mt-5 font-serif text-[clamp(42px,7vw,82px)] leading-[0.95]">
        Manage The Watch List.
      </h1>
      <p className="mt-6 text-[16px] leading-8 text-cream-60">
        Use the link in a Watch List email to manage your subscription, or visit The Watch List to
        update your collector details.
      </p>
      <Link
        href="/watch-list"
        className="mt-8 inline-flex rounded-xl bg-amber-300 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#090806]"
      >
        Open The Watch List
      </Link>
    </>
  );
}

// ── Page shell ───────────────────────────────────────────────────────
export default function WatchListUnsubscribePage() {
  return (
    <main className="bg-[#080706] px-6 pb-24 pt-[clamp(110px,14vh,160px)] text-cream md:px-12 lg:px-20">
      <section className="mx-auto max-w-2xl border-t border-amber-300/20 pt-10">
        <Suspense
          fallback={
            <div className="animate-pulse space-y-6">
              <div className="h-4 w-32 rounded bg-amber-300/10" />
              <div className="h-16 w-full rounded bg-amber-300/10" />
              <div className="h-20 w-3/4 rounded bg-amber-300/10" />
            </div>
          }
        >
          <UnsubscribeContent />
        </Suspense>
      </section>
    </main>
  );
}
