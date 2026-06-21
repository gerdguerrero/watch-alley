import "server-only";
import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import type { ZodError, z } from "zod";
import { sendWelcomeEmail } from "@/lib/newsletter/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { alertSchema, signupSchema, sourcingSchema, type WatchListSignupInput } from "./schemas";

type RpcName = "submit_watch_list_signup" | "submit_watch_list_alert" | "submit_sourcing_request";

type SubmissionKind = "signup" | "alert" | "sourcing";

const MIN_SUBMIT_MS = 1000;

function jsonError(message: string, status = 400, fields?: Record<string, string[]>) {
  return NextResponse.json({ ok: false, message, fields }, { status });
}

function flattenZodError(error: ZodError) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return request.headers.get("x-real-ip")?.trim();
}

function hashIp(ip: string | undefined) {
  if (!ip) return undefined;
  const salt =
    process.env.WATCH_LIST_IP_HASH_SALT ||
    process.env.REVALIDATION_TOKEN ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "watch-list";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function enrichPayload<T extends Record<string, unknown>>(request: NextRequest, payload: T) {
  const sourcePath = typeof payload.sourcePath === "string" ? payload.sourcePath : request.url;
  return {
    ...payload,
    sourcePath,
    userAgent: request.headers.get("user-agent") || undefined,
    ipHash: hashIp(clientIp(request)),
  };
}

function spamError(payload: { website?: string; formStartedAt?: number }) {
  if (payload.website) return "Please try again.";
  if (payload.formStartedAt && Date.now() - payload.formStartedAt < MIN_SUBMIT_MS) {
    return "Please try again.";
  }
  return null;
}

async function submitToRpc(rpcName: RpcName, payload: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc(rpcName, { payload });

  if (error) {
    console.error(`${rpcName} failed:`, error.message);
    throw new Error("We could not save this right now. Please try again in a moment.");
  }

  return data;
}

async function handleWatchListPost<Schema extends z.ZodTypeAny>({
  request,
  schema,
  rpcName,
  kind,
}: {
  request: NextRequest;
  schema: Schema;
  rpcName: RpcName;
  kind: SubmissionKind;
}) {
  const raw = await readJson(request);
  if (!raw || typeof raw !== "object") {
    return jsonError("Invalid request body.");
  }

  const spamMessage = spamError(raw as { website?: string; formStartedAt?: number });
  if (spamMessage) return jsonError(spamMessage);

  const parsed = schema.safeParse(enrichPayload(request, raw as Record<string, unknown>));
  if (!parsed.success) {
    return jsonError("Please check the highlighted fields.", 422, flattenZodError(parsed.error));
  }

  try {
    const result = (await submitToRpc(rpcName, parsed.data as Record<string, unknown>)) as
      | { subscriberId: string; duplicate: boolean }
      | undefined;

    // Dispatch welcome email only for new, non-duplicate signups
    if (kind === "signup" && result && !result.duplicate) {
      const signupData = parsed.data as WatchListSignupInput;
      if (signupData?.email) {
        try {
          await sendWelcomeEmail(signupData.email, signupData.firstName, signupData.country);
        } catch (welcomeError) {
          // Log the error but don't fail the signup request itself (fallback-safe)
          console.error("Welcome email dispatch failed:", welcomeError);
        }
      }
    }

    return NextResponse.json({ ok: true, kind, result });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to save this request.", 500);
  }
}

export function handleSignupPost(request: NextRequest) {
  return handleWatchListPost({
    request,
    schema: signupSchema,
    rpcName: "submit_watch_list_signup",
    kind: "signup",
  });
}

export function handleAlertPost(request: NextRequest) {
  return handleWatchListPost({
    request,
    schema: alertSchema,
    rpcName: "submit_watch_list_alert",
    kind: "alert",
  });
}

export function handleSourcingPost(request: NextRequest) {
  return handleWatchListPost({
    request,
    schema: sourcingSchema,
    rpcName: "submit_sourcing_request",
    kind: "sourcing",
  });
}
