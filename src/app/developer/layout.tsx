import { notFound } from "next/navigation";

/**
 * /developer/* hosts internal tooling (the social poster engine used by
 * scripts/export-social-poster.js against localhost). It must not be reachable
 * on the public production domain, so 404 on Vercel production while staying
 * available in local dev/build and preview deployments.
 */
export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }
  return children;
}
