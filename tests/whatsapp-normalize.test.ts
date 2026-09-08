import { describe, expect, it } from "vitest";
import { isE164, normalizeWhatsApp } from "@/lib/watch-list/phone";
import { signupSchema } from "@/lib/watch-list/schemas";

describe("normalizeWhatsApp", () => {
  it("composes a local PH mobile number with the dial prefix", () => {
    expect(normalizeWhatsApp("912 345 6789", "+63")).toBe("+639123456789");
    expect(normalizeWhatsApp("9123456789", "+63")).toBe("+639123456789");
  });

  it("drops the trunk zero and every kind of punctuation", () => {
    expect(normalizeWhatsApp("0912 345 6789", "+63")).toBe("+639123456789");
    expect(normalizeWhatsApp("0912-345-6789", "+63")).toBe("+639123456789");
    expect(normalizeWhatsApp("(0912) 345.6789", "+63")).toBe("+639123456789");
  });

  it("keeps an international number the visitor typed themselves", () => {
    // The exact shape that failed in production from 2026-06-23 to 2026-09-07.
    expect(normalizeWhatsApp("+63 912 345 6789", "+63")).toBe("+639123456789");
    expect(normalizeWhatsApp("+1 (415) 555-0100", "+63")).toBe("+14155550100");
    expect(normalizeWhatsApp("0063 912 345 6789", "+63")).toBe("+639123456789");
  });

  it("does not double a dial code typed without the plus sign", () => {
    expect(normalizeWhatsApp("63 912 345 6789", "+63")).toBe("+639123456789");
    expect(normalizeWhatsApp("91 98765 43210", "+91")).toBe("+919876543210");
  });

  it("does not mistake a local number that starts with the dial code digits", () => {
    // Indian mobiles can begin with 91; under +91 that is still a local number.
    expect(normalizeWhatsApp("9123456789", "+91")).toBe("+919123456789");
  });

  it("returns undefined instead of an unreadable value", () => {
    expect(normalizeWhatsApp("", "+63")).toBeUndefined();
    expect(normalizeWhatsApp("   ", "+63")).toBeUndefined();
    expect(normalizeWhatsApp("call me", "+63")).toBeUndefined();
    expect(normalizeWhatsApp("123", "+63")).toBeUndefined();
    expect(normalizeWhatsApp("+0 912 345 6789", "+63")).toBeUndefined();
    expect(normalizeWhatsApp("+63912345678901234", "+63")).toBeUndefined();
    expect(normalizeWhatsApp(null, "+63")).toBeUndefined();
    expect(normalizeWhatsApp(undefined, "+63")).toBeUndefined();
  });

  it("refuses to guess a country when no prefix is known", () => {
    expect(normalizeWhatsApp("912 345 6789")).toBeUndefined();
    expect(normalizeWhatsApp("+63 912 345 6789")).toBe("+639123456789");
  });

  it("isE164 agrees with the database check constraint", () => {
    expect(isE164("+639123456789")).toBe(true);
    expect(isE164("+63 912")).toBe(false);
    expect(isE164("639123456789")).toBe(false);
    expect(isE164(undefined)).toBe(false);
  });
});

describe("signupSchema whatsApp", () => {
  const base = {
    email: "collector@example.com",
    consentAccepted: true as const,
    source: "test",
  };

  it("normalises a punctuated international number server-side", () => {
    const parsed = signupSchema.parse({ ...base, whatsApp: "+63 912-345-6789" });
    expect(parsed.whatsApp).toBe("+639123456789");
  });

  it("never rejects the signup because of the optional number", () => {
    const parsed = signupSchema.parse({ ...base, whatsApp: "not a number" });
    expect(parsed.email).toBe("collector@example.com");
    expect(parsed.whatsApp).toBeUndefined();
  });

  it("drops an over-long value instead of failing validation", () => {
    const parsed = signupSchema.parse({ ...base, whatsApp: `+63${"9".repeat(200)}` });
    expect(parsed.email).toBe("collector@example.com");
    expect(parsed.whatsApp).toBeUndefined();
  });

  it("leaves an absent number absent", () => {
    expect(signupSchema.parse(base).whatsApp).toBeUndefined();
    expect(signupSchema.parse({ ...base, whatsApp: "" }).whatsApp).toBeUndefined();
  });
});
