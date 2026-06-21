import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  }
}

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("Error: Missing GEMINI_API_KEY or GOOGLE_API_KEY in .env.local");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const publicClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function escapeHtml(value) {
  if (!value) return "";
  return value
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
    .slice(0, 120);
}

const THEMES = [
  {
    name: "Summer Rotation",
    subjectHint: "Lightweight, daily beaters for warm weather",
    instruction: "Focus the introduction and collector notes on summer-ready watch collecting (rubber/steel straps, dive watches, daily beaters, lightweight quartz and automatic options in Manila's humidity)."
  },
  {
    name: "Classic Dress & Gold",
    subjectHint: "The resurgence of classic dimensions and gold accents",
    instruction: "Focus the introduction and collector notes on elegant dress watches (smaller case dimensions like 34-36mm, gold cases/accents, leather straps, and styling watches for formal evening occasions)."
  },
  {
    name: "Japanese Masterpieces",
    subjectHint: "Why collectors hunt JDM Seiko & Citizen",
    instruction: "Focus the introduction and collector notes on Japanese Domestic Market (JDM) watches, Seiko heritage, citizen craftsmanship, and why collector circles from Manila hunt JDM exclusives."
  },
  {
    name: "Swiss Mechanical Tooling",
    subjectHint: "Robust chronographs and dive watches from Switzerland",
    instruction: "Focus the introduction and collector notes on Swiss tool watches (chronographs, heavy dive watches, mechanical movement precision, and the heritage of brands like Breitling, Omega, and Tudor)."
  },
  {
    name: "Collector Starters under ₱50k",
    subjectHint: "Curation of starter automatics and heritage brands",
    instruction: "Focus the introduction and collector notes on budget-friendly watch collecting. Curation of excellent entry points under ₱50,000, value retention, and what to look for in a first serious watch."
  }
];

async function generateThemedDraft(theme, available, sold, posts) {
  console.log(`\nGenerating draft for theme: "${theme.name}"...`);

  const systemInstruction = `You are the editorial and commerce assistant for The Watch Alley, a Manila-based curated watch reseller and collector desk.
Your job is to draft a newsletter issue for "The Watch List by The Watch Alley".

Theme instruction: ${theme.instruction}

Tone:
- Collector-first, knowledgeable, sophisticated
- Warm but premium, conversational, never hypey or spammy
- Helpful for watch buyers in the Philippines

Factual constraint:
- Do not invent specs, condition, price, inclusions, or availability. Use only the provided data.
- Do not claim a watch is rare unless source data explicitly says so.
- Link URLs should use the canonical path format: "/watch/[slug]" for watches, "/journal/[slug]" for journal posts.

Format:
Return a valid JSON object matching this schema:
{
  "subject": "A compelling email subject line under 80 characters. Hint: ${theme.subjectHint}",
  "preheader": "An engaging email preheader under 140 characters",
  "issueTitle": "Public title for the newsletter issue (e.g. The Alley Dispatch - [Theme Title])",
  "introHtml": "HTML paragraph(s) introducing this week's dispatch. Set the mood, write about the theme, and share a brief collector observation. Keep formatting simple (p, strong, em only).",
  "watches": [
    {
      "id": "watch-id",
      "headline": "A short, catchy line about this watch",
      "copy": "1-2 sentences highlighting why a collector should care about this specific watch based on the theme (provenance, design details, movement, value)."
    }
  ],
  "soldHighlight": {
    "id": "watch-id",
    "headline": "Sourcing highlight catchphrase",
    "copy": "A note about this sold piece, reinforcing sourcing demand: how fast it sold, its historical value, and inviting readers to request similar pieces."
  },
  "collectorNote": {
    "title": "A title for the collector note / editorial section",
    "bodyHtml": "HTML content for a short educational essay or discussion inspired by the recent journal post and theme."
  }
}`;

  const userPrompt = `Generate a newsletter draft based on the following fresh content:

### Available Inventory:
${JSON.stringify(available, null, 2)}

### Sold Highlights:
${JSON.stringify(sold, null, 2)}

### Recent Journal Posts:
${JSON.stringify(posts, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("No response from Gemini API.");
  }

  const aiDraft = JSON.parse(response.text);
  return aiDraft;
}

async function main() {
  console.log("Fetching inventory and posts from Supabase...");
  
  // 1. Fetch available, sold watches and posts using publicClient
  const { data: rawWatches, error: wErr } = await publicClient
    .from("watches")
    .select("id, slug, brand, model, reference, name, price, status, condition_label, description, provenance, primary_image")
    .eq("published", true);

  if (wErr) {
    console.error("Failed to fetch watches:", wErr.message);
    process.exit(1);
  }

  const { data: rawPosts, error: pErr } = await publicClient
    .from("journal_posts")
    .select("slug, title, summary, body_markdown")
    .eq("status", "published")
    .limit(2);

  if (pErr) {
    console.error("Failed to fetch journal posts:", pErr.message);
    process.exit(1);
  }

  const available = rawWatches.filter(w => ["available", "reserved"].includes(w.status)).slice(0, 4);
  const sold = rawWatches.filter(w => w.status === "sold").slice(0, 2);

  // Normalize mappings
  const availablePayload = available.map(w => ({
    id: w.id,
    brand: w.brand,
    name: w.name,
    reference: w.reference || "",
    price: w.price,
    conditionLabel: w.condition_label || "Excellent",
    description: w.description || "",
    provenance: w.provenance || "",
  }));

  const soldPayload = sold.map(w => ({
    id: w.id,
    brand: w.brand,
    name: w.name,
    reference: w.reference || "",
    conditionLabel: w.condition_label || "Excellent",
    description: w.description || "",
  }));

  const postsPayload = rawPosts.map(p => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary || "",
    content: p.body_markdown || "",
  }));

  console.log(`Fetched ${available.length} available watches, ${sold.length} sold watches, and ${rawPosts.length} posts.`);

  // 2. Loop over themes and generate dispatches
  for (let tIdx = 0; tIdx < THEMES.length; tIdx++) {
    const theme = THEMES[tIdx];
    
    try {
      const aiDraft = await generateThemedDraft(theme, availablePayload, soldPayload, postsPayload);
      
      const title = `The Alley Dispatch - ${theme.name}`;
      const slug = slugify(`${title}-${Date.now()}`);

      const featured = available.slice(0, 3);
      const soldHighlight = sold[0];
      const journal = rawPosts[0];

      const items = [];

      // Map watches to items
      for (let i = 0; i < featured.length; i++) {
        const watch = featured[i];
        const aiWatch = aiDraft.watches.find(w => w.id === watch.id) || {
          headline: `${watch.brand} ${watch.name}`,
          copy: watch.description || `${watch.brand} ${watch.reference || watch.model}`.trim(),
        };
        items.push({
          itemType: "available_watch",
          itemId: watch.id,
          title: aiWatch.headline,
          summary: aiWatch.copy,
          url: `/watch/${watch.slug}`,
          imageUrl: watch.primary_image || "",
          position: i,
        });
      }

      // Map sold highlight to item
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
          imageUrl: soldHighlight.primary_image || "",
          position: 10,
        });
      }

      // Map journal to item
      if (journal) {
        items.push({
          itemType: "journal_post",
          itemId: journal.slug,
          title: journal.title,
          summary: journal.summary || "",
          url: `/journal/${journal.slug}`,
          imageUrl: "",
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

      // Construct bodyHtml with premium styles
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
                ${watch.primary_image ? `
                <div style="margin-bottom: 20px; text-align: center;">
                  <a href="/watch/${watch.slug}" style="text-decoration: none;">
                    <img src="${watch.primary_image}" alt="${escapeHtml(watch.brand)} ${escapeHtml(watch.name)}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid rgba(189, 154, 50, 0.15);" width="520" />
                  </a>
                </div>
                ` : ''}
                <h3 style="font-family: 'Petrona', Georgia, serif; font-size: 22px; font-weight: normal; margin: 0 0 8px 0; color: #F1ECE0; line-height: 1.3;">
                  <a href="/watch/${watch.slug}" style="color: #F1ECE0; text-decoration: none;">${escapeHtml(item?.title || `${watch.brand} ${watch.name}`)}</a>
                </h3>
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; letter-spacing: 0.1em; color: #BD9A32; text-transform: uppercase; margin-bottom: 12px; font-weight: bold;">
                  Ref: ${escapeHtml(watch.reference || 'N/A')} · ${escapeHtml(watch.condition_label || 'Excellent')} · ₱${watch.price ? watch.price.toLocaleString('en-PH') : 'Inquire'}
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
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; letter-spacing: 0.2em; color: #BD9A32; text-transform: uppercase; margin-bottom: 20px; font-weight: bold; text-align: center;">— From the Sold Archive —</div>
            ${soldHighlight.primary_image ? `
            <div style="margin-bottom: 20px; text-align: center;">
              <a href="/watch/${soldHighlight.slug}" style="text-decoration: none; opacity: 0.85;">
                <img src="${soldHighlight.primary_image}" alt="${escapeHtml(soldHighlight.brand)} ${escapeHtml(soldHighlight.name)}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid rgba(189, 154, 50, 0.15); filter: grayscale(20%);" width="520" />
              </a>
            </div>
            ` : ''}
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
        ...featured.map(w => {
          const item = items.find(it => it.itemId === w.id && it.itemType === "available_watch");
          return `${item.title}: https://www.thewatchalley.com/watch/${w.slug}\n${item.summary}`;
        }),
        soldHighlight ? `Sold Highlight: ${soldHighlight.brand} ${soldHighlight.name}\n${items.find(it => it.itemType === "sold_watch").summary}` : "",
        aiDraft.collectorNote ? `${aiDraft.collectorNote.title}\n${aiDraft.collectorNote.bodyHtml.replace(/<[^>]*>/g, "")}` : ""
      ].filter(Boolean).join("\n\n");

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
          generatedBy: "scripts/generate-5-drafts.js",
          theme: theme.name,
          availableCount: available.length,
          soldCount: sold.length,
          modelUsed: "gemini-3.5-flash",
        },
        items
      };

      console.log(`Saving issue to database...`);
      const { data, error } = await adminClient.rpc("admin_upsert_newsletter_issue", { payload });
      if (error) {
        throw new Error(error.message);
      }

      const issue = data;
      const issueId = issue?.issue?.id;

      console.log(`Successfully created issue: "${aiDraft.issueTitle}" (ID: ${issueId})`);

      // Log AI run
      await adminClient.rpc("admin_log_ai_generation_run", {
        payload: {
          issueId,
          runType: "full_issue",
          model: "gemini-3.5-flash",
          promptVersion: "watch-list-ai-v1-script",
          inputPayload: { theme: theme.name },
          outputPayload: { slug, itemCount: items.length },
          status: "completed"
        }
      });
      
    } catch (err) {
      console.error(`Failed to generate draft for theme: ${theme.name}:`, err.message);
    }
  }

  console.log("\nDraft generation completed!");
}

main().catch(err => {
  console.error("Error running generation script:", err);
  process.exit(1);
});
