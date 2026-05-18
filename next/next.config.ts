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
    ],
  },
};

export default nextConfig;
