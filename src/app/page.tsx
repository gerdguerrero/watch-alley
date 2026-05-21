import { CollectionSection } from "@/components/develop/collection-section";
import { ContactSection } from "@/components/develop/contact-section";
import { HeritageSection } from "@/components/develop/heritage-section";
import { Hero } from "@/components/develop/hero";
import { JournalSection } from "@/components/develop/journal-section";
import { SmoothScrollProvider } from "@/components/develop/smooth-scroll-provider";
import { fetchFeaturedWatch, fetchWatches } from "@/lib/inventory/queries";
import { fetchJournalPosts } from "@/lib/journal/queries";

export const revalidate = 60;

export default async function Page() {
  const [featured, available, sold, posts] = await Promise.all([
    fetchFeaturedWatch(),
    fetchWatches({ status: "available", limit: 9 }),
    fetchWatches({ status: "sold" }),
    fetchJournalPosts(3),
  ]);

  const collectionWatches = featured
    ? available.filter((w) => w.slug !== featured.slug)
    : available;

  return (
    <SmoothScrollProvider>
      <main className="bg-[#0a0a0a]">
        <Hero featured={featured} />
        <CollectionSection watches={collectionWatches} />
        <HeritageSection
          latestPost={posts[0] ?? null}
          inventorySize={available.length}
          soldSize={sold.length}
        />
        <JournalSection posts={posts} />
        <ContactSection />
      </main>
    </SmoothScrollProvider>
  );
}
