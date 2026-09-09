/**
 * Send budgeting for The Watch List.
 *
 * Resend's free tier allows 100 emails a day. The active list passed 540 in
 * September 2026, so one issue is roughly six days of sending, not one run.
 * Before this existed, `sendNewsletterBroadcast` handed the provider every
 * active subscriber at once: the emails past the daily allowance came back
 * refused, every address in the refused batch was written off as `failed`,
 * the issue was set to `failed`, and `service_list_due_newsletter_issues`
 * only ever returns `scheduled` issues — so a capped send stranded itself
 * permanently and silently.
 *
 * The fix is a per-run budget plus honest handling of a provider refusal.
 * Because the cron runs once a day, a per-run cap is a per-day cap, and no
 * running total has to be kept anywhere.
 *
 * Every value here is an environment override, so moving to a paid tier is a
 * variable change rather than a deploy.
 */

/**
 * Emails one broadcast run may send. Deliberately under the free tier's 100
 * so the daily allowance is never the thing that stops a send: the budget is,
 * and a budget stop is clean and resumable where a provider refusal is not.
 */
export const DEFAULT_BROADCAST_RUN_LIMIT = 90;

/**
 * Emails one profile-nudge run may send. A small slice held back from the same
 * daily allowance, so a backlog of nudges can never starve the newsletter
 * itself. The two crons run two hours apart on the same day's quota.
 */
export const DEFAULT_NUDGE_RUN_LIMIT = 20;

/** Oldest signup the nudge will chase, in hours. Five years: effectively "any". */
export const DEFAULT_NUDGE_MAX_AGE_HOURS = 24 * 365 * 5;

/** Youngest signup the nudge will chase. A day's grace before asking for more. */
export const DEFAULT_NUDGE_MIN_AGE_HOURS = 24;

/**
 * Read a positive integer from the environment, falling back when it is unset,
 * empty, not a number, or zero or below. A malformed limit must never widen
 * the budget by accident.
 */
export function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  // The whole string must be digits. `Number.parseInt` is lenient enough to
  // read "1e9x" as 1 and "50abc" as 50, so a typo in an environment variable
  // would quietly throttle every send to a handful of emails a day rather
  // than fall back to the documented default.
  if (!/^\d+$/.test(trimmed)) return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

/** Emails a single broadcast run may send. */
export function broadcastRunLimit(): number {
  return readPositiveIntEnv("NEWSLETTER_MAX_EMAILS_PER_RUN", DEFAULT_BROADCAST_RUN_LIMIT);
}

/** Emails a single profile-nudge run may send. */
export function nudgeRunLimit(): number {
  return readPositiveIntEnv("NEWSLETTER_NUDGE_MAX_PER_RUN", DEFAULT_NUDGE_RUN_LIMIT);
}

/** Age window, in hours, for subscribers the profile nudge should chase. */
export function nudgeAgeWindowHours(): { min: number; max: number } {
  const min = readPositiveIntEnv("NEWSLETTER_NUDGE_MIN_AGE_HOURS", DEFAULT_NUDGE_MIN_AGE_HOURS);
  const max = readPositiveIntEnv("NEWSLETTER_NUDGE_MAX_AGE_HOURS", DEFAULT_NUDGE_MAX_AGE_HOURS);
  // A window with the ends crossed would silently select nobody.
  return max >= min ? { min, max } : { min, max: min };
}

const RATE_LIMIT_PATTERNS = [
  "rate limit",
  "rate_limit",
  "ratelimit",
  "too many requests",
  "daily quota",
  "quota exceeded",
  "exceeded your quota",
  "sending limit",
  "daily limit",
];

/**
 * True when a provider error means "not now" rather than "not ever".
 *
 * This distinction decides whether recipients are written off. A refusal for
 * rate or quota reasons means the provider never accepted the address, so it
 * must stay pending; marking it `failed` would be a lie, and because the
 * duplicate guard only matches `sent`, a lie there is how a subscriber
 * silently misses an issue for good.
 *
 * Accepts anything error-shaped: Resend returns a plain object with `name` and
 * `message`, HTTP layers add `statusCode` or `status`.
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object") {
    const candidate = error as { statusCode?: unknown; status?: unknown; name?: unknown };
    if (candidate.statusCode === 429 || candidate.status === 429) return true;
    if (typeof candidate.name === "string" && candidate.name.toLowerCase().includes("rate_limit")) {
      return true;
    }
  }

  const message =
    typeof error === "string"
      ? error
      : typeof (error as { message?: unknown }).message === "string"
        ? ((error as { message: string }).message as string)
        : "";

  const haystack = message.toLowerCase();
  return RATE_LIMIT_PATTERNS.some((pattern) => haystack.includes(pattern));
}
