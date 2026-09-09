import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_BROADCAST_RUN_LIMIT,
  DEFAULT_NUDGE_MAX_AGE_HOURS,
  DEFAULT_NUDGE_MIN_AGE_HOURS,
  DEFAULT_NUDGE_RUN_LIMIT,
  broadcastRunLimit,
  isRateLimitError,
  nudgeAgeWindowHours,
  nudgeRunLimit,
  readPositiveIntEnv,
} from "@/lib/newsletter/limits";

const TOUCHED = [
  "NEWSLETTER_MAX_EMAILS_PER_RUN",
  "NEWSLETTER_NUDGE_MAX_PER_RUN",
  "NEWSLETTER_NUDGE_MIN_AGE_HOURS",
  "NEWSLETTER_NUDGE_MAX_AGE_HOURS",
  "TEST_LIMIT",
];

afterEach(() => {
  for (const key of TOUCHED) delete process.env[key];
});

describe("readPositiveIntEnv", () => {
  it("reads a valid positive integer", () => {
    process.env.TEST_LIMIT = "250";
    expect(readPositiveIntEnv("TEST_LIMIT", 90)).toBe(250);
  });

  it("falls back rather than widening the budget on a malformed value", () => {
    // Every one of these used to be a plausible way to accidentally uncap a send.
    // "1e9x" and "50abc" are the dangerous ones: Number.parseInt reads them as
    // 1 and 50, so a typo would throttle sending instead of falling back.
    for (const bad of ["", "   ", "abc", "0", "-5", "1e9x", "50abc", "9.5", "NaN", "1_000"]) {
      process.env.TEST_LIMIT = bad;
      expect(readPositiveIntEnv("TEST_LIMIT", 90)).toBe(90);
    }
  });

  it("falls back when the variable is absent", () => {
    expect(readPositiveIntEnv("TEST_LIMIT", 90)).toBe(90);
  });

  it("tolerates surrounding whitespace", () => {
    process.env.TEST_LIMIT = "  40  ";
    expect(readPositiveIntEnv("TEST_LIMIT", 90)).toBe(40);
  });
});

describe("run limits", () => {
  it("defaults under the Resend free tier's 100 a day", () => {
    expect(broadcastRunLimit()).toBe(DEFAULT_BROADCAST_RUN_LIMIT);
    expect(DEFAULT_BROADCAST_RUN_LIMIT).toBeLessThan(100);
  });

  it("leaves the nudge a slice that cannot starve the broadcast", () => {
    expect(nudgeRunLimit()).toBe(DEFAULT_NUDGE_RUN_LIMIT);
    expect(DEFAULT_BROADCAST_RUN_LIMIT + DEFAULT_NUDGE_RUN_LIMIT).toBeLessThanOrEqual(110);
  });

  it("can be raised for a paid tier without a deploy", () => {
    process.env.NEWSLETTER_MAX_EMAILS_PER_RUN = "5000";
    process.env.NEWSLETTER_NUDGE_MAX_PER_RUN = "500";
    expect(broadcastRunLimit()).toBe(5000);
    expect(nudgeRunLimit()).toBe(500);
  });
});

describe("nudgeAgeWindowHours", () => {
  it("defaults wide enough to reach subscribers the old 24-48h window stranded", () => {
    const w = nudgeAgeWindowHours();
    expect(w.min).toBe(DEFAULT_NUDGE_MIN_AGE_HOURS);
    expect(w.max).toBe(DEFAULT_NUDGE_MAX_AGE_HOURS);
    // A subscriber from June 2026 is ~2000 hours old and must still be reachable.
    expect(w.max).toBeGreaterThan(2000);
  });

  it("never returns a crossed window, which would silently select nobody", () => {
    process.env.NEWSLETTER_NUDGE_MIN_AGE_HOURS = "72";
    process.env.NEWSLETTER_NUDGE_MAX_AGE_HOURS = "24";
    const w = nudgeAgeWindowHours();
    expect(w.min).toBe(72);
    expect(w.max).toBeGreaterThanOrEqual(w.min);
  });
});

describe("isRateLimitError", () => {
  it("recognises a 429 by status code, in either casing of the field", () => {
    expect(isRateLimitError({ statusCode: 429, message: "nope" })).toBe(true);
    expect(isRateLimitError({ status: 429, message: "nope" })).toBe(true);
  });

  it("recognises Resend's named rate-limit error", () => {
    expect(isRateLimitError({ name: "rate_limit_exceeded", message: "Too many requests" })).toBe(
      true
    );
  });

  it("recognises the wording of a quota refusal", () => {
    const messages = [
      "Rate limit exceeded",
      "You have hit your daily quota",
      "Too many requests, please retry",
      "You have exceeded your quota for today",
      "Daily limit reached",
      "sending limit reached",
    ];
    for (const message of messages) {
      expect(isRateLimitError({ message })).toBe(true);
      expect(isRateLimitError(message)).toBe(true);
    }
  });

  it("does not mistake a real delivery failure for a rate limit", () => {
    // These must stay false: treating a hard bounce as "not now" would retry
    // an address forever, and treating a rate limit as a hard failure is how a
    // subscriber silently misses an issue for good.
    const realFailures = [
      { statusCode: 422, message: "Invalid `to` field" },
      { statusCode: 403, message: "Domain is not verified" },
      { message: "Recipient address rejected: user unknown" },
      { message: "The from address is not authorised" },
    ];
    for (const failure of realFailures) {
      expect(isRateLimitError(failure)).toBe(false);
    }
  });

  it("handles the shapes that are not errors at all", () => {
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
    expect(isRateLimitError({})).toBe(false);
    expect(isRateLimitError({ message: 42 })).toBe(false);
    expect(isRateLimitError("")).toBe(false);
  });
});
