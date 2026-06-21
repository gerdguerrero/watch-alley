import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const WATCHES_DATA_URL =
  "https://www.thewatchalley.com/data/watches.json";

interface WatchEntry {
  slug: string;
  brand: string;
  model: string;
  name: string;
  reference?: string;
  status: string;
  primaryImage?: string;
  price?: number;
}

interface WatchView {
  slug: string;
  view_count: number;
  last_viewed_at: string;
}

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();

    const { data: views, error } = await supabase
      .from("watch_page_views")
      .select("slug, view_count, last_viewed_at")
      .order("view_count", { ascending: false })
      .limit(10);

    if (error) {
      // Table doesn't exist yet
      return NextResponse.json({
        ok: false,
        error: "watch_page_views table not found. Run the migration first.",
        watches: [],
        migrationHint:
          "Open Supabase Dashboard > SQL Editor and run the migration from supabase/migrations/20260621180000_create_watch_page_views.sql",
      });
    }

    if (!views || views.length === 0) {
      return NextResponse.json({ ok: true, watches: [] });
    }

    // Fetch watches metadata to enrich the results
    let watchesMap: Record<string, WatchEntry> = {};
    try {
      const resp = await fetch(WATCHES_DATA_URL);
      if (resp.ok) {
        const data = await resp.json();
        const list: WatchEntry[] = Array.isArray(data)
          ? data
          : data.watches ?? [];
        for (const w of list) {
          watchesMap[w.slug] = w;
        }
      }
    } catch {
      // Non-critical — we just won't have watch names
    }

    const result = (views as WatchView[]).map((v) => {
      const meta = watchesMap[v.slug];
      return {
        slug: v.slug,
        view_count: v.view_count,
        last_viewed_at: v.last_viewed_at,
        brand: meta?.brand ?? null,
        name: meta?.name ?? null,
        model: meta?.model ?? null,
        reference: meta?.reference ?? null,
        status: meta?.status ?? null,
        image: meta?.primaryImage ?? null,
        price: meta?.price ?? null,
      };
    });

    return NextResponse.json({ ok: true, watches: result });
  } catch (err) {
    console.error("popular-watches error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to load popular watches", watches: [] },
      { status: 500 }
    );
  }
}
