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
      if (aiSoldHighlight) {
        const foundSold = sold.find((w) => w.id === aiSoldHighlight.id);
        if (foundSold) {
          soldHighlight = foundSold;
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
        ? `
        <div style="margin-bottom: 40px; padding: 24px; border: 1px solid rgba(189, 154, 50, 0.2); background-color: rgba(189, 154, 50, 0.03);">
          <h3 style="font-family: 'Petrona', Georgia, serif; font-size: 20px; font-weight: normal; margin: 0 0 16px 0; color: #BD9A32; line-height: 1.3;">
            ${escapeHtml(aiDraft.collectorNote.title)}
          </h3>
          <div style="font-family: 'Spectral', Georgia, serif; font-size: 15px; line-height: 1.7; color: #d1d1cd;">
            ${aiDraft.collectorNote.bodyHtml}
          </div>
        </div>`
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
              <div style="margin-bottom: 40px; border-bottom: 1px solid rgba(189, 154, 50, 0.1); padding-bottom: 30px;">
                ${
                  watch.primaryImage
                    ? `
                <div style="margin-bottom: 20px; text-align: center;">
                  <a href="/watch/${watch.slug}" style="text-decoration: none;">
                    <img src="${watch.primaryImage}" alt="${escapeHtml(watch.brand)} ${escapeHtml(watch.name)}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid rgba(189, 154, 50, 0.15);" width="520" />
                  </a>
                </div>
                `
                    : ""
                }
                <h3 style="font-family: 'Petrona', Georgia, serif; font-size: 22px; font-weight: normal; margin: 0 0 8px 0; color: #F1ECE0; line-height: 1.3;">
                  <a href="/watch/${watch.slug}" style="color: #F1ECE0; text-decoration: none;">${escapeHtml(item?.title || `${watch.brand} ${watch.name}`)}</a>
                </h3>
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; letter-spacing: 0.1em; color: #BD9A32; text-transform: uppercase; margin-bottom: 12px; font-weight: bold;">
                  Ref: ${escapeHtml(watch.reference || "N/A")} · ${escapeHtml(watch.conditionLabel || "Excellent")} · ₱${watch.price ? watch.price.toLocaleString("en-PH") : "Inquire"}
                </div>
                <p style="font-family: 'Spectral', Georgia, serif; font-size: 15px; line-height: 1.7; color: #d1d1cd; margin: 0 0 20px 0;">
                  ${escapeHtml(item?.summary || "")}
                </p>
                <div style="text-align: left;">
                  <a href="/watch/${watch.slug}" style="display: inline-block; background-color: #BD9A32; color: #13110f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 24px; border-radius: 0px; text-align: center;">View watch details</a>
                </div>
              </div>
            `;
          })
          .join("")}
        
        ${
          soldHighlight
            ? `
          <div style="margin-bottom: 40px; border-bottom: 1px solid rgba(189, 154, 50, 0.1); padding-bottom: 30px;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; letter-spacing: 0.2em; color: #BD9A32; text-transform: uppercase; margin-bottom: 20px; font-weight: bold; text-align: center;">From the Sold Archive</div>
            ${
              soldHighlight.primaryImage
                ? `
            <div style="margin-bottom: 20px; text-align: center;">
              <a href="/watch/${soldHighlight.slug}" style="text-decoration: none; opacity: 0.85;">
                <img src="${soldHighlight.primaryImage}" alt="${escapeHtml(soldHighlight.brand)} ${escapeHtml(soldHighlight.name)}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid rgba(189, 154, 50, 0.15); filter: grayscale(20%);" width="520" />
              </a>
            </div>
            `
                : ""
            }
            <h3 style="font-family: 'Petrona', Georgia, serif; font-size: 20px; font-weight: normal; margin: 0 0 8px 0; color: #F1ECE0; line-height: 1.3; text-align: center;">
              <a href="/watch/${soldHighlight.slug}" style="color: #F1ECE0; text-decoration: none;">${escapeHtml(
                items.find((it) => it.itemType === "sold_watch")?.title ||
                  `${soldHighlight.brand} ${soldHighlight.name}`
              )}</a>
            </h3>
            <p style="font-family: 'Spectral', Georgia, serif; font-size: 14px; line-height: 1.7; color: #d1d1cd; margin: 0 0 20px 0; text-align: center;">
              ${escapeHtml(items.find((it) => it.itemType === "sold_watch")?.summary || "")}
            </p>
            <div style="text-align: center;">
              <a href="/watch-list#sourcing" style="display: inline-block; border: 1px solid #BD9A32; color: #BD9A32; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 24px; border-radius: 0px; text-align: center;">Request a similar piece</a>
            </div>
          </div>
        `
            : ""
        }

        ${collectorNoteHtml}
        
        <p style="margin-top: 32px; text-align: center;"><a href="https://www.thewatchalley.com/watch-list#sourcing" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #BD9A32; text-decoration: none; border-bottom: 1px solid #BD9A32;">Send a sourcing request</a></p>
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
    ${featured
      .map(
        (watch) => `
        <div style="margin-bottom: 40px; border-bottom: 1px solid rgba(189, 154, 50, 0.1); padding-bottom: 30px;">
          ${
            watch.primaryImage
              ? `
          <div style="margin-bottom: 20px; text-align: center;">
            <a href="/watch/${watch.slug}" style="text-decoration: none;">
              <img src="${watch.primaryImage}" alt="${escapeHtml(watch.brand)} ${escapeHtml(watch.name)}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid rgba(189, 154, 50, 0.15);" width="520" />
            </a>
          </div>
          `
              : ""
          }
          <h3 style="font-family: 'Petrona', Georgia, serif; font-size: 22px; font-weight: normal; margin: 0 0 8px 0; color: #F1ECE0; line-height: 1.3;">
            <a href="/watch/${watch.slug}" style="color: #F1ECE0; text-decoration: none;">${escapeHtml(watch.brand)} ${escapeHtml(watch.name)}</a>
          </h3>
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; letter-spacing: 0.1em; color: #BD9A32; text-transform: uppercase; margin-bottom: 12px; font-weight: bold;">
            Ref: ${escapeHtml(watch.reference || "N/A")} · ${escapeHtml(watch.conditionLabel || "Excellent")} · ₱${watch.price ? watch.price.toLocaleString("en-PH") : "Inquire"}
          </div>
          <p style="font-family: 'Spectral', Georgia, serif; font-size: 15px; line-height: 1.7; color: #d1d1cd; margin: 0 0 20px 0;">
            ${escapeHtml(watch.description || `${watch.brand} ${watch.reference || watch.model}`.trim())}
          </p>
          <div style="text-align: left;">
            <a href="/watch/${watch.slug}" style="display: inline-block; background-color: #BD9A32; color: #13110f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 24px; border-radius: 0px; text-align: center;">View watch details</a>
          </div>
        </div>
      `
      )
      .join("")}
    
    ${
      soldHighlight
        ? `
      <div style="margin-bottom: 40px; border-bottom: 1px solid rgba(189, 154, 50, 0.1); padding-bottom: 30px;">
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; letter-spacing: 0.2em; color: #BD9A32; text-transform: uppercase; margin-bottom: 20px; font-weight: bold; text-align: center;">From the Sold Archive</div>
        ${
          soldHighlight.primaryImage
            ? `
        <div style="margin-bottom: 20px; text-align: center;">
          <a href="/watch/${soldHighlight.slug}" style="text-decoration: none; opacity: 0.85;">
            <img src="${soldHighlight.primaryImage}" alt="${escapeHtml(soldHighlight.brand)} ${escapeHtml(soldHighlight.name)}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid rgba(189, 154, 50, 0.15); filter: grayscale(20%);" width="520" />
          </a>
        </div>
        `
            : ""
        }
        <h3 style="font-family: 'Petrona', Georgia, serif; font-size: 20px; font-weight: normal; margin: 0 0 8px 0; color: #F1ECE0; line-height: 1.3; text-align: center;">
          <a href="/watch/${soldHighlight.slug}" style="color: #F1ECE0; text-decoration: none;">${escapeHtml(soldHighlight.brand)} ${escapeHtml(soldHighlight.name)}</a>
        </h3>
        <p style="font-family: 'Spectral', Georgia, serif; font-size: 14px; line-height: 1.7; color: #d1d1cd; margin: 0 0 20px 0; text-align: center;">
          This exceptional ${escapeHtml(soldHighlight.brand)} is now with its new keeper. Get in touch with our Private Collecting Desk to source a similar reference.
        </p>
        <div style="text-align: center;">
          <a href="/watch-list#sourcing" style="display: inline-block; border: 1px solid #BD9A32; color: #BD9A32; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 24px; border-radius: 0px; text-align: center;">Request a similar piece</a>
        </div>
      </div>
    `
        : ""
    }
    
    ${
      journal
        ? `
      <div style="margin-bottom: 40px; padding: 24px; border: 1px solid rgba(189, 154, 50, 0.2); background-color: rgba(189, 154, 50, 0.03);">
        <h3 style="font-family: 'Petrona', Georgia, serif; font-size: 20px; font-weight: normal; margin: 0 0 16px 0; color: #BD9A32; line-height: 1.3;">
          ${escapeHtml(journal.title)}
        </h3>
        <p style="font-family: 'Spectral', Georgia, serif; font-size: 15px; line-height: 1.7; color: #d1d1cd; margin: 0 0 16px 0;">
          ${escapeHtml(journal.summary)}
        </p>
        <p style="margin: 0;"><a href="/journal/${escapeHtml(journal.slug)}">Read the full dispatch on our Bench Blog</a></p>
      </div>
    `
        : ""
    }
    
    <p style="margin-top: 32px; text-align: center;"><a href="https://www.thewatchalley.com/watch-list#sourcing" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #BD9A32; text-decoration: none; border-bottom: 1px solid #BD9A32;">Send a Sourcing Request</a></p>
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
