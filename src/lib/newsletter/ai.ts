import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { sanitizeNewsletterHtml } from "@/lib/newsletter/html";

const aiDraftResponseSchema = z.object({
  subject: z.string().trim().min(1).max(80),
  preheader: z.string().trim().min(1).max(140),
  issueTitle: z.string().trim().min(1).max(160),
  introHtml: z.string().trim().max(4000),
  watches: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        headline: z.string().trim().min(1).max(180),
        copy: z.string().trim().min(1).max(800),
      })
    )
    .max(8),
  soldHighlight: z
    .object({
      id: z.string().trim().min(1),
      headline: z.string().trim().min(1).max(180),
      copy: z.string().trim().min(1).max(800),
    })
    .optional(),
  collectorNote: z
    .object({
      title: z.string().trim().min(1).max(180),
      bodyHtml: z.string().trim().max(6000),
    })
    .optional(),
});

interface WatchData {
  id: string;
  brand: string;
  name: string;
  model?: string;
  reference: string;
  price: number;
  conditionLabel: string;
  material?: string;
  movement?: string;
  caseSize?: string;
  category?: string | null;
  badges?: string[];
  description?: string;
  provenance?: string;
}

interface PostData {
  slug: string;
  title: string;
  summary?: string;
  content?: string;
}

interface AiDraftResponse {
  subject: string;
  preheader: string;
  issueTitle: string;
  introHtml: string;
  watches: {
    id: string;
    headline: string;
    copy: string;
  }[];
  soldHighlight?: {
    id: string;
    headline: string;
    copy: string;
  };
  collectorNote?: {
    title: string;
    bodyHtml: string;
  };
  research?: NewsletterResearchContext;
}

interface NewsletterResearchContext {
  enabled: boolean;
  summary?: string;
  queries?: string[];
  citations?: { title: string; url: string }[];
  error?: string;
}

function normalizeDashCharacters(value: string): string {
  return value
    .replace(/([0-9])\s*[\u2013]\s*([0-9])/g, "$1-$2")
    .replace(/\s*[\u2013\u2014\u2015]\s*/g, " - ");
}

function normalizeDraftText(value: string): string {
  return normalizeDashCharacters(value).replace(/\s+/g, " ").trim();
}

function normalizeDraftHtml(value: string): string {
  return normalizeDashCharacters(value).trim();
}

function sanitizeAiDraft(draft: AiDraftResponse): AiDraftResponse {
  return {
    ...draft,
    subject: normalizeDraftText(draft.subject),
    preheader: normalizeDraftText(draft.preheader),
    issueTitle: normalizeDraftText(draft.issueTitle),
    introHtml: sanitizeNewsletterHtml(normalizeDraftHtml(draft.introHtml)),
    watches: draft.watches.map((watch) => ({
      ...watch,
      headline: normalizeDraftText(watch.headline),
      copy: normalizeDraftText(watch.copy),
    })),
    soldHighlight: draft.soldHighlight
      ? {
          ...draft.soldHighlight,
          headline: normalizeDraftText(draft.soldHighlight.headline),
          copy: normalizeDraftText(draft.soldHighlight.copy),
        }
      : undefined,
    collectorNote: draft.collectorNote
      ? {
          ...draft.collectorNote,
          title: normalizeDraftText(draft.collectorNote.title),
          bodyHtml: sanitizeNewsletterHtml(normalizeDraftHtml(draft.collectorNote.bodyHtml)),
        }
      : undefined,
  };
}

function extractInteractionText(interaction: unknown): string {
  const payload = interaction as {
    output_text?: unknown;
    outputText?: unknown;
    steps?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: unknown }>;
    }>;
  };

  if (typeof payload.output_text === "string") return payload.output_text;
  if (typeof payload.outputText === "string") return payload.outputText;

  return (
    payload.steps
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? [])
      .filter((content) => content.type === "text" && typeof content.text === "string")
      .map((content) => content.text as string)
      .join("\n\n") ?? ""
  );
}

function extractInteractionCitations(interaction: unknown): NewsletterResearchContext["citations"] {
  const payload = interaction as {
    steps?: Array<{
      type?: string;
      content?: Array<{
        type?: string;
        annotations?: Array<{ type?: string; title?: string; url?: string }>;
      }>;
    }>;
  };
  const seen = new Set<string>();
  const citations: { title: string; url: string }[] = [];

  for (const step of payload.steps ?? []) {
    if (step.type !== "model_output") continue;
    for (const content of step.content ?? []) {
      if (content.type !== "text") continue;
      for (const annotation of content.annotations ?? []) {
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

function extractInteractionQueries(interaction: unknown): string[] {
  const payload = interaction as {
    steps?: Array<{ type?: string; arguments?: { queries?: unknown } }>;
  };
  const queries = new Set<string>();

  for (const step of payload.steps ?? []) {
    if (step.type !== "google_search_call" || !Array.isArray(step.arguments?.queries)) continue;
    for (const query of step.arguments.queries) {
      if (typeof query === "string" && query.trim()) queries.add(query.trim());
    }
  }

  return [...queries].slice(0, 8);
}

async function generateNewsletterResearchContext(
  ai: GoogleGenAI,
  payload: {
    available: WatchData[];
    sold: WatchData[];
    posts: PostData[];
  }
): Promise<NewsletterResearchContext> {
  if (process.env.NEWSLETTER_ENABLE_WEB_RESEARCH !== "true") {
    return { enabled: false, error: "NEWSLETTER_ENABLE_WEB_RESEARCH is not enabled." };
  }

  const researchTargets = [...payload.available.slice(0, 6), ...payload.sold.slice(0, 3)].map(
    (watch) => ({
      brand: watch.brand,
      name: watch.name,
      reference: watch.reference,
      movement: watch.movement || "",
      category: watch.category || "",
    })
  );

  try {
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: `Research concise, source-grounded context for a Watch Alley newsletter.

Use Google Search for verifiable external context only. Do not change product facts, pricing, condition, inclusions, or availability because those must come from the database.

Return a short research brief with:
- 3 to 6 externally verifiable context notes about the brands, references, movements, collections, or current collector interest represented here.
- Notes that can help connect the editorial angle to available inventory.
- No em dashes or en dashes. Use commas, colons, parentheses, or a simple hyphen.

Recent journal themes:
${JSON.stringify(payload.posts.slice(0, 2), null, 2)}

Inventory research targets:
${JSON.stringify(researchTargets, null, 2)}`,
      tools: [{ type: "google_search" }],
    });

    const summary = normalizeDashCharacters(extractInteractionText(interaction)).trim();
    return {
      enabled: Boolean(summary),
      summary: summary || undefined,
      queries: extractInteractionQueries(interaction),
      citations: extractInteractionCitations(interaction),
    };
  } catch (error) {
    return {
      enabled: false,
      error: error instanceof Error ? error.message : "Research grounding failed.",
    };
  }
}

export async function generateNewsletterDraftAI(payload: {
  available: WatchData[];
  sold: WatchData[];
  posts: PostData[];
}): Promise<AiDraftResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not configured in the environment.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const research = await generateNewsletterResearchContext(ai, payload);

  const systemInstruction = `You are the editorial and commerce assistant for The Watch Alley, a Manila-based curated watch reseller and collector desk.
Your job is to draft a newsletter issue for "The Watch List by The Watch Alley".

Tone:
- Collector-first, knowledgeable, sophisticated
- Warm but premium, conversational, never hypey or spammy
- Helpful for watch buyers in the Philippines
- Write in The Watch Alley's direct editorial voice: clear, grounded, personal, and practical.
- Never use em dashes or en dashes. Use commas, parentheses, colons, semicolons, or a simple hyphen.

Curating & Matching Inventory:
- Look at the "Recent Journal Posts" (usually the first post represents the main weekly article). Identify its main themes, topics, design elements, brands, era, styles, materials (e.g., gold, steel), or movements discussed.
- From the "Available Inventory" and "Sold Highlights", carefully select watches that relate conceptually or direct-thematically to those topics. For example:
  * If the article discusses chronographs, select chronograph models.
  * If the article talks about dress watches, elegant simplicity, or precious metals, highlight gold or dressier references.
  * If the article is about a specific brand (e.g. Rolex, Cartier, Omega), prioritize matching references from that brand.
  * If the article discusses Japanese watchmaking or vintage watches, highlight Grand Seiko, Seiko, or other matching vintage pieces.
- Select up to 3 available watches for "watches". These should be the most matching and interesting items from the available inventory. Do not just select the first few.
- Select exactly 1 sold watch for "soldHighlight" that fits the theme or acts as a great historical showcase of what clients look for.
- Do not select watches at random. Discuss in the introHtml and collectorNote how these watches relate to the week's theme/article, making the newsletter feel like a cohesive, curated dispatch.

Factual constraint:
- Do not invent specs, condition, price, inclusions, or availability. Use only the provided data.
- Do not claim a watch is rare unless source data explicitly says so.
- Product-card facts must come from the database payload only: brand, model/name, reference, price, availability, condition, inclusions, movement/specs, service history, product URL, and product image.
- External research may only provide broad historical, brand, collection, or market context. Do not use it to override database product facts.
- If a claim is not supported by either the database payload or the web research notes, do not make the claim.
- Link URLs should use the canonical path format: "/watch/[slug]" for watches, "/journal/[slug]" for journal posts.

Format:
Return a valid JSON object matching this schema:
{
  "subject": "A compelling email subject line under 80 characters",
  "preheader": "An engaging email preheader under 140 characters",
  "issueTitle": "Public title for the newsletter issue",
  "introHtml": "HTML paragraph(s) introducing this week's dispatch. Set the mood, link/reference the main journal post topic/theme, and explain how the curated watch selections relate to it. Keep formatting simple (p, strong, em only).",
  "watches": [
    {
      "id": "watch-id",
      "headline": "A short, catchy line about this watch",
      "copy": "1-2 sentences highlighting why a collector should care about this specific watch (provenance, design details, movement, value)."
    }
  ],
  "soldHighlight": {
    "id": "watch-id",
    "headline": "Sourcing highlight catchphrase",
    "copy": "A note about this sold piece, reinforcing sourcing demand: how fast it sold, its historical value, and inviting readers to request similar pieces."
  },
  "collectorNote": {
    "title": "A title for the collector note / editorial section",
    "bodyHtml": "HTML content for a short educational essay or discussion inspired by the recent journal post."
  }
}`;

  const userPrompt = `Generate a newsletter draft based on the following fresh content:

### Available Inventory:
${JSON.stringify(
  payload.available.map((w) => ({
    id: w.id,
    brand: w.brand,
    name: w.name,
    model: w.model || "",
    reference: w.reference,
    pricePhp: w.price,
    condition: w.conditionLabel,
    material: w.material || "",
    movement: w.movement || "",
    caseSize: w.caseSize || "",
    category: w.category || "",
    badges: w.badges || [],
    description: w.description || "",
    provenance: w.provenance || "",
  })),
  null,
  2
)}

### Sold Highlights:
${JSON.stringify(
  payload.sold.map((w) => ({
    id: w.id,
    brand: w.brand,
    name: w.name,
    model: w.model || "",
    reference: w.reference,
    condition: w.conditionLabel,
    material: w.material || "",
    movement: w.movement || "",
    caseSize: w.caseSize || "",
    badges: w.badges || [],
    description: w.description || "",
  })),
  null,
  2
)}

### Recent Journal Posts:
${JSON.stringify(
  payload.posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary || "",
    content: p.content || "",
  })),
  null,
  2
)}

### Optional Web Research Notes:
${research.enabled ? research.summary : "No web research context is available. Use database and journal content only."}
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

  try {
    return {
      ...sanitizeAiDraft(aiDraftResponseSchema.parse(JSON.parse(response.text))),
      research,
    };
  } catch {
    console.error("Failed to parse Gemini JSON output:", response.text);
    throw new Error("Gemini returned invalid newsletter JSON output.");
  }
}
