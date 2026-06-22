import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS.
 *
 * The `server-only` import makes this file a hard error if any client component
 * pulls it in transitively - the bundler refuses, the leak is impossible.
 *
 * Use this ONLY inside Server Actions for admin writes that legitimately need
 * to bypass RLS (audit logs, cron-style cleanup, image uploads to private
 * buckets). Never read user-controlled data with this client without explicit
 * authorization checks first.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "createSupabaseAdminClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
