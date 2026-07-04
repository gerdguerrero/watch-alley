import { type NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface WatchEntry {
  slug: string;
  brand: string | null;
  model: string | null;
  name: string | null;
  reference: string | null;
  status: string | null;
  primary_image: string | null;
  price: number | null;
}

type WatchViewColumn = "view_count" | "views_24h" | "views_7d";

type WatchViewRow = {
  slug: string;
  view_count: number | null;
  views_24h: number | null;
  views_7d: number | null;
  last_viewed_at: string | null;
};

const PERIOD_COLUMNS: Record<string, WatchViewColumn> = {
  all: "view_count",
  "24h": "views_24h",
  "7d": "views_7d",
};

export async function GET(request: NextRequest) {
  try {
    await assertAdmin(request);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Not authorized.",
        watches: [],
      },
      { status: 401 }
    );
  }

  try {
    const period = request.nextUrl.searchParams.get("period") || "7d";
    const sortColumn = PERIOD_COLUMNS[period] || PERIOD_COLUMNS["7d"];

    const supabase = createSupabaseAdminClient();

    const { data: views, error } = await supabase
      .from("watch_page_views")
      .select("slug, view_count, views_24h, views_7d, last_viewed_at")
      .order(sortColumn, { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({
        ok: false,
        error: "watch_page_views table not found. Run the migration first.",
        watches: [],
        migrationHint:
          "Open Supabase Dashboard > SQL Editor and run the migration from supabase/migrations/20260621180000_create_watch_page_views.sql",
      });
    }

    const viewRows = (views ?? []) as WatchViewRow[];
    if (viewRows.length === 0) {
      return NextResponse.json({ ok: true, watches: [], period });
    }

    // Fetch watch metadata for the viewed slugs straight from the database.
    // (This used to read the legacy /data/watches.json snapshot, which went
    // stale the moment inventory changed after the Vite era.)
    const watchesMap: Record<string, WatchEntry> = {};
    const { data: watchRows } = await supabase
      .from("watches")
      .select("slug, brand, model, name, reference, status, primary_image, price")
      .in(
        "slug",
        viewRows.map((v) => v.slug)
      );
    for (const w of (watchRows ?? []) as WatchEntry[]) {
      watchesMap[w.slug] = w;
    }

    const result = viewRows.map((v) => {
      const meta = watchesMap[v.slug];
      return {
        slug: v.slug,
        view_count: v[sortColumn] || 0,
        view_count_all: v.view_count || 0,
        last_viewed_at: v.last_viewed_at,
        brand: meta?.brand ?? null,
        name: meta?.name ?? null,
        model: meta?.model ?? null,
        reference: meta?.reference ?? null,
        status: meta?.status ?? null,
        image: meta?.primary_image ?? null,
        price: meta?.price ?? null,
      };
    });

    return NextResponse.json({ ok: true, watches: result, period });
  } catch (err) {
    console.error("popular-watches error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to load popular watches", watches: [] },
      { status: 500 }
    );
  }
}
