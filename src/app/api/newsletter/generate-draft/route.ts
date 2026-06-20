import type { NextRequest } from "next/server";
import { fetchWatches } from "@/lib/inventory/queries";
import { fetchJournalPosts } from "@/lib/journal/queries";
import { assertAdmin } from "@/lib/newsletter/admin";
import { jsonError, jsonOk, readJsonObject } from "@/lib/newsletter/api";

export const runtime = "nodejs";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function monthLabel() {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Asia/Manila" })
    .format(new Date())
    .replace(/\s+/g, " ");
}

export async function POST(request: NextRequest) {
  let admin: Awaited<ReturnType<typeof assertAdmin>>;
  try {
    admin = await assertAdmin(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Not authorized.", 401);
  }

  const body = (await readJsonObject(request)) ?? {};
  const issueMonth = monthLabel();
  const title = String(body.title || `The Watch List - ${issueMonth}`);
  const slug = slugify(String(body.slug || title));

  const [available, sold, posts] = await Promise.all([
    fetchWatches({ status: "live", limit: 4 }),
    fetchWatches({ status: "sold", limit: 2 }),
    fetchJournalPosts(2),
  ]);

  const featured = available.slice(0, 3);
  const soldHighlight = sold[0];
  const journal = posts[0];

  const items = [
    ...featured.map((watch, index) => ({
      itemType: "available_watch",
      itemId: watch.id,
      title: `${watch.brand} ${watch.name}`,
      summary: watch.description || `${watch.brand} ${watch.reference || watch.model}`.trim(),
      url: `/watch/${watch.slug}`,
      imageUrl: watch.primaryImage || "",
      position: index,
    })),
    ...(soldHighlight
      ? [
          {
            itemType: "sold_watch",
            itemId: soldHighlight.id,
            title: `${soldHighlight.brand} ${soldHighlight.name}`,
            summary: "Sold archive highlight for similar-watch sourcing demand.",
            url: `/watch/${soldHighlight.slug}`,
            imageUrl: soldHighlight.primaryImage || "",
            position: 10,
          },
        ]
      : []),
    ...(journal
      ? [
          {
            itemType: "journal_post",
            itemId: journal.slug,
            title: journal.title,
            summary: journal.summary,
            url: `/journal/${journal.slug}`,
            imageUrl: journal.heroImage || "",
            position: 20,
          },
        ]
      : []),
    {
      itemType: "sourcing_cta",
      title: "Looking for a specific reference?",
      summary: "Send the Private Collecting Desk a sourcing brief.",
      url: "/watch-list#sourcing",
      imageUrl: "",
      position: 30,
    },
  ];

  const bodyText = [
    "First access to curated drops, rare finds, collector notes, and sourcing opportunities from Manila.",
    ...featured.map((watch) => `- ${watch.brand} ${watch.name}: /watch/${watch.slug}`),
    soldHighlight ? `- Sold archive: ${soldHighlight.brand} ${soldHighlight.name}` : "",
    journal ? `- Collector note: ${journal.title}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const bodyHtml = `
    <p>First access to curated drops, rare finds, collector notes, and sourcing opportunities from Manila.</p>
    <h2>In rotation</h2>
    <ul>
      ${featured
        .map(
          (watch) =>
            `<li><strong>${escapeHtml(`${watch.brand} ${watch.name}`)}</strong> - <a href="/watch/${escapeHtml(watch.slug)}">View watch</a></li>`
        )
        .join("")}
    </ul>
    ${
      soldHighlight
        ? `<h2>Sold archive note</h2><p>${escapeHtml(`${soldHighlight.brand} ${soldHighlight.name}`)} is sold. Invite readers to request one like it.</p>`
        : ""
    }
    ${journal ? `<h2>Collector note</h2><p>${escapeHtml(journal.summary)}</p>` : ""}
    <p><a href="/watch-list#sourcing">Send a sourcing request</a></p>
  `;

  const payload = {
    slug,
    internalTitle: title,
    publicTitle: title,
    subject: String(body.subject || `${issueMonth}: Curated drops from The Watch Alley`),
    preheader:
      "First access to curated drops, rare finds, collector notes, and sourcing opportunities.",
    introHtml:
      "<p>A draft issue prepared from current inventory, sold archive context, and recent collector notes.</p>",
    bodyHtml,
    bodyText,
    status: "needs_review",
    sourceType: "system_scaffold",
    archiveVisible: false,
    metadata: {
      generatedBy: "api/newsletter/generate-draft",
      adminEmail: admin.email,
      availableCount: available.length,
      soldCount: sold.length,
      journalCount: posts.length,
    },
    items,
  };

  const { data, error } = await admin.supabase.rpc("admin_upsert_newsletter_issue", { payload });
  if (error) return jsonError(error.message, 500);

  const issue = data as { issue?: { id?: string } } | null;
  await admin.supabase.rpc("admin_log_ai_generation_run", {
    payload: {
      issueId: issue?.issue?.id,
      runType: "system_scaffold",
      model: "system",
      promptVersion: "watch-list-scaffold-v1",
      inputPayload: { requestedTitle: body.title ?? null },
      outputPayload: { slug, itemCount: items.length },
      status: "completed",
    },
  });

  return jsonOk({ issue: data });
}
