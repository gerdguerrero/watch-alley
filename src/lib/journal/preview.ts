import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed draft-preview tokens for journal posts.
 *
 * The admin bridge can't compute an HMAC with a server secret, so it asks
 * /api/admin/journal-preview-link (admin-authenticated) for a signed URL:
 * /journal/preview/<id>?token=<body>.<sig>. The preview page verifies the
 * signature + expiry and only then reads the draft with the service-role
 * client. Same token shape and secret fallback chain as the watch-list
 * unsubscribe tokens ([lib/watch-list/unsubscribe.ts]).
 */

export const JOURNAL_PREVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface PreviewPayload {
  id: string;
  exp: number;
}

function secret(): string {
  const value =
    process.env.JOURNAL_PREVIEW_SECRET ||
    process.env.WATCH_LIST_UNSUBSCRIBE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("JOURNAL_PREVIEW_SECRET is not configured.");
  return value;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(`journal-preview:${body}`).digest("base64url");
}

export function createJournalPreviewToken(postId: string): { token: string; expiresAt: number } {
  const payload: PreviewPayload = { id: postId, exp: Date.now() + JOURNAL_PREVIEW_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return { token: `${body}.${sign(body)}`, expiresAt: payload.exp };
}

/** Returns true only if the token is well-formed, unexpired, and signed for this post id. */
export function verifyJournalPreviewToken(postId: string, token: string): boolean {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) return false;

  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as Partial<PreviewPayload>;
    return (
      typeof payload.id === "string" &&
      typeof payload.exp === "number" &&
      payload.id === postId &&
      payload.exp > Date.now()
    );
  } catch {
    return false;
  }
}
