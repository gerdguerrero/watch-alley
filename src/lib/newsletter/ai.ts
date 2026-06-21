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
  reference: string;
  price: number;
  conditionLabel: string;
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
}

function sanitizeAiDraft(draft: AiDraftResponse): AiDraftResponse {
  return {
    ...draft,
    introHtml: sanitizeNewsletterHtml(draft.introHtml),
    collectorNote: draft.collectorNote
      ? {
          ...draft.collectorNote,
          bodyHtml: sanitizeNewsletterHtml(draft.collectorNote.bodyHtml),
        }
      : undefined,
  };
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

  const systemInstruction = `You are the editorial and commerce assistant for The Watch Alley, a Manila-based curated watch reseller and collector desk.
Your job is to draft a newsletter issue for "The Watch List by The Watch Alley".

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
  "subject": "A compelling email subject line under 80 characters",
  "preheader": "An engaging email preheader under 140 characters",
  "issueTitle": "Public title for the newsletter issue",
  "introHtml": "HTML paragraph(s) introducing this week's dispatch. Set the mood, mention watch collecting themes, or share a brief collector observation. Keep formatting simple (p, strong, em only).",
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
    reference: w.reference,
    pricePhp: w.price,
    condition: w.conditionLabel,
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
    reference: w.reference,
    condition: w.conditionLabel,
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
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
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
    return sanitizeAiDraft(aiDraftResponseSchema.parse(JSON.parse(response.text)));
  } catch {
    console.error("Failed to parse Gemini JSON output:", response.text);
    throw new Error("Gemini returned invalid newsletter JSON output.");
  }
}
