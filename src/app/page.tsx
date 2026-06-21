import { CollectionSection } from "@/components/develop/collection-section";
import { ContactSection } from "@/components/develop/contact-section";
import { EntrancePreloader } from "@/components/develop/entrance-preloader";
import { Hero } from "@/components/develop/hero";
import { JournalSection } from "@/components/develop/journal-section";
import { SmoothScrollProvider } from "@/components/develop/smooth-scroll-provider";
import { WatchListSection } from "@/components/watch-list/WatchListSection";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";
import { fetchFeaturedWatch, fetchWatches } from "@/lib/inventory/queries";
import { pickCollectionTeasers } from "@/lib/inventory/teasers";
import { fetchJournalPosts } from "@/lib/journal/queries";

export const revalidate = 60;

export default async function Page() {
  const [featured, available, posts] = await Promise.all([
    fetchFeaturedWatch(),
    fetchWatches({ status: "live" }),
    fetchJournalPosts(3),
  ]);

  // Pick the three teaser watches server-side so the Limited Edition card draws
  // from the whole catalog (not a 9-item slice) and only the chosen pieces are
  // serialized to the client. Exclude the hero piece so it isn't shown twice.
  const pool = featured ? available.filter((w) => w.slug !== featured.slug) : available;
  const teasers = pickCollectionTeasers(pool);

  return (
    <SmoothScrollProvider>
      <link rel="preload" href="/models/watch.glb" as="fetch" crossOrigin="anonymous" />
      <EntrancePreloader />
      <main className="bg-[#080706]">
        <Hero featured={featured} />
        <CollectionSection teasers={teasers} totalCount={available.length} />
        <JournalSection posts={posts} />
        <WatchListSection source="homepage" />
        <ContactSection />
      </main>
      <UsdPriceMount />
    </SmoothScrollProvider>
  );
}
