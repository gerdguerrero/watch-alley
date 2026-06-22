import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components and Server Actions.
 *
 * Reads the user's session from request cookies and proxies any session
 * refresh back into the response. The anon key never leaves the server - the
 * browser sees only the rendered HTML.
 *
 * Use this in:
 *   - `async function Page()` Server Components
 *   - `"use server"` Server Actions
 *   - Route Handlers
 *
 * Do NOT import this from a Client Component - it'll fail at build time.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies. Server Actions and route
            // handlers can. This guarded catch is the recommended pattern.
          }
        },
      },
    }
  );
}
