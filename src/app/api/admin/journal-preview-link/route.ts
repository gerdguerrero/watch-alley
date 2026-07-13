import { type NextRequest, NextResponse } from "next/server";
import { createJournalPreviewToken } from "@/lib/journal/preview";
import { assertAdmin } from "@/lib/newsletter/admin";

export const runtime = "nodejs";

/**
 * Mint a signed draft-preview URL for a journal post. Admin-only: the bridge
 * calls this with its Supabase access token; the HMAC signing itself happens
 * here because the browser must never hold the server secret.
 */
export async function GET(request: NextRequest) {
  try {
    await assertAdmin(request);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Not authorized." },
      { status: 401 }
    );
  }

  const id = (request.nextUrl.searchParams.get("id") || "").trim();
  // journal_posts ids are uuids; reject anything else before signing.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ ok: false, message: "Invalid post id." }, { status: 400 });
  }

  const { token, expiresAt } = createJournalPreviewToken(id);
  return NextResponse.json({
    ok: true,
    url: `/journal/preview/${id}?token=${encodeURIComponent(token)}`,
    expiresAt,
  });
}
