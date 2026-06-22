import { z } from "zod";
import { WATCH_LIST_CONSENT_TEXT, WATCH_LIST_CONSENT_VERSION } from "./constants";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));
const positiveInt = z
  .union([z.number().int().nonnegative(), z.string().trim()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") return undefined;
    const parsed = typeof value === "number" ? value : Number(value.replace(/[^\d]/g, ""));
    return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : undefined;
  });
const stringList = z.array(z.string().trim().min(1).max(80)).max(12).optional().default([]);

export const watchListMetaSchema = z.object({
  source: z.string().trim().min(1).max(80).default("website"),
  sourcePath: optionalText(300),
  userAgent: optionalText(512),
  ipHash: optionalText(128),
  utm: z.record(z.string(), z.string().max(160)).optional().default({}),
  website: z.string().trim().max(0).optional().default(""),
  formStartedAt: z.number().optional(),
});

export const consentSchema = z.object({
  consentAccepted: z.literal(true),
  consentText: z.string().trim().min(20).max(1000).default(WATCH_LIST_CONSENT_TEXT),
  consentVersion: z.string().trim().min(1).max(80).default(WATCH_LIST_CONSENT_VERSION),
});

export const preferencesSchema = z
  .object({
    brands: stringList,
    categories: stringList,
    budgetMinPhp: positiveInt,
    budgetMaxPhp: positiveInt,
    wristSize: optionalText(80),
    purchaseIntent: z
      .enum(["just-browsing", "ready-now", "next-30-days", "next-90-days", "specific-reference"])
      .optional(),
    notes: optionalText(2000),
  })
  .optional();

export const signupSchema = z
  .object({
    email: emailSchema,
    firstName: optionalText(120),
    country: optionalText(100),
    whatsApp: optionalText(32),
    preferences: preferencesSchema,
  })
  .merge(consentSchema)
  .merge(watchListMetaSchema);

export const alertSchema = z
  .object({
    email: emailSchema,
    firstName: optionalText(120),
    watchId: optionalText(120),
    watchSlug: optionalText(180),
    watchTitle: z.string().trim().min(1).max(260),
    brand: optionalText(120),
    reference: optionalText(120),
    alertType: z.enum(["similar-watch", "price-drop", "availability"]).default("similar-watch"),
    notes: optionalText(2000),
    metadata: z
      .record(z.string(), z.string().or(z.number()).or(z.boolean()).or(z.null()))
      .optional(),
  })
  .merge(consentSchema)
  .merge(watchListMetaSchema);

export const sourcingSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: emailSchema,
    firstName: optionalText(120),
    phone: optionalText(32),
    preferredContact: z.enum(["email", "messenger", "viber", "whatsapp", "sms"]).default("email"),
    brands: stringList,
    reference: optionalText(240),
    budgetMinPhp: positiveInt,
    budgetMaxPhp: positiveInt,
    timeline: z.enum(["now", "30-days", "90-days", "patient"]).optional(),
    conditionPreference: z.enum(["brand-new", "pre-owned", "either"]).optional(),
    wristSize: optionalText(80),
    notes: z.string().trim().min(10).max(4000),
    metadata: z
      .record(z.string(), z.string().or(z.number()).or(z.boolean()).or(z.null()))
      .optional(),
  })
  .merge(consentSchema)
  .merge(watchListMetaSchema)
  .superRefine((value, ctx) => {
    if (
      value.budgetMinPhp !== undefined &&
      value.budgetMaxPhp !== undefined &&
      value.budgetMinPhp > value.budgetMaxPhp
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["budgetMaxPhp"],
        message: "Maximum budget must be higher than minimum budget.",
      });
    }
  });

export type WatchListSignupInput = z.infer<typeof signupSchema>;
export type WatchListAlertInput = z.infer<typeof alertSchema>;
export type SourcingRequestInput = z.infer<typeof sourcingSchema>;
