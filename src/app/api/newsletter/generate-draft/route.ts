import type { NextRequest } from "next/server";
import { fetchWatches } from "@/lib/inventory/queries";
import { fetchJournalPosts } from "@/lib/journal/queries";
import { assertAdmin } from "@/lib/newsletter/admin";
import { generateNewsletterDraftAI } from "@/lib/newsletter/ai";
import { jsonError, jsonOk, readJsonObject } from "@/lib/newsletter/api";
import { escapeHtml } from "@/lib/newsletter/html";
import {
  renderNoteBoxHtml,
  renderSoldHighlightHtml,
  renderWatchCardHtml,
  SOURCING_CTA_HTML,
} from "@/lib/newsletter/template";

export const runtime = "nodejs";
export const maxDuration = 60;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
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
  const title = String(body.title || `Newsletter | ${issueMonth}`);
  const slug = slugify(String(body.slug || title));

  const [available, sold, posts] = await Promise.all([
    fetchWatches({ status: "live", limit: 20 }),
    fetchWatches({ status: "sold", limit: 10 }),
    fetchJournalPosts(2),
  ]);

  let featured = available.slice(0, 3);
  let soldHighlight = sold[0];
  const journal = posts[0];

  // Try AI draft generation first if API key is configured
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    try {
      const aiDraft = await generateNewsletterDraftAI({
        available: available.map((w) => ({
          id: w.id,
          brand: w.brand,
          name: w.name,
          model: w.model,
          reference: w.reference,
          price: w.price,
          conditionLabel: w.conditionLabel,
          material: w.material,
          movement: w.movement,
          caseSize: w.caseSize,
          category: w.category,
          badges: w.badges,
          description: w.description || "",
          provenance: w.provenance || "",
        })),
        sold: sold.map((w) => ({
          id: w.id,
          brand: w.brand,
          name: w.name,
          model: w.model,
          reference: w.reference,
          price: w.price,
          conditionLabel: w.conditionLabel,
          material: w.material,
          movement: w.movement,
          caseSize: w.caseSize,
          category: w.category,
          badges: w.badges,
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

      // Resolve featured watches from AI draft selections
      const aiSelectedFeatured: typeof available = [];
      for (const aiWatch of aiDraft.watches) {
        const found = available.find((w) => w.id === aiWatch.id);
        if (found && !aiSelectedFeatured.some((f) => f.id === found.id)) {
          aiSelectedFeatured.push(found);
        }
      }
      if (aiSelectedFeatured.length > 0) {
        featured = aiSelectedFeatured.slice(0, 3);
      } else {
        featured = available.slice(0, 3);
      }

      // Resolve sold watch highlight from AI draft selections
      const aiSoldHighlight = aiDraft.soldHighlight;
      let resolvedAiSoldHighlight: typeof aiSoldHighlight | undefined;
      if (aiSoldHighlight) {
        const foundSold = sold.find((w) => w.id === aiSoldHighlight.id);
        if (foundSold) {
          soldHighlight = foundSold;
          resolvedAiSoldHighlight = aiSoldHighlight;
        }
      }

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
        const aiSold = resolvedAiSoldHighlight || {
          headline: `${soldHighlight.brand} ${soldHighlight.name}`,
          copy: `${soldHighlight.brand} ${soldHighlight.name} is now in the sold archive. Send the Private Collecting Desk a sourcing brief if you want us to look for a similar reference.`,
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
        ? renderNoteBoxHtml({
            title: aiDraft.collectorNote.title,
            innerHtml: aiDraft.collectorNote.bodyHtml,
          })
        : "";

      const soldItem = items.find((it) => it.itemType === "sold_watch");
      const bodyHtml = `
        ${introHtml}
        <h2>In rotation</h2>
        ${featured
          .map((watch) => {
            const item = items.find(
              (it) => it.itemId === watch.id && it.itemType === "available_watch"
            );
            return renderWatchCardHtml(watch, {
              title: item?.title || `${watch.brand} ${watch.name}`,
              summary: item?.summary || "",
            });
          })
          .join("")}
        ${
          soldHighlight
            ? renderSoldHighlightHtml(soldHighlight, {
                title: soldItem?.title || `${soldHighlight.brand} ${soldHighlight.name}`,
                summary: soldItem?.summary || "",
              })
            : ""
        }
        ${collectorNoteHtml}
        ${SOURCING_CTA_HTML}
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
        introHtml,
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
          modelUsed: "gemini-3.5-flash",
          research: aiDraft.research
            ? {
                enabled: aiDraft.research.enabled,
                queries: aiDraft.research.queries || [],
                citations: aiDraft.research.citations || [],
                error: aiDraft.research.error || null,
              }
            : { enabled: false },
          sourceSnapshot: {
            availableIds: available.map((w) => w.id),
            soldIds: sold.map((w) => w.id),
            journalSlugs: posts.map((p) => p.slug),
            selectedAvailableIds: featured.map((w) => w.id),
            selectedSoldId: soldHighlight?.id || null,
          },
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
          model: "gemini-3.5-flash",
          promptVersion: "watch-list-ai-v2",
          inputPayload: {
            requestedTitle: body.title ?? null,
            sourceSnapshot: payload.metadata.sourceSnapshot,
            research: payload.metadata.research,
          },
          outputPayload: {
            slug,
            itemCount: items.length,
            selectedAvailableIds: featured.map((w) => w.id),
            selectedSoldId: soldHighlight?.id || null,
          },
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
    ${featured
      .map((watch) =>
        renderWatchCardHtml(watch, {
          title: `${watch.brand} ${watch.name}`,
          summary: watch.description || `${watch.brand} ${watch.reference || watch.model}`.trim(),
        })
      )
      .join("")}
    ${
      soldHighlight
        ? renderSoldHighlightHtml(soldHighlight, {
            title: `${soldHighlight.brand} ${soldHighlight.name}`,
            summary: `This exceptional ${soldHighlight.brand} is now with its new keeper. Get in touch with our Private Collecting Desk to source a similar reference.`,
          })
        : ""
    }
    ${
      journal
        ? renderNoteBoxHtml({
            title: journal.title,
            innerHtml: `<p style="margin: 0 0 16px 0;">${escapeHtml(journal.summary)}</p>
        <p style="margin: 0;"><a href="/journal/${escapeHtml(journal.slug)}">Read the full dispatch on our Bench Blog</a></p>`,
          })
        : ""
    }
    ${SOURCING_CTA_HTML}
  `;

  const payload = {
    slug,
    internalTitle: title,
    publicTitle: title,
    subject: String(body.subject || `${issueMonth}: Curated drops from The Watch Alley`),
    preheader:
      "First access to curated drops, rare finds, collector notes, and sourcing opportunities.",
    introHtml:
      "<p>First access to curated drops, rare finds, collector notes, and sourcing opportunities from Manila.</p>",
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
