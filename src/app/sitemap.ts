import type { MetadataRoute } from "next";
import { fetchWatches } from "@/lib/inventory/queries";
import { fetchJournalPosts } from "@/lib/journal/queries";
import { SITE_URL } from "@/lib/seo/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Fetch all published watches and journal posts
  const [watches, posts] = await Promise.all([fetchWatches(), fetchJournalPosts()]);

  // 2. Define static routes
  const staticPaths = [
    "",
    "/available",
    "/sold",
    "/watch-list",
    "/journal",
    "/authenticity.html",
    "/terms.html",
    "/privacy.html",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/available" ? "daily" : "weekly",
    priority: path === "" ? 1.0 : path === "/available" ? 0.9 : 0.7,
  }));

  // 3. Define watch entries
  const watchEntries: MetadataRoute.Sitemap = watches.map((watch) => ({
    url: `${SITE_URL}/watch/${watch.slug}`,
    lastModified: watch.soldAt ? new Date(watch.soldAt) : new Date(),
    changeFrequency: watch.status === "available" ? "daily" : "monthly",
    priority: watch.status === "available" ? 0.8 : 0.5,
  }));

  // 4. Define journal entries
  const journalEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/journal/${post.slug}`,
    lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...watchEntries, ...journalEntries];
}
