import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-free Supabase client for public storefront reads.
 *
 * Use this for data that must be available during `next build`,
 * `generateStaticParams`, metadata generation, and ISR. It intentionally does
 * not touch `cookies()`, so public routes can prerender without an HTTP
 * request. RLS still gates every read through the anon key.
 */
export function createSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "createSupabasePublicClient: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"
    );
  }

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
