import type { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";
import { jsonError, jsonOk, readJsonObject } from "@/lib/newsletter/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let admin: Awaited<ReturnType<typeof assertAdmin>>;
  try {
    admin = await assertAdmin(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Not authorized.", 401);
  }

  const body = (await readJsonObject(request)) ?? {};
  const section = typeof body.section === "string" ? body.section : "collector_note";
  const output = {
    section,
    copy: "Drafting is configured as a human-in-the-loop scaffold. Connect an approved AI provider before enabling generated copy.",
  };

  await admin.supabase.rpc("admin_log_ai_generation_run", {
    payload: {
      issueId: typeof body.issueId === "string" ? body.issueId : null,
      runType: "section",
      model: "not-configured",
      promptVersion: "watch-list-section-v1",
      inputPayload: body,
      outputPayload: output,
      status: "skipped",
      errorMessage: "AI provider is not configured.",
    },
  });

  return jsonOk({ section: output, configured: false });
}
