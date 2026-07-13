import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JournalArticle } from "@/components/site/journal-article";
import { verifyJournalPreviewToken } from "@/lib/journal/preview";
import { fetchJournalPostForPreview } from "@/lib/journal/queries";

/**
 * Signed draft preview: /journal/preview/<id>?token=<hmac>.
 *
 * The admin requests a signed link from /api/admin/journal-preview-link and
 * shares/opens it; anyone holding an unexpired link can view the draft (like
 * a Google Docs share link), but the id is unguessable and the token is
 * HMAC-bound to it. Renders through the same <JournalArticle> as the live
 * route, so what the client previews is exactly what publishes. Reading
 * searchParams makes the route request-time dynamic - drafts are never
 * cached or prerendered.
 */

export const metadata: Metadata = {
  title: "Draft preview",
  robots: { index: false, follow: false },
};

export default async function JournalPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ id }, { token }] = await Promise.all([params, searchParams]);
  if (!token || !verifyJournalPreviewToken(id, token)) notFound();

  const post = await fetchJournalPostForPreview(id);
  if (!post) notFound();

  return (
    <main className="bg-[#080706] text-zinc-100 pt-[clamp(120px,16vh,180px)] pb-32 px-6 md:px-12 lg:px-20">
      {/* Sticky draft ribbon so a shared preview can't be mistaken for live */}
      <div className="fixed inset-x-0 top-0 z-[60] border-b border-amber-500/30 bg-amber-950/90 px-6 py-2.5 text-center backdrop-blur">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300">
          Draft preview · not published{post.status === "scheduled" ? " · scheduled" : ""} · link
          expires 7 days after it was created
        </span>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 158, 11, 0.05) 0%, transparent 60%)",
        }}
      />

      <JournalArticle post={post} />
    </main>
  );
}
