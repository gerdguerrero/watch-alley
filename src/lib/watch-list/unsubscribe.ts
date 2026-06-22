import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface UnsubscribePayload {
  email: string;
  createdAt: number;
}

function secret() {
  const value =
    process.env.WATCH_LIST_UNSUBSCRIBE_SECRET ||
    process.env.NEWSLETTER_CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("WATCH_LIST_UNSUBSCRIBE_SECRET is not configured.");
  return value;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function createUnsubscribeToken(email: string) {
  const payload: UnsubscribePayload = {
    email: normalizeEmail(email),
    createdAt: Date.now(),
  };
  const body = encodeBase64Url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyUnsubscribeToken(token: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body)) as Partial<UnsubscribePayload>;
    if (typeof payload.email !== "string" || typeof payload.createdAt !== "number") return null;
    return { email: normalizeEmail(payload.email), createdAt: payload.createdAt };
  } catch {
    return null;
  }
}

export async function unsubscribeWatchListEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    throw new Error("Invalid email address.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("service_unsubscribe_watch_list_subscriber", {
    p_email: normalizedEmail,
  });

  if (error) throw new Error(error.message);
  return data as { email: string; found: boolean; subscriberId: string | null };
}
