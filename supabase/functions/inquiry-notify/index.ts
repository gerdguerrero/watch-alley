// inquiry-notify: server-side notification fan-out for new buyer inquiries.
//
// Triggered by a Supabase Database Webhook that fires on INSERT into
// watch_alley.inquiries. The dashboard webhook posts a Supabase-standard
// payload of shape:
//   {
//     "type": "INSERT",
//     "table": "inquiries",
//     "schema": "watch_alley",
//     "record": { ...the new row... },
//     "old_record": null
//   }
//
// What this function does:
//   1. Verifies a shared-secret header (configured in the dashboard webhook
//      as `x-watch-alley-secret: <INQUIRY_NOTIFY_SECRET>`). The function is
//      deployed with verify_jwt=false because the webhook can't carry a JWT;
//      the secret header is the only auth boundary.
//   2. Loads the referenced watch (brand, model, reference, slug) so the
//      email reads as a real piece, not just an inquiry id.
//   3. Sends a heritage-craft email to OWNER_EMAIL via Resend.
//   4. Optionally POSTs a short summary to VIBER_WEBHOOK_URL or
//      SLACK_WEBHOOK_URL if either env var is set.
//   5. Records every fan-out attempt in watch_alley.notification_log so
//      retries are observable and idempotent at the inquiry+channel level.
//
// Required env (set via Supabase dashboard → Edge Functions → secrets):
//   SUPABASE_URL                  injected automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY     injected automatically by Supabase
//   INQUIRY_NOTIFY_SECRET         shared secret with the database webhook
//   RESEND_API_KEY                Resend API key
//   OWNER_EMAIL                   destination address (e.g. hello@watchalley.ph)
//   FROM_EMAIL                    sender, must be a Resend-verified domain
//                                   (e.g. The Watch Alley <inquiries@watchalley.ph>)
//
// Optional env (any can be left unset):
//   VIBER_WEBHOOK_URL             generic Viber/Telegram bot webhook URL
//   SLACK_WEBHOOK_URL             Slack incoming webhook for #inquiries channel
//   SITE_ORIGIN                   override for share links (default: https://watchalley.ph)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const INQUIRY_NOTIFY_SECRET = Deno.env.get('INQUIRY_NOTIFY_SECRET') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'The Watch Alley <inquiries@watchalley.ph>';
const VIBER_WEBHOOK_URL = Deno.env.get('VIBER_WEBHOOK_URL') || '';
const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL') || '';
const SITE_ORIGIN = Deno.env.get('SITE_ORIGIN') || 'https://watchalley.ph';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-watch-alley-secret',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

interface InquiryRecord {
  id: string;
  watch_id: string | null;
  watch_slug: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_channel: string | null;
  message: string;
  source: string | null;
  status: string;
  created_at: string;
}

interface WatchRecord {
  id: string | null;
  slug: string | null;
  brand: string | null;
  model: string | null;
  reference: string | null;
  name: string | null;
  price: number | null;
  status: string | null;
  primary_image: string | null;
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]!));
}

function formatPhp(price: number | null): string {
  if (typeof price !== 'number' || !Number.isFinite(price)) return '';
  return `₱ ${price.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

function buildEmailHtml(inquiry: InquiryRecord, watch: WatchRecord | null): string {
  // Heritage atelier tone — paper background, walnut ink, gold rule. Inline
  // styles only (mail clients don't honor <style>). Petrona/Spectral fall
  // back to Georgia, JetBrains Mono falls back to Menlo.
  const watchLabel = watch && (watch.brand || watch.name)
    ? `${watch.brand ?? ''}${watch.brand && watch.name ? ' — ' : ''}${watch.name ?? ''}`
    : 'a piece in the catalog';
  const watchRef = watch?.reference ? `Ref ${watch.reference}` : '';
  const priceLine = watch?.price ? formatPhp(Number(watch.price)) : '';
  const watchUrl = watch?.slug ? `${SITE_ORIGIN}/watch/${watch.slug}` : '';
  const channel = inquiry.buyer_channel ? inquiry.buyer_channel.toUpperCase() : 'EMAIL';
  const refId = inquiry.id.slice(0, 8).toUpperCase();
  const subject = `Inquiry · ${watchLabel}${watchRef ? ` (${watchRef})` : ''}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#1a1814;font-family:Georgia,serif;color:#ece4d3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1814;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#f1ead7;color:#2c2620;border:1px solid rgba(201,162,75,0.45);">
        <tr><td style="padding:32px 36px 8px;">
          <div style="font-family:Menlo,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#9a7c2f;">
            Inquiry Nº TWA-${escapeHtml(refId)} · ${escapeHtml(channel)}
          </div>
        </td></tr>
        <tr><td style="padding:0 36px;">
          <hr style="border:none;border-top:1px solid rgba(120,86,36,0.30);margin:14px 0;">
        </td></tr>
        <tr><td style="padding:4px 36px 0;">
          <div style="font-family:Georgia,serif;font-style:italic;font-size:24px;line-height:1.2;color:#2c2620;">
            ${escapeHtml(inquiry.buyer_name)} asked about ${escapeHtml(watchLabel)}.
          </div>
        </td></tr>
        ${watchRef || priceLine ? `<tr><td style="padding:8px 36px 0;">
          <div style="font-family:Georgia,serif;font-size:14px;color:#5a4a2a;">
            ${escapeHtml([watchRef, priceLine].filter(Boolean).join(' · '))}
          </div>
        </td></tr>` : ''}
        <tr><td style="padding:24px 36px 0;">
          <div style="font-family:Menlo,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#9a7c2f;">Message</div>
          <p style="font-family:Georgia,serif;font-size:15px;line-height:1.65;color:#2c2620;margin:6px 0 0;white-space:pre-wrap;">${escapeHtml(inquiry.message)}</p>
        </td></tr>
        <tr><td style="padding:24px 36px 0;">
          <div style="font-family:Menlo,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#9a7c2f;">Reply to</div>
          <div style="font-family:Georgia,serif;font-size:15px;color:#2c2620;margin-top:4px;">
            <a href="mailto:${escapeHtml(inquiry.buyer_email)}" style="color:#7a5a1a;text-decoration:underline;">${escapeHtml(inquiry.buyer_email)}</a>
            ${inquiry.buyer_phone ? ` · <a href="tel:${escapeHtml(inquiry.buyer_phone)}" style="color:#7a5a1a;text-decoration:underline;">${escapeHtml(inquiry.buyer_phone)}</a>` : ''}
          </div>
        </td></tr>
        ${watchUrl ? `<tr><td style="padding:24px 36px 0;">
          <div style="font-family:Menlo,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#9a7c2f;">Listing</div>
          <a href="${escapeHtml(watchUrl)}" style="font-family:Menlo,monospace;font-size:11px;letter-spacing:0.18em;color:#7a5a1a;text-decoration:none;border-bottom:1px solid #c9a24b;padding-bottom:2px;display:inline-block;margin-top:6px;">${escapeHtml(watchUrl.replace(/^https?:\/\//, ''))}</a>
        </td></tr>` : ''}
        <tr><td style="padding:32px 36px 32px;">
          <hr style="border:none;border-top:1px solid rgba(120,86,36,0.30);margin:0 0 14px;">
          <div style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#7a5a1a;">
            — Sent automatically when this inquiry was received. Reply directly to ${escapeHtml(inquiry.buyer_email)}.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return html;
}

function buildEmailText(inquiry: InquiryRecord, watch: WatchRecord | null): string {
  const watchLabel = watch && (watch.brand || watch.name)
    ? `${watch.brand ?? ''}${watch.brand && watch.name ? ' — ' : ''}${watch.name ?? ''}`
    : 'a piece in the catalog';
  const watchRef = watch?.reference ? `Ref ${watch.reference}` : '';
  const priceLine = watch?.price ? formatPhp(Number(watch.price)) : '';
  const watchUrl = watch?.slug ? `${SITE_ORIGIN}/watch/${watch.slug}` : '';
  const refId = inquiry.id.slice(0, 8).toUpperCase();

  return [
    `Inquiry Nº TWA-${refId}`,
    '',
    `${inquiry.buyer_name} asked about ${watchLabel}.`,
    [watchRef, priceLine].filter(Boolean).join(' · '),
    '',
    'Message:',
    inquiry.message,
    '',
    `Reply to: ${inquiry.buyer_email}${inquiry.buyer_phone ? ` · ${inquiry.buyer_phone}` : ''}`,
    inquiry.buyer_channel ? `Preferred channel: ${inquiry.buyer_channel}` : '',
    watchUrl ? `Listing: ${watchUrl}` : '',
  ].filter(Boolean).join('\n');
}

function buildShortMessage(inquiry: InquiryRecord, watch: WatchRecord | null): string {
  const watchLabel = watch && (watch.brand || watch.name)
    ? `${watch.brand ?? ''}${watch.brand && watch.name ? ' ' : ''}${watch.name ?? ''}`.trim()
    : 'a piece';
  const ref = watch?.reference ? ` (${watch.reference})` : '';
  const channel = inquiry.buyer_channel ? ` · prefers ${inquiry.buyer_channel}` : '';
  const refId = inquiry.id.slice(0, 8).toUpperCase();
  return `New inquiry · ${inquiry.buyer_name} on ${watchLabel}${ref}${channel} · TWA-${refId}`;
}

async function fetchWatch(client: ReturnType<typeof createClient>, watchId: string | null): Promise<WatchRecord | null> {
  if (!watchId) return null;
  const { data, error } = await client
    .from('watches')
    .select('id, slug, brand, model, reference, name, price, status, primary_image')
    .eq('id', watchId)
    .maybeSingle();
  if (error) {
    console.warn('[inquiry-notify] fetchWatch failed:', error.message);
    return null;
  }
  return data as WatchRecord | null;
}

async function logAttempt(
  client: ReturnType<typeof createClient>,
  inquiryId: string,
  channel: string,
  status: 'success' | 'failed' | 'skipped',
  detail: string | null,
) {
  // Best-effort: never throw out of here so a logging failure can't block
  // the rest of the fan-out.
  try {
    await client.from('notification_log').insert({
      inquiry_id: inquiryId,
      channel,
      status,
      detail,
    });
  } catch (error) {
    console.warn(`[inquiry-notify] log ${channel}/${status} failed:`, error);
  }
}

async function sendResendEmail(inquiry: InquiryRecord, watch: WatchRecord | null) {
  if (!RESEND_API_KEY) return { ok: false, status: 'skipped', detail: 'RESEND_API_KEY not configured' };
  if (!OWNER_EMAIL) return { ok: false, status: 'skipped', detail: 'OWNER_EMAIL not configured' };

  const watchLabel = watch && (watch.brand || watch.name)
    ? `${watch.brand ?? ''}${watch.brand && watch.name ? ' — ' : ''}${watch.name ?? ''}`
    : 'a piece';
  const subject = `Inquiry · ${watchLabel}${watch?.reference ? ` (${watch.reference})` : ''}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [OWNER_EMAIL],
      reply_to: inquiry.buyer_email,
      subject,
      html: buildEmailHtml(inquiry, watch),
      text: buildEmailText(inquiry, watch),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => 'unknown');
    return { ok: false, status: 'failed' as const, detail: `Resend ${response.status}: ${detail.slice(0, 240)}` };
  }
  const body = await response.json().catch(() => ({} as { id?: string }));
  return { ok: true, status: 'success' as const, detail: body?.id ? `resend:${body.id}` : 'sent' };
}

async function sendWebhook(url: string, payload: unknown, label: string) {
  if (!url) return { ok: false, status: 'skipped' as const, detail: `${label} webhook URL not configured` };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => 'unknown');
      return { ok: false, status: 'failed' as const, detail: `${label} ${response.status}: ${detail.slice(0, 240)}` };
    }
    return { ok: true, status: 'success' as const, detail: 'sent' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, status: 'failed' as const, detail: `${label} threw: ${message.slice(0, 240)}` };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // 1. Shared-secret check. The Database Webhook in the Supabase dashboard
  //    is configured with header `x-watch-alley-secret: <INQUIRY_NOTIFY_SECRET>`.
  if (!INQUIRY_NOTIFY_SECRET) {
    console.error('[inquiry-notify] INQUIRY_NOTIFY_SECRET is not configured.');
    return json({ error: 'Server misconfigured' }, 500);
  }
  const incomingSecret = req.headers.get('x-watch-alley-secret') || '';
  if (incomingSecret !== INQUIRY_NOTIFY_SECRET) {
    return json({ error: 'Forbidden' }, 403);
  }

  // 2. Parse and validate the webhook payload.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const payload = body as {
    type?: string;
    table?: string;
    schema?: string;
    record?: InquiryRecord;
  };

  if (payload?.type !== 'INSERT' || payload?.table !== 'inquiries') {
    // Tolerant: anything else is a no-op so the function is idempotent and
    // safe even if a misconfigured webhook fires on UPDATE.
    return json({ skipped: true, reason: `not an inquiries INSERT (got ${payload?.type}/${payload?.table})` });
  }

  const inquiry = payload.record;
  if (!inquiry || !inquiry.id) {
    return json({ error: 'Missing inquiry record' }, 400);
  }

  // Manually-logged inquiries (admin recorded a Messenger / walk-in / phone
  // conversation after the fact) are already in our hands. Don't email
  // ourselves about them. Also bail early if there's no buyer_email — the
  // Resend path has no destination and the row was probably logged manually.
  if (inquiry.source === 'admin-manual' || !inquiry.buyer_email) {
    return json({
      skipped: true,
      reason: inquiry.source === 'admin-manual' ? 'admin-manual source' : 'no buyer_email',
      inquiryId: inquiry.id,
    });
  }

  // 3. Service-role client for downstream lookups + audit log.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const watch = await fetchWatch(adminClient, inquiry.watch_id);
  const shortMessage = buildShortMessage(inquiry, watch);

  // 4. Fan out. Each channel logs its own outcome; one failure never blocks
  //    the others.
  const results: Record<string, { ok: boolean; status: string; detail: string | null }> = {};

  const emailResult = await sendResendEmail(inquiry, watch);
  results.email = emailResult;
  await logAttempt(adminClient, inquiry.id, 'email', emailResult.status, emailResult.detail ?? null);

  if (VIBER_WEBHOOK_URL) {
    const viberResult = await sendWebhook(
      VIBER_WEBHOOK_URL,
      { text: shortMessage, inquiry_id: inquiry.id },
      'viber',
    );
    results.viber = viberResult;
    await logAttempt(adminClient, inquiry.id, 'viber', viberResult.status, viberResult.detail ?? null);
  }

  if (SLACK_WEBHOOK_URL) {
    const slackResult = await sendWebhook(
      SLACK_WEBHOOK_URL,
      { text: shortMessage },
      'slack',
    );
    results.slack = slackResult;
    await logAttempt(adminClient, inquiry.id, 'slack', slackResult.status, slackResult.detail ?? null);
  }

  const anySuccess = Object.values(results).some((r) => r.ok);
  return json({ inquiryId: inquiry.id, results }, anySuccess ? 200 : 502);
});
