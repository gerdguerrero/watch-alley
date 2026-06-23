import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://www.thewatchalley.com";
const DASH_RE = /[\u2013\u2014\u2015]/;

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function normalizeDashCharacters(value) {
  return String(value || "")
    .replace(/([0-9])\s*[\u2013]\s*([0-9])/g, "$1-$2")
    .replace(/\s*[\u2013\u2014\u2015]\s*/g, " - ");
}

function normalizeCopy(value) {
  return normalizeDashCharacters(value).replace(/\s+/g, " ").trim();
}

function normalizeHtml(value) {
  return normalizeDashCharacters(value).trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
}

function php(value) {
  return Number(value || 0).toLocaleString("en-PH");
}

function compactDescription(value) {
  return normalizeCopy(value).slice(0, 900);
}

function cleanAiDraft(draft) {
  return {
    subject: normalizeCopy(draft.subject),
    preheader: normalizeCopy(draft.preheader),
    issueTitle: normalizeCopy(draft.issueTitle),
    introHtml: normalizeHtml(draft.introHtml),
    watches: Array.isArray(draft.watches)
      ? draft.watches.map((watch) => ({
          id: normalizeCopy(watch.id),
          headline: normalizeCopy(watch.headline),
          copy: normalizeCopy(watch.copy),
        }))
      : [],
    soldHighlight: draft.soldHighlight
      ? {
          id: normalizeCopy(draft.soldHighlight.id),
          headline: normalizeCopy(draft.soldHighlight.headline),
          copy: normalizeCopy(draft.soldHighlight.copy),
        }
      : undefined,
    collectorNote: draft.collectorNote
      ? {
          title: normalizeCopy(draft.collectorNote.title),
          bodyHtml: normalizeHtml(draft.collectorNote.bodyHtml),
        }
      : undefined,
  };
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = String(text || "")
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    const start = cleaned.indexOf("{");
    if (start === -1) throw new Error("Gemini did not return a JSON object.");
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < cleaned.length; index += 1) {
      const char = cleaned[index];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      if (depth === 0) return JSON.parse(cleaned.slice(start, index + 1));
    }
    throw new Error("Gemini did not return a complete JSON object.");
  }
}

function hasBadDash(draft) {
  return DASH_RE.test(
    [
      draft.subject,
      draft.preheader,
      draft.issueTitle,
      draft.introHtml,
      draft.collectorNote?.title,
      draft.collectorNote?.bodyHtml,
      ...(draft.watches || []).flatMap((watch) => [watch.headline, watch.copy]),
      draft.soldHighlight?.headline,
      draft.soldHighlight?.copy,
    ].join(" ")
  );
}

function issueTheme(issue, index) {
  const metadataTheme = issue.metadata?.theme;
  if (typeof metadataTheme === "string" && metadataTheme.trim()) return metadataTheme.trim();

  const requestedTitle = issue.aiGenerationRuns?.[0]?.input?.requestedTitle;
  if (typeof requestedTitle === "string" && requestedTitle.trim()) return requestedTitle.trim();

  const title = `${issue.public_title || ""} ${issue.subject || ""}`.toLowerCase();
  if (title.includes("gen z")) return "Gen Z collector picks";
  if (title.includes("summer")) return "Summer rotation";
  if (title.includes("dress") || title.includes("gold")) return "Classic dress and gold";
  if (title.includes("japanese") || title.includes("jdm") || title.includes("seiko")) {
    return "Japanese collector favorites";
  }
  if (title.includes("swiss") || title.includes("tool")) return "Swiss mechanical tooling";
  if (title.includes("starter") || title.includes("50")) return "Collector starters under PHP 50,000";
  return `Fresh collector dispatch ${index + 1}`;
}

function themeInstruction(theme) {
  const lower = theme.toLowerCase();
  if (lower.includes("gen z")) {
    return "Focus on accessible, visually strong, modern references that younger collectors can wear daily without sounding gimmicky.";
  }
  if (lower.includes("summer")) {
    return "Focus on warm-weather practicality in Manila: water resistance, bracelets or straps, legibility, solar or robust automatic convenience, and easy daily wear.";
  }
  if (lower.includes("dress") || lower.includes("gold")) {
    return "Focus on classic proportions, dress-watch restraint, two-tone or gold accents, rectangular cases, and formal styling.";
  }
  if (lower.includes("japanese") || lower.includes("jdm") || lower.includes("seiko")) {
    return "Focus on Japanese watchmaking, JDM references, Seiko collector culture, limited editions, and value-minded enthusiast details.";
  }
  if (lower.includes("swiss") || lower.includes("tool")) {
    return "Focus on Swiss tool-watch utility, chronographs, dive-watch build, serviceability, and movement choices.";
  }
  if (lower.includes("starter") || lower.includes("50")) {
    return "Focus on credible first serious watches under PHP 50,000, with an honest balance of design, movement, condition, and total value.";
  }
  return "Build a cohesive collector dispatch that connects the freshest available watches to useful watch-buying context.";
}

function scoreWatch(watch, theme) {
  const haystack = [
    watch.brand,
    watch.name,
    watch.reference,
    watch.movement,
    watch.case_size,
    watch.material,
    watch.description,
    watch.category,
    ...(Array.isArray(watch.badges) ? watch.badges : []),
  ]
    .join(" ")
    .toLowerCase();
  const lower = theme.toLowerCase();
  let score = 0;

  if (watch.status === "reserved") score += 2;
  if (watch.featured) score += 2;
  if (watch.primary_image) score += 1;
  if (lower.includes("gen z")) {
    for (const term of ["bulova", "g-shock", "casio", "seiko 5", "speedtimer", "tank", "color", "mother"]) {
      if (haystack.includes(term)) score += 4;
    }
  }
  if (lower.includes("summer")) {
    for (const term of ["diver", "prospex", "water", "solar", "g-shock", "bracelet", "titanium"]) {
      if (haystack.includes(term)) score += 4;
    }
  }
  if (lower.includes("dress") || lower.includes("gold")) {
    for (const term of ["presage", "bambino", "tank", "dress", "gold", "cocktail", "classic"]) {
      if (haystack.includes(term)) score += 4;
    }
  }
  if (lower.includes("japanese") || lower.includes("jdm") || lower.includes("seiko")) {
    for (const term of ["jdm", "seiko", "grand seiko", "citizen", "orient", "prospex", "presage"]) {
      if (haystack.includes(term)) score += 4;
    }
  }
  if (lower.includes("swiss") || lower.includes("tool")) {
    for (const term of ["breitling", "tag heuer", "mido", "omega", "tudor", "diver", "chronograph", "gmt"]) {
      if (haystack.includes(term)) score += 5;
    }
  }
  if (lower.includes("starter") || lower.includes("50")) {
    if (Number(watch.price || 0) > 0 && Number(watch.price || 0) <= 50000) score += 7;
    for (const term of ["orient", "seiko", "citizen", "bulova", "automatic", "solar", "quartz"]) {
      if (haystack.includes(term)) score += 3;
    }
  }

  return score;
}

function candidatesForTheme(watches, theme, count) {
  return [...watches]
    .map((watch, index) => ({ watch, index, score: scoreWatch(watch, theme) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map((entry) => entry.watch);
}

function toPromptWatch(watch) {
  return {
    id: watch.id,
    slug: watch.slug,
    brand: watch.brand,
    name: watch.name,
    model: watch.model || "",
    reference: watch.reference || "",
    pricePhp: Number(watch.price || 0),
    availability: watch.status,
    condition: watch.condition_label || "",
    material: watch.material || "",
    movement: watch.movement || "",
    caseSize: watch.case_size || "",
    category: watch.category || "",
    badges: watch.badges || [],
    description: compactDescription(watch.description),
    provenance: compactDescription(watch.provenance),
  };
}

function extractInteractionText(interaction) {
  if (typeof interaction?.output_text === "string") return interaction.output_text;
  if (typeof interaction?.outputText === "string") return interaction.outputText;
  return (
    interaction?.steps
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content || [])
      .filter((content) => content.type === "text" && typeof content.text === "string")
      .map((content) => content.text)
      .join("\n\n") || ""
  );
}

function extractCitations(interaction) {
  const seen = new Set();
  const citations = [];
  for (const step of interaction?.steps || []) {
    if (step.type !== "model_output") continue;
    for (const content of step.content || []) {
      if (content.type !== "text") continue;
      for (const annotation of content.annotations || []) {
        if (annotation.type !== "url_citation" || !annotation.url || seen.has(annotation.url)) {
          continue;
        }
        seen.add(annotation.url);
        citations.push({ title: annotation.title || annotation.url, url: annotation.url });
      }
    }
  }
  return citations.slice(0, 8);
}

function extractQueries(interaction) {
  const queries = new Set();
  for (const step of interaction?.steps || []) {
    if (step.type !== "google_search_call" || !Array.isArray(step.arguments?.queries)) continue;
    for (const query of step.arguments.queries) {
      if (typeof query === "string" && query.trim()) queries.add(query.trim());
    }
  }
  return [...queries].slice(0, 8);
}

async function researchTheme(ai, theme, available, sold, posts) {
  const interaction = await ai.interactions.create({
    model: "gemini-3.5-flash",
    input: `Use Google Search to research concise context for a Watch Alley newsletter draft.

Theme: ${theme}
Instruction: ${themeInstruction(theme)}

Rules:
- Product availability, price, condition, inclusions, and specs must come only from the database payload.
- Web research may add brand, collection, movement, release, market, or collector-culture context.
- Use no em dashes or en dashes.
- Keep the brief compact and useful for an email editor.

Available watch targets:
${JSON.stringify(available.map(toPromptWatch), null, 2)}

Sold archive targets:
${JSON.stringify(sold.map(toPromptWatch), null, 2)}

Recent journal posts:
${JSON.stringify(posts, null, 2)}`,
    tools: [{ type: "google_search" }],
  });

  return {
    summary: normalizeDashCharacters(extractInteractionText(interaction)).trim(),
    queries: extractQueries(interaction),
    citations: extractCitations(interaction),
  };
}

async function generateDraft(ai, theme, available, sold, posts, research) {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Generate a JSON newsletter draft for The Watch List by The Watch Alley.

Theme: ${theme}
Theme instruction: ${themeInstruction(theme)}

Available inventory:
${JSON.stringify(available.map(toPromptWatch), null, 2)}

Sold archive:
${JSON.stringify(sold.map(toPromptWatch), null, 2)}

Recent journal posts:
${JSON.stringify(posts, null, 2)}

Grounded research brief:
${research.summary || "No external research returned. Use database and journal content only."}`,
    config: {
      responseMimeType: "application/json",
      systemInstruction: `You are the editorial and commerce assistant for The Watch Alley, a Manila-based curated watch reseller and collector desk.

Tone:
- Collector-first, knowledgeable, direct, warm, and premium.
- Helpful for watch buyers in the Philippines.
- No hype, no generic luxury-marketing language.
- Never use em dashes or en dashes. Use commas, colons, parentheses, semicolons, or a simple hyphen.

Factual rules:
- Product-card facts must come from the database payload only.
- Do not invent price, availability, condition, inclusions, authenticity, service history, movement, case size, warranty, rarity, or market value.
- External research can only support broad editorial context about a brand, reference family, movement type, collection, or collector interest.
- If a product is sold, clearly frame it as sold archive or sourcing context.
- Select exactly 3 available watches and exactly 1 sold watch from the provided IDs.

Return valid JSON only:
{
  "subject": "under 80 characters",
  "preheader": "under 140 characters",
  "issueTitle": "public title",
  "introHtml": "simple p/strong/em HTML, 2 paragraphs max",
  "watches": [
    { "id": "watch-id", "headline": "short headline", "copy": "1-2 grounded sentences" }
  ],
  "soldHighlight": { "id": "watch-id", "headline": "short headline", "copy": "1-2 sourcing-oriented sentences" },
  "collectorNote": { "title": "short title", "bodyHtml": "simple p/strong/em HTML, 2-3 paragraphs max" }
}`,
    },
  });

  if (!response.text) throw new Error("No Gemini draft response.");
  return cleanAiDraft(parseJsonObject(response.text));
}

function chooseFeatured(draft, available) {
  const selected = [];
  for (const item of draft.watches || []) {
    const found = available.find((watch) => watch.id === item.id);
    if (found && !selected.some((watch) => watch.id === found.id)) selected.push(found);
  }
  return selected.length ? selected.slice(0, 3) : available.slice(0, 3);
}

function chooseSold(draft, sold) {
  const found = sold.find((watch) => watch.id === draft.soldHighlight?.id);
  return {
    watch: found || sold[0],
    aiSold: found ? draft.soldHighlight : undefined,
  };
}

function buildItems({ draft, featured, soldWatch, aiSold, journal }) {
  const items = [];

  for (let index = 0; index < featured.length; index += 1) {
    const watch = featured[index];
    const aiWatch = draft.watches.find((item) => item.id === watch.id);
    items.push({
      itemType: "available_watch",
      itemId: watch.id,
      title: aiWatch?.headline || `${watch.brand} ${watch.name}`,
      summary: aiWatch?.copy || compactDescription(watch.description),
      url: `/watch/${watch.slug}`,
      imageUrl: watch.primary_image || "",
      position: index,
    });
  }

  if (soldWatch) {
    items.push({
      itemType: "sold_watch",
      itemId: soldWatch.id,
      title: aiSold?.headline || `${soldWatch.brand} ${soldWatch.name}`,
      summary:
        aiSold?.copy ||
        `${soldWatch.brand} ${soldWatch.name} is now in the sold archive. Send the Private Collecting Desk a sourcing brief if you want us to look for a similar reference.`,
      url: `/watch/${soldWatch.slug}`,
      imageUrl: soldWatch.primary_image || "",
      position: 10,
    });
  }

  if (journal) {
    items.push({
      itemType: "journal_post",
      itemId: journal.slug,
      title: journal.title,
      summary: journal.summary || "",
      url: `/journal/${journal.slug}`,
      imageUrl: journal.hero_image || "",
      position: 20,
    });
  }

  items.push({
    itemType: "sourcing_cta",
    title: "Looking for a specific reference?",
    summary: "Send the Private Collecting Desk a sourcing brief.",
    url: "/watch-list#sourcing",
    imageUrl: "",
    position: 30,
  });

  return items;
}

function buildBodyHtml({ draft, featured, soldWatch, items }) {
  const soldItem = items.find((item) => item.itemType === "sold_watch");
  const collectorNoteHtml = draft.collectorNote
    ? `
      <div style="margin-bottom: 40px; padding: 24px; border: 1px solid rgba(189, 154, 50, 0.2); background-color: rgba(189, 154, 50, 0.03);">
        <h3 style="font-family: 'Petrona', Georgia, serif; font-size: 20px; font-weight: normal; margin: 0 0 16px 0; color: #BD9A32; line-height: 1.3;">${escapeHtml(draft.collectorNote.title)}</h3>
        <div style="font-family: 'Spectral', Georgia, serif; font-size: 15px; line-height: 1.7; color: #d1d1cd;">${draft.collectorNote.bodyHtml}</div>
      </div>`
    : "";

  return normalizeHtml(`
    ${draft.introHtml}
    <h2>In rotation</h2>
    ${featured
      .map((watch) => {
        const item = items.find((candidate) => candidate.itemType === "available_watch" && candidate.itemId === watch.id);
        return `
          <div style="margin-bottom: 40px; border-bottom: 1px solid rgba(189, 154, 50, 0.1); padding-bottom: 30px;">
            ${
              watch.primary_image
                ? `<div style="margin-bottom: 20px; text-align: center;"><a href="/watch/${watch.slug}" style="text-decoration: none;"><img src="${watch.primary_image}" alt="${escapeHtml(watch.brand)} ${escapeHtml(watch.name)}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid rgba(189, 154, 50, 0.15);" width="520" /></a></div>`
                : ""
            }
            <h3 style="font-family: 'Petrona', Georgia, serif; font-size: 22px; font-weight: normal; margin: 0 0 8px 0; color: #F1ECE0; line-height: 1.3;"><a href="/watch/${watch.slug}" style="color: #F1ECE0; text-decoration: none;">${escapeHtml(item?.title || `${watch.brand} ${watch.name}`)}</a></h3>
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; letter-spacing: 0.1em; color: #BD9A32; text-transform: uppercase; margin-bottom: 12px; font-weight: bold;">Ref: ${escapeHtml(watch.reference || "N/A")} | ${escapeHtml(watch.condition_label || "Excellent")} | PHP ${php(watch.price)}</div>
            <p style="font-family: 'Spectral', Georgia, serif; font-size: 15px; line-height: 1.7; color: #d1d1cd; margin: 0 0 20px 0;">${escapeHtml(item?.summary || "")}</p>
            <div style="text-align: left;"><a href="/watch/${watch.slug}" style="display: inline-block; background-color: #BD9A32; color: #13110f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 24px; border-radius: 0px; text-align: center;">View watch details</a></div>
          </div>`;
      })
      .join("")}
    ${
      soldWatch
        ? `<div style="margin-bottom: 40px; border-bottom: 1px solid rgba(189, 154, 50, 0.1); padding-bottom: 30px;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; letter-spacing: 0.2em; color: #BD9A32; text-transform: uppercase; margin-bottom: 20px; font-weight: bold; text-align: center;">From the Sold Archive</div>
            ${
              soldWatch.primary_image
                ? `<div style="margin-bottom: 20px; text-align: center;"><a href="/watch/${soldWatch.slug}" style="text-decoration: none; opacity: 0.85;"><img src="${soldWatch.primary_image}" alt="${escapeHtml(soldWatch.brand)} ${escapeHtml(soldWatch.name)}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid rgba(189, 154, 50, 0.15);" width="520" /></a></div>`
                : ""
            }
            <h3 style="font-family: 'Petrona', Georgia, serif; font-size: 20px; font-weight: normal; margin: 0 0 8px 0; color: #F1ECE0; line-height: 1.3; text-align: center;"><a href="/watch/${soldWatch.slug}" style="color: #F1ECE0; text-decoration: none;">${escapeHtml(soldItem?.title || `${soldWatch.brand} ${soldWatch.name}`)}</a></h3>
            <p style="font-family: 'Spectral', Georgia, serif; font-size: 14px; line-height: 1.7; color: #d1d1cd; margin: 0 0 20px 0; text-align: center;">${escapeHtml(soldItem?.summary || "")}</p>
            <div style="text-align: center;"><a href="/watch-list#sourcing" style="display: inline-block; border: 1px solid #BD9A32; color: #BD9A32; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 24px; border-radius: 0px; text-align: center;">Request a similar piece</a></div>
          </div>`
        : ""
    }
    ${collectorNoteHtml}
    <p style="margin-top: 32px; text-align: center;"><a href="${SITE_URL}/watch-list#sourcing" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #BD9A32; text-decoration: none; border-bottom: 1px solid #BD9A32;">Send a sourcing request</a></p>
  `);
}

function buildBodyText({ draft, featured, soldWatch, items }) {
  return normalizeCopy(
    [
      draft.preheader,
      ...featured.map((watch) => {
        const item = items.find((candidate) => candidate.itemType === "available_watch" && candidate.itemId === watch.id);
        return `${item?.title}: ${SITE_URL}/watch/${watch.slug}\n${item?.summary}`;
      }),
      soldWatch
        ? `Sold Highlight: ${soldWatch.brand} ${soldWatch.name}\n${items.find((item) => item.itemType === "sold_watch")?.summary || ""}`
        : "",
      draft.collectorNote
        ? `${draft.collectorNote.title}\n${draft.collectorNote.bodyHtml.replace(/<[^>]*>/g, "")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n")
  );
}

function validateGenerated({ draft, featured, soldWatch, bodyHtml, bodyText }) {
  if (hasBadDash(draft) || DASH_RE.test(bodyHtml) || DASH_RE.test(bodyText)) {
    throw new Error("Generated draft still contains em/en dash characters.");
  }
  if (featured.length === 0) throw new Error("Draft has no available watch selections.");
  if (!soldWatch) throw new Error("Draft has no sold watch selection.");
}

async function main() {
  loadEnv();

  const apply = process.argv.includes("--apply");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY.");

  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const ai = new GoogleGenAI({ apiKey: geminiKey });

  const [{ data: issues, error: issueError }, { data: watches, error: watchError }, { data: posts, error: postError }] =
    await Promise.all([
      adminClient.rpc("admin_list_newsletter_issues", {
        status_filter: "needs_review",
        limit_count: 50,
      }),
      publicClient
        .from("watches")
        .select(
          "id, slug, brand, model, reference, name, price, status, condition_label, material, movement, case_size, category, badges, description, provenance, primary_image, featured, display_order, published"
        )
        .eq("published", true)
        .order("display_order", { ascending: true, nullsFirst: false }),
      publicClient
        .from("journal_posts")
        .select("slug, title, summary, body_markdown, hero_image, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(3),
    ]);

  if (issueError) throw new Error(`Failed to list newsletter issues: ${issueError.message}`);
  if (watchError) throw new Error(`Failed to fetch watches: ${watchError.message}`);
  if (postError) throw new Error(`Failed to fetch journal posts: ${postError.message}`);

  const reviewIssues = issues || [];
  const replacementByOldIssueId = new Map(
    reviewIssues
      .filter((issue) => issue.metadata?.generatedBy === "scripts/regenerate-newsletter-drafts.mjs")
      .filter((issue) => typeof issue.metadata?.regeneratedFromIssueId === "string")
      .map((issue) => [issue.metadata.regeneratedFromIssueId, issue])
  );
  const oldIssues = reviewIssues.filter(
    (issue) =>
      ["ai_generated", "system_scaffold"].includes(issue.source_type) &&
      issue.metadata?.generatedBy !== "scripts/regenerate-newsletter-drafts.mjs"
  );
  const pendingOldIssues = oldIssues.filter((issue) => !replacementByOldIssueId.has(issue.id));
  const available = (watches || []).filter((watch) => ["available", "reserved"].includes(watch.status));
  const sold = (watches || []).filter((watch) => watch.status === "sold");
  const journalPosts = (posts || []).map((post) => ({
    slug: post.slug,
    title: post.title,
    summary: post.summary || "",
    content: String(post.body_markdown || "").slice(0, 2200),
    hero_image: post.hero_image || "",
  }));

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        oldNeedsReviewIssues: oldIssues.map((issue) => ({
          id: issue.id,
          slug: issue.slug,
          title: issue.public_title,
          sourceType: issue.source_type,
          alreadyRegenerated: replacementByOldIssueId.has(issue.id),
        })),
        availableCount: available.length,
        soldCount: sold.length,
        journalCount: journalPosts.length,
      },
      null,
      2
    )
  );

  if (oldIssues.length === 0) {
    console.log("No AI/system needs_review drafts to regenerate.");
    return;
  }

  const created = [];
  for (let index = 0; index < pendingOldIssues.length; index += 1) {
    const oldIssue = pendingOldIssues[index];
    const theme = issueTheme(oldIssue, index);
    const themeAvailable = candidatesForTheme(available, theme, 24);
    const themeSold = candidatesForTheme(sold, theme, 10);

    console.log(`\nRegenerating: ${oldIssue.slug} -> ${theme}`);
    const research = await researchTheme(ai, theme, themeAvailable.slice(0, 8), themeSold.slice(0, 4), journalPosts);
    const draft = await generateDraft(ai, theme, themeAvailable, themeSold, journalPosts, research);
    const featured = chooseFeatured(draft, themeAvailable);
    const { watch: soldWatch, aiSold } = chooseSold(draft, themeSold);
    const items = buildItems({ draft, featured, soldWatch, aiSold, journal: journalPosts[0] });
    const bodyHtml = buildBodyHtml({ draft, featured, soldWatch, items });
    const bodyText = buildBodyText({ draft, featured, soldWatch, items });
    validateGenerated({ draft, featured, soldWatch, bodyHtml, bodyText });

    const slug = slugify(`${theme}-${Date.now()}-${index}`);
    const sourceSnapshot = {
      replacedIssueId: oldIssue.id,
      replacedIssueSlug: oldIssue.slug,
      availableIds: themeAvailable.map((watch) => watch.id),
      soldIds: themeSold.map((watch) => watch.id),
      journalSlugs: journalPosts.map((post) => post.slug),
      selectedAvailableIds: featured.map((watch) => watch.id),
      selectedSoldId: soldWatch?.id || null,
    };
    const payload = {
      slug,
      internalTitle: `Regenerated | ${oldIssue.internal_title || oldIssue.public_title || theme}`,
      publicTitle: draft.issueTitle,
      subject: draft.subject,
      preheader: draft.preheader,
      introHtml: draft.introHtml,
      bodyHtml,
      bodyText,
      status: "needs_review",
      sourceType: "ai_generated",
      archiveVisible: false,
      metadata: {
        generatedBy: "scripts/regenerate-newsletter-drafts.mjs",
        regeneratedFromIssueId: oldIssue.id,
        regeneratedFromSlug: oldIssue.slug,
        theme,
        availableCount: available.length,
        soldCount: sold.length,
        journalCount: journalPosts.length,
        modelUsed: "gemini-3.5-flash",
        research: {
          enabled: Boolean(research.summary),
          queries: research.queries,
          citations: research.citations,
        },
        sourceSnapshot,
      },
      items,
    };

    if (apply) {
      const { data, error } = await adminClient.rpc("admin_upsert_newsletter_issue", { payload });
      if (error) throw new Error(`Failed to save regenerated issue: ${error.message}`);
      const newIssueId = data?.issue?.id;
      if (!newIssueId) throw new Error("Regenerated issue did not return an id.");

      await adminClient.rpc("admin_log_ai_generation_run", {
        payload: {
          issueId: newIssueId,
          runType: "full_issue",
          model: "gemini-3.5-flash",
          promptVersion: "watch-list-regenerate-v1",
          inputPayload: { theme, sourceSnapshot, research },
          outputPayload: {
            slug,
            itemCount: items.length,
            selectedAvailableIds: featured.map((watch) => watch.id),
            selectedSoldId: soldWatch?.id || null,
          },
          status: "completed",
        },
      });

      created.push({ oldIssueId: oldIssue.id, oldSlug: oldIssue.slug, newIssueId, newSlug: slug });
      console.log(`Saved regenerated issue: ${slug}`);
    } else {
      created.push({ oldIssueId: oldIssue.id, oldSlug: oldIssue.slug, newSlug: slug });
      console.log(`Dry run generated issue: ${slug}`);
    }
  }

  if (apply) {
    for (const issue of oldIssues) {
      const { error } = await adminClient.rpc("admin_update_newsletter_issue_status", {
        issue_id: issue.id,
        new_status: "rejected",
      });
      if (error) throw new Error(`Failed to reject old issue ${issue.slug}: ${error.message}`);
      console.log(`Rejected old issue: ${issue.slug}`);
    }
  }

  console.log(JSON.stringify({ regenerated: created }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
