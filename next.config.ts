import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  // The Vite site at the repo root has its own pnpm-lock.yaml during the
  // migration window; pin Turbopack's workspace root here so it doesn't try
  // to infer (and warn about) a multi-root setup. Remove after phase 8 cutover.
  turbopack: {
    root: import.meta.dirname,
  },
  // Disable fetch-level caching so Supabase queries (which use fetch
  // internally) always return fresh data. Without this, deletes/edits in
  // the admin panel take ~5 minutes to appear on the storefront because
  // Next.js caches the PostgREST fetch responses.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
  images: {
    // Allow next/image to optimize watch photos served from Supabase Storage.
    // Hostname is derived from the env var so it stays correct if we move
    // projects; the `*.supabase.co` wildcard covers any Supabase-hosted bucket
    // we might add later (private buckets via signed URLs still work).
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async rewrites() {
    return [
      { source: "/admin", destination: "/admin/index.html" },
      { source: "/admin/", destination: "/admin/index.html" },
      { source: "/admin/:path*", destination: "/admin/:path*" },
      { source: "/privacy", destination: "/privacy.html" },
      { source: "/terms", destination: "/terms.html" },
      { source: "/authenticity", destination: "/authenticity.html" },
    ];
  },
};

export default nextConfig;
