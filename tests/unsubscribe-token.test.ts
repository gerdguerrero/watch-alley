import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/watch-list/unsubscribe";

beforeAll(() => {
  process.env.WATCH_LIST_UNSUBSCRIBE_SECRET = "test-secret-for-unit-tests";
});

describe("unsubscribe token", () => {
  it("round-trips and normalizes the email", () => {
    const token = createUnsubscribeToken("  Collector@Example.COM ");
    const verified = verifyUnsubscribeToken(token);
    expect(verified?.email).toBe("collector@example.com");
    expect(typeof verified?.createdAt).toBe("number");
  });

  it("rejects a tampered payload", () => {
    const token = createUnsubscribeToken("victim@example.com");
    const [, signature] = token.split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ email: "attacker@example.com", createdAt: Date.now() })
    ).toString("base64url");
    expect(verifyUnsubscribeToken(`${forgedBody}.${signature}`)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = createUnsubscribeToken("victim@example.com");
    const [body] = token.split(".");
    expect(verifyUnsubscribeToken(`${body}.${"A".repeat(43)}`)).toBeNull();
  });

  it("rejects malformed tokens without throwing", () => {
    for (const bad of ["", ".", "abc", "a.b.c", "!!!.###", `${"x".repeat(5000)}.y`]) {
      expect(verifyUnsubscribeToken(bad)).toBeNull();
    }
  });

  it("rejects payloads missing required fields", () => {
    // A validly-signed payload that lacks createdAt must still be rejected:
    // the signature proves origin, not shape.
    const body = Buffer.from(JSON.stringify({ email: "a@b.com" })).toString("base64url");
    const sig = createHmac("sha256", process.env.WATCH_LIST_UNSUBSCRIBE_SECRET as string)
      .update(body)
      .digest("base64url");
    expect(verifyUnsubscribeToken(`${body}.${sig}`)).toBeNull();
  });
});
