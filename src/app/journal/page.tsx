import type { Metadata } from "next";
import { JournalCard } from "@/components/develop/journal-card";
import { PageTitle } from "@/components/develop/page-title";
import { fetchJournalPosts } from "@/lib/journal/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Notes from the bench: dispatches on watches we love, market observations from Manila, and a slow-build collector library from The Watch Alley.",
  alternates: { canonical: "/journal" },
};

export default async function JournalIndexPage() {
  const posts = await fetchJournalPosts();

  return (
    <main className="bg-[#080706] text-zinc-100">
      <PageTitle
        title="JOURNAL"
        eyebrow="◆ Notes from the bench"
        description="A slow-build collector library: dispatches on watches we love, market observations from Manila, and the conversations we keep having with buyers. New entries land when there is something honestly worth saying, not on a content calendar."
        variant="editorial"
      />

      <section className="relative px-6 md:px-12 lg:px-20 pb-32 max-w-[1680px] mx-auto">
        {posts.length === 0 ? (
          <p className="py-12 text-center text-zinc-500 italic font-serif text-lg">
            No published entries yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
            {posts.map((post, i) => (
              <JournalCard key={post.slug} post={post} index={i} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
