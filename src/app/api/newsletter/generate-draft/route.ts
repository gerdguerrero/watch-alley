import type { NextRequest } from "next/server";
import { fetchWatches } from "@/lib/inventory/queries";
import { fetchJournalPosts } from "@/lib/journal/queries";
import { assertAdmin } from "@/lib/newsletter/admin";
import { generateNewsletterDraftAI } from "@/lib/newsletter/ai";
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
  const title = String(body.title || `Newsletter - ${issueMonth}`);
  const slug = slugify(String(body.slug || title));

  const [available, sold, posts] = await Promise.all([
    fetchWatches({ status: "live", limit: 4 }),
    fetchWatches({ status: "sold", limit: 2 }),
    fetchJournalPosts(2),
  ]);

  const featured = available.slice(0, 3);
  const soldHighlight = sold[0];
  const journal = posts[0];

  // Try AI draft generation first if API key is configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const aiDraft = await generateNewsletterDraftAI({
        available: available.map((w) => ({
          id: w.id,
          brand: w.brand,
          name: w.name,
          reference: w.reference,
          price: w.price,
          conditionLabel: w.conditionLabel,
          description: w.description || "",
          provenance: w.provenance || "",
        })),
        sold: sold.map((w) => ({
          id: w.id,
          brand: w.brand,
          name: w.name,
          reference: w.reference,
          price: w.price,
          conditionLabel: w.conditionLabel,
          description: w.description || "",
          provenance: w.provenance || "",
        })),
        posts: posts.map((p) => ({
          slug: p.slug,
          title: p.title,
          summary: p.summary || "",
          content: p.bodyMarkdown || "",
        })),
      });

      interface DraftItem {
        itemType: string;
        itemId?: string;
        title: string;
        summary?: string;
        url?: string;
        imageUrl?: string;
        position: number;
      }
      const items: DraftItem[] = [];

      // Map featured available watches
      for (let i = 0; i < featured.length; i++) {
        const watch = featured[i];
        const aiWatch = aiDraft.watches.find((w) => w.id === watch.id) || {
          headline: `${watch.brand} ${watch.name}`,
          copy: watch.description || `${watch.brand} ${watch.reference || watch.model}`.trim(),
        };
        items.push({
          itemType: "available_watch",
          itemId: watch.id,
          title: aiWatch.headline,
          summary: aiWatch.copy,
          url: `/watch/${watch.slug}`,
          imageUrl: watch.primaryImage || "",
          position: i,
        });
      }

      // Map sold watch highlight
      if (soldHighlight) {
        const aiSold = aiDraft.soldHighlight || {
          headline: `${soldHighlight.brand} ${soldHighlight.name}`,
          copy: "Sold archive highlight for similar-watch sourcing demand.",
        };
        items.push({
          itemType: "sold_watch",
          itemId: soldHighlight.id,
          title: aiSold.headline,
          summary: aiSold.copy,
          url: `/watch/${soldHighlight.slug}`,
          imageUrl: soldHighlight.primaryImage || "",
          position: 10,
        });
      }

      // Map journal post
      if (journal) {
        items.push({
          itemType: "journal_post",
          itemId: journal.slug,
          title: journal.title,
          summary: journal.summary,
          url: `/journal/${journal.slug}`,
          imageUrl: journal.heroImage || "",
          position: 20,
        });
      }

      // Sourcing CTA
      items.push({
        itemType: "sourcing_cta",
        title: "Looking for a specific reference?",
        summary: "Send the Private Collecting Desk a sourcing brief.",
        url: "/watch-list#sourcing",
        imageUrl: "",
        position: 30,
      });

      const introHtml = aiDraft.introHtml;
      const collectorNoteHtml = aiDraft.collectorNote
        ? `<h2>${escapeHtml(aiDraft.collectorNote.title)}</h2>${aiDraft.collectorNote.bodyHtml}`
        : "";

      const bodyHtml = `
        ${introHtml}
        <h2>In rotation</h2>
        ${featured
          .map((watch) => {
            const item = items.find(
              (it) => it.itemId === watch.id && it.itemType === "available_watch"
            );
            return `
              <div style="margin-bottom: 24px;">
                <h3>${escapeHtml(item?.title || `${watch.brand} ${watch.name}`)}</h3>
                <p>${escapeHtml(item?.summary || "")}</p>
                <p><a href="/watch/${escapeHtml(watch.slug)}">View watch details</a></p>
              </div>
            `;
          })
          .join("")}
        
        ${
          soldHighlight
            ? `
          <h2>Sold archive</h2>
          <div style="margin-bottom: 24px;">
            <h3>${escapeHtml(
              items.find((it) => it.itemType === "sold_watch")?.title ||
                `${soldHighlight.brand} ${soldHighlight.name}`
            )}</h3>
            <p>${escapeHtml(items.find((it) => it.itemType === "sold_watch")?.summary || "")}</p>
            <p><a href="/watch-list#sourcing">Find me something similar</a></p>
          </div>
        `
            : ""
        }

        ${collectorNoteHtml}
        
        <p style="margin-top: 32px;"><a href="https://www.thewatchalley.com/watch-list#sourcing">Send a sourcing request</a></p>
      `;

      const bodyText = [
        aiDraft.preheader,
        ...featured.map((watch) => {
          const item = items.find(
            (it) => it.itemId === watch.id && it.itemType === "available_watch"
          );
          return `${item?.title}: https://www.thewatchalley.com/watch/${watch.slug}\n${item?.summary}`;
        }),
        soldHighlight
          ? `Sold Highlight: ${soldHighlight.brand} ${soldHighlight.name}\n${
              items.find((it) => it.itemType === "sold_watch")?.summary
            }`
          : "",
        aiDraft.collectorNote
          ? `${aiDraft.collectorNote.title}\n${aiDraft.collectorNote.bodyHtml.replace(
              /<[^>]*>/g,
              ""
            )}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const payload = {
        slug,
        internalTitle: title,
        publicTitle: aiDraft.issueTitle,
        subject: aiDraft.subject,
        preheader: aiDraft.preheader,
        introHtml:
          "<p>An AI-generated draft prepared from current inventory, sold archive, and collector notes.</p>",
        bodyHtml,
        bodyText,
        status: "needs_review",
        sourceType: "ai_generated",
        archiveVisible: false,
        metadata: {
          generatedBy: "api/newsletter/generate-draft",
          adminEmail: admin.email,
          availableCount: available.length,
          soldCount: sold.length,
          journalCount: posts.length,
          modelUsed: "gemini-2.5-flash",
        },
        items,
      };

      const { data, error } = await admin.supabase.rpc("admin_upsert_newsletter_issue", {
        payload,
      });
      if (error) return jsonError(error.message, 500);

      const issue = data as { issue?: { id?: string } } | null;
      await admin.supabase.rpc("admin_log_ai_generation_run", {
        payload: {
          issueId: issue?.issue?.id,
          runType: "full_issue",
          model: "gemini-2.5-flash",
          promptVersion: "watch-list-ai-v1",
          inputPayload: { requestedTitle: body.title ?? null },
          outputPayload: { slug, itemCount: items.length },
          status: "completed",
        },
      });

      return jsonOk({ issue: data });
    } catch (aiError) {
      console.error("Gemini AI draft generation failed, falling back to system scaffold:", aiError);
    }
  }

  // Fallback system scaffold
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
