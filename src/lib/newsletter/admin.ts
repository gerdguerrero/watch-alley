import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export function createAuthorizedSupabaseClient(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) {
    throw new Error("Missing admin authorization token.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase public URL/key are not configured.");
  }

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export async function assertAdmin(request: NextRequest) {
  const supabase = createAuthorizedSupabaseClient(request);
  const { data, error } = await supabase.rpc("admin_whoami");

  if (error) {
    throw new Error(error.message || "Unable to verify admin session.");
  }

  const result = data as { email?: string; is_admin?: boolean } | null;
  if (!result?.is_admin) {
    throw new Error("Not authorized.");
  }

  return { supabase, email: result.email ?? "" };
}
