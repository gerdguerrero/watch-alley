import "server-only";
import { createHmac } from "node:crypto";
import { Resend } from "resend";
import { escapeHtml, sanitizeNewsletterHtml } from "@/lib/newsletter/html";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createUnsubscribeToken } from "@/lib/watch-list/unsubscribe";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key");

function getFromEmail() {
  return process.env.NEWSLETTER_FROM_EMAIL || "The Watch Alley <newsletter@thewatchalley.com>";
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.thewatchalley.com").replace(/\/+$/, "");
}

function recipientHash(email: string) {
  const secret =
    process.env.WATCH_LIST_DELIVERY_HASH_SECRET ||
    process.env.WATCH_LIST_UNSUBSCRIBE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "watch-list";
  return createHmac("sha256", secret).update(email.trim().toLowerCase()).digest("hex");
}

function absoluteUrl(path: string) {
  if (/^https:\/\//i.test(path)) return path;
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function absolutizeUrls(html: string) {
  return html
    .replace(/\shref="\/([^"]*)"/g, (_match, path: string) => {
      return ` href="${absoluteUrl(`/${path}`)}"`;
    })
    .replace(/\ssrc="\/([^"]*)"/g, (_match, path: string) => {
      return ` src="${absoluteUrl(`/${path}`)}"`;
    });
}

function wrapHtmlEmail({
  subject,
  preheader,
  bodyHtml,
  unsubscribeUrl,
}: {
  subject: string;
  preheader: string;
  bodyHtml: string;
  unsubscribeUrl: string;
}) {
  const safeSubject = escapeHtml(subject);
  const safePreheader = escapeHtml(preheader);
  const safeBodyHtml = absolutizeUrls(sanitizeNewsletterHtml(bodyHtml));

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeSubject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Petrona:ital,wght@0,300..900;1,300..900&family=Spectral:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
    <style>
      @keyframes leftLegRotate {
        0% { transform: rotate(-360deg); }
        100% { transform: rotate(0deg); }
      }
      @keyframes rightLegRotate {
        0% { transform: rotate(-30deg); }
        100% { transform: rotate(0deg); }
      }
      @keyframes wordmarkFadeIn {
        0% { opacity: 0; transform: translateX(-18px); }
        100% { opacity: 1; transform: translateX(0); }
      }
      .wa-left-leg {
        transform-origin: 184.3px 35.4px;
        animation: leftLegRotate 1.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards;
      }
      .wa-right-leg {
        transform-origin: 184.3px 35.4px;
        animation: rightLegRotate 1.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards;
      }
      .wa-wordmark-the {
        animation: wordmarkFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.7s forwards;
        opacity: 0;
      }
      .wa-wordmark-watch-w {
        animation: wordmarkFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.8s forwards;
        opacity: 0;
      }
      .wa-wordmark-watch-tch {
        animation: wordmarkFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 1.1s forwards;
        opacity: 0;
      }
      .wa-wordmark-lley {
        animation: wordmarkFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 1.2s forwards;
        opacity: 0;
      }

      /* Only WebKit clients (like Apple Mail and iOS Mail) will parse and apply this media query.
         Gmail, Outlook, and Yahoo strip or ignore it, so they fall back to the static logo. */
      @media screen and (-webkit-min-device-pixel-ratio: 0) {
        .animated-logo {
          display: block !important;
        }
        .static-logo {
          display: none !important;
        }
      }

      body {
        background-color: #13110f;
        color: #F1ECE0;
        font-family: 'Spectral', Georgia, serif;
        margin: 0;
        padding: 0;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 40px 24px;
        background-color: #13110f;
      }
      .header {
        text-align: center;
        border-bottom: 1px solid rgba(189, 154, 50, 0.15);
        padding-bottom: 30px;
        margin-bottom: 40px;
      }
      .logo-link {
        display: inline-block;
        text-decoration: none;
      }
      .preheader {
        display: none;
        font-size: 1px;
        color: #13110f;
        line-height: 1px;
        max-height: 0px;
        max-width: 0px;
        opacity: 0;
        overflow: hidden;
      }
      .content {
        font-size: 16px;
        line-height: 1.8;
        color: #d1d1cd;
      }
      .content a {
        color: #BD9A32;
        text-decoration: none;
        border-bottom: 1px solid rgba(189, 154, 50, 0.3);
      }
      .content a:hover {
        border-bottom-color: rgba(189, 154, 50, 0.8);
      }
      .content h2 {
        font-family: 'Petrona', Georgia, serif;
        color: #F1ECE0;
        font-size: 22px;
        font-weight: normal;
        margin-top: 40px;
        margin-bottom: 20px;
        border-bottom: 1px solid rgba(189, 154, 50, 0.15);
        padding-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .content h3 {
        font-family: 'Petrona', Georgia, serif;
        color: #F1ECE0;
        font-size: 18px;
        font-weight: normal;
        margin-top: 24px;
        margin-bottom: 12px;
      }
      .content ul {
        padding-left: 20px;
        margin-bottom: 24px;
      }
      .footer {
        margin-top: 60px;
        border-top: 1px solid rgba(189, 154, 50, 0.15);
        padding-top: 30px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 11px;
        letter-spacing: 0.05em;
        color: rgba(241, 236, 224, 0.5);
        text-align: center;
        line-height: 1.8;
      }
      .footer a {
        color: #BD9A32;
        text-decoration: none;
        margin: 0 6px;
      }
    </style>
  </head>
  <body>
    <span class="preheader">${safePreheader}</span>
    <div class="container">
      <div class="header">
        <a href="https://www.thewatchalley.com" class="logo-link" style="display: block; text-decoration: none; text-align: center; margin: 0 auto; max-width: 140px;">
          <!-- Static Fallback Logo (Shown by default in restrictive clients like Gmail, Outlook, Yahoo) -->
          <img class="static-logo" src="${absoluteUrl("/brand/logo-gold.png")}" alt="The Watch Alley" style="height: 48px; width: auto; display: block; margin: 0 auto; border: 0;" />

          <!-- Animated Logo (Hidden by default, displayed via WebKit media queries in Apple Mail) -->
          <div class="animated-logo" style="display: none; width: 140px; height: 104px; margin: 0 auto; overflow: visible;">
            <svg class="overflow-visible" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 365" aria-hidden="true" style="width: 100%; height: 100%;">
              <g fill="none">
                <!-- THE wordmark -->
                <g class="wa-wordmark-the" fill="#BD9A32" style="opacity: 1;">
                  <path d="M 11.839844 3.554688 L 2.25 3.554688 L 2.25 0 L 25.269531 0 L 25.269531 3.554688 L 15.679688 3.554688 L 15.679688 35.09375 L 11.839844 35.09375 Z M 11.839844 3.554688 " />
                  <path d="M 62.890625 0 L 62.890625 35.09375 L 59.054688 35.09375 L 59.054688 18.15625 L 36.40625 18.15625 L 36.40625 35.09375 L 32.570312 35.09375 L 32.570312 0 L 36.40625 0 L 36.40625 14.597656 L 59.054688 14.597656 L 59.054688 0 Z M 62.890625 0 " />
                  <path d="M 95.878906 31.535156 L 95.878906 35.09375 L 73.464844 35.09375 L 73.464844 0 L 95.316406 0 L 95.316406 3.554688 L 77.117188 3.554688 L 77.117188 14.550781 L 94.335938 14.550781 L 94.335938 18.058594 L 77.117188 18.058594 L 77.117188 31.535156 Z M 95.878906 31.535156 " />
                </g>
                <!-- WATCH wordmark (minus A) -->
                <g class="wa-wordmark-watch-w" fill="#FFFFFF" style="opacity: 1;">
                  <path d="M 126.226562 47.417969 L 101.164062 104.085938 L 77.527344 54.339844 L 72.957031 54.339844 L 49.589844 103.695312 L 24.65625 47.417969 L 0.242188 47.417969 L 46.972656 147.042969 L 49.980469 147.042969 L 75.183594 93.378906 L 100.375 147.042969 L 103.378906 147.042969 L 149.992188 47.417969 Z M 126.226562 47.417969 " />
                </g>
                <g class="wa-wordmark-watch-tch" fill="#FFFFFF" style="opacity: 1;">
                  <path d="M 229.496094 47.417969 L 229.496094 67.269531 L 251.292969 67.269531 L 251.292969 117.15625 C 259.230469 121.398438 269.308594 136.628906 271.992188 145.34375 L 274.140625 145.34375 L 274.140625 67.269531 L 295.816406 67.269531 L 295.816406 47.417969 Z M 229.496094 47.417969 " />
                  <path d="M 357.179688 67.007812 C 363.839844 67.007812 369.320312 68.175781 374.152344 70.664062 L 374.152344 49.375 C 369.320312 47.027344 362.011719 45.980469 355.871094 45.980469 C 326.363281 45.980469 304.296875 67.660156 304.296875 96.644531 C 304.296875 125.625 326.363281 147.300781 355.738281 147.300781 C 361.882812 147.300781 369.320312 146.382812 374.152344 143.777344 L 374.152344 122.757812 C 369.320312 125.105469 363.839844 126.152344 357.179688 126.152344 C 339.941406 126.152344 327.152344 114.011719 327.152344 96.644531 C 327.152344 79.140625 339.941406 67.007812 357.179688 67.007812 " />
                  <path d="M 463.453125 47.417969 L 463.453125 83.84375 L 419.445312 83.84375 L 419.445312 47.417969 L 396.601562 47.417969 L 396.601562 145.34375 L 419.445312 145.34375 L 419.445312 104.605469 L 463.453125 104.605469 L 463.453125 145.34375 L 486.296875 145.34375 L 486.296875 47.417969 Z M 463.453125 47.417969 " />
                </g>
                <!-- Caliper / Compass A Graphic -->
                <g class="wa-compass" fill="#BD9A32">
                  <path class="wa-left-leg" d="M 191.316406 46.957031 C 184.949219 50.867188 176.585938 48.863281 172.675781 42.492188 C 168.765625 36.125 170.769531 27.761719 177.140625 23.851562 C 183.511719 19.941406 191.871094 21.945312 195.78125 28.316406 C 199.679688 34.683594 197.6875 43.046875 191.316406 46.957031 M 156.742188 177.445312 C 151.984375 177.457031 141.273438 176.902344 134.214844 172.058594 L 165.371094 70.074219 C 171.273438 68.796875 178.320312 72.902344 181.285156 74.882812 Z M 128.140625 296.972656 C 123.113281 299.347656 113.878906 305.222656 105.722656 318.625 C 105.761719 308.199219 104.003906 297.378906 98.742188 288.179688 L 130.957031 182.753906 C 135.433594 183.738281 149.511719 186.960938 153.839844 189.554688 Z M 208.542969 20.472656 C 200.304688 7.042969 182.722656 2.839844 169.296875 11.078125 C 155.867188 19.328125 151.664062 36.898438 159.902344 50.339844 C 160.957031 52.046875 162.164062 53.621094 163.492188 55.023438 L 91.992188 289.066406 C 92.261719 289.472656 92.53125 289.878906 92.777344 290.296875 C 108.332031 315.625 92.136719 357.800781 92.136719 357.800781 L 98.152344 359.941406 C 106.265625 308.691406 133.429688 301.523438 133.429688 301.523438 L 190.433594 63.261719 C 193.433594 62.597656 196.382812 61.429688 199.164062 59.71875 C 212.589844 51.484375 216.796875 33.910156 208.542969 20.472656 " />
                  <path class="wa-right-leg" d="M 244.535156 160.117188 C 236.46875 150.699219 233.835938 139.386719 236.691406 126.4375 C 241.289062 128.125 250.535156 132.625 255.578125 142.84375 C 259.328125 150.429688 260.066406 159.785156 257.8125 170.742188 C 255.058594 169.253906 249.402344 165.808594 244.535156 160.117188 M 254.925781 181.179688 C 253.472656 184.105469 253.152344 188.054688 253.992188 193.28125 C 250.167969 188.730469 245.371094 184.378906 239.566406 181.402344 C 241.191406 174.847656 241.460938 168.996094 240.832031 163.820312 C 247.019531 170.914062 254.078125 174.75 256.546875 175.957031 C 256.070312 177.664062 255.539062 179.410156 254.925781 181.179688 M 234.734375 179.152344 C 224.566406 174.039062 217.976562 167.101562 215.109375 158.542969 C 211.730469 148.398438 214.507812 138.527344 215.714844 135.550781 C 218.738281 137.371094 223.015625 140.417969 226.851562 144.847656 C 235.117188 154.375 237.773438 165.910156 234.734375 179.152344 M 205.101562 104.257812 L 219.648438 97.285156 L 230.921875 122.761719 L 231.746094 124.691406 C 230.320312 130.851562 230.097656 136.386719 230.6875 141.292969 L 230.652344 141.253906 C 225.328125 135.179688 219.363281 131.492188 216.15625 129.796875 Z M 190.148438 69.71875 L 204.621094 63.285156 L 217.542969 92.503906 L 203.023438 99.460938 Z M 178.75 52.21875 C 169.503906 49.132812 164.476562 39.113281 167.550781 29.851562 C 170.625 20.59375 180.65625 15.566406 189.917969 18.640625 C 199.164062 21.714844 204.203125 31.746094 201.117188 41.003906 C 198.042969 50.265625 188.011719 55.292969 178.75 52.21875 M 259.734375 183.257812 C 275.71875 137.0625 245.199219 123.746094 237.425781 121.164062 C 236.332031 120.808594 235.695312 120.648438 235.695312 120.648438 L 205.816406 53.066406 C 207.941406 50.484375 209.652344 47.472656 210.769531 44.09375 C 215.625 29.484375 207.722656 13.707031 193.101562 8.851562 C 178.492188 3.996094 162.71875 11.902344 157.859375 26.519531 C 153.003906 41.128906 160.910156 56.90625 175.53125 61.761719 C 177.535156 62.425781 179.5625 62.855469 181.566406 63.050781 L 211.519531 132.230469 C 209.824219 135.023438 197.734375 167.753906 234.355469 184.769531 C 252.488281 191.878906 261.035156 215.402344 261.035156 215.402344 L 265.734375 213.1875 C 265.734375 213.1875 255.636719 190.527344 259.734375 183.257812 " />
                </g>
                <!-- LLEY wordmark -->
                <g class="wa-wordmark-lley" fill="#BD9A32" style="opacity: 1;">
                  <path d="M 318.738281 216.417969 L 318.738281 222.9375 L 286.738281 222.9375 L 286.738281 158.59375 L 293.773438 158.59375 L 293.773438 216.417969 Z M 318.738281 216.417969 " />
                  <path d="M 365.328125 216.417969 L 365.328125 222.9375 L 333.328125 222.9375 L 333.328125 158.59375 L 340.363281 158.59375 L 340.363281 216.417969 Z M 365.328125 216.417969 " />
                  <path d="M 421.007812 216.417969 L 421.007812 222.9375 L 379.914062 222.9375 L 379.914062 158.59375 L 419.976562 158.59375 L 419.976562 165.113281 L 386.605469 165.113281 L 386.605469 185.273438 L 418.175781 185.273438 L 418.175781 191.707031 L 386.605469 191.707031 L 386.605469 216.417969 Z M 421.007812 216.417969 " />
                  <path d="M 461.417969 203.804688 L 461.417969 222.9375 L 454.296875 222.9375 L 454.296875 203.804688 L 429.503906 158.59375 L 437.226562 158.59375 L 457.902344 196.683594 L 478.664062 158.59375 L 486.296875 158.59375 Z M 461.417969 203.804688 " />
                </g>
              </g>
            </svg>
          </div>
        </a>
      </div>
      <div class="content">
        ${safeBodyHtml}
      </div>
      <div class="footer">
        <p style="margin: 0 0 10px 0;">© 2026 The Watch Alley PH. All rights reserved.</p>
        <p style="margin: 0 0 15px 0;">Manila, Philippines</p>
        <p style="margin: 0;">
          You received this email because you are on The Watch List.
        </p>
        <p style="margin: 10px 0 0 0; font-family: monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;">
          <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a> · 
          <a href="${absoluteUrl("/watch-list/archive")}">View Online Archive</a>
        </p>
      </div>
    </div>
  </body>
</html>`;
}

function buildUnsubscribeUrl(email: string) {
  return absoluteUrl(`/api/watch-list/unsubscribe?token=${createUnsubscribeToken(email)}`);
}

async function deliveryAlreadySent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  {
    issueId,
    hash,
  }: {
    issueId: string;
    hash: string;
  }
) {
  const { data, error } = await supabase.rpc("service_check_delivery_sent", {
    p_issue_id: issueId,
    p_recipient_hash: hash,
  });

  if (error) throw new Error(`Failed to check delivery log: ${error.message}`);
  return Boolean(data);
}

async function logDeliveryEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  payload: {
    issueId: string;
    hash: string;
    status: "sending" | "sent" | "failed" | "skipped";
    providerMessageId?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.rpc("service_log_delivery_event", {
    p_issue_id: payload.issueId,
    p_recipient_hash: payload.hash,
    p_provider: "resend",
    p_provider_message_id: payload.providerMessageId ?? null,
    p_status: payload.status,
    p_error_message: payload.errorMessage ?? null,
    p_metadata: payload.metadata || {},
  });

  if (error && payload.status !== "sent") {
    console.error("Failed to write newsletter delivery event:", error.message);
  }
  if (error && payload.status === "sent") {
    throw new Error(`Failed to confirm delivery log: ${error.message}`);
  }
}

export async function sendTestEmail(issueId: string, recipient: string) {
  const supabase = createSupabaseAdminClient();

  // 1. Fetch issue
  const { data, error: issueError } = await supabase.rpc("admin_get_newsletter_issue", {
    issue_id: issueId,
  });

  if (issueError || !data || !data.issue) {
    throw new Error(issueError?.message || "Newsletter issue not found.");
  }
  const issue = data.issue;

  const html = wrapHtmlEmail({
    subject: issue.subject,
    preheader: issue.preheader || "",
    bodyHtml: issue.body_html || "",
    unsubscribeUrl: absoluteUrl("/watch-list/unsubscribe"),
  });
  const from = getFromEmail();

  // 2. Send via Resend
  const { data: sendData, error: sendError } = await resend.emails.send({
    from,
    to: recipient,
    subject: `[TEST] ${issue.subject}`,
    html,
    text: issue.body_text || "",
  });

  if (sendError) {
    console.error("Resend test send error:", sendError);
    throw new Error(sendError.message);
  }

  return sendData;
}

export async function sendNewsletterBroadcast(issueId: string) {
  const supabase = createSupabaseAdminClient();

  // 1. Fetch issue
  const { data, error: issueError } = await supabase.rpc("admin_get_newsletter_issue", {
    issue_id: issueId,
  });

  if (issueError || !data || !data.issue) {
    throw new Error(issueError?.message || "Newsletter issue not found.");
  }
  const issue = data.issue;

  // Double check status
  if (issue.status !== "approved" && issue.status !== "scheduled" && issue.status !== "sending") {
    throw new Error(`Cannot send newsletter issue with status: ${issue.status}`);
  }

  // 2. Update issue status to sending
  await supabase.rpc("service_update_newsletter_status", {
    issue_id: issueId,
    new_status: "sending",
  });

  // 3. Fetch active subscribers
  const { data: subscribers, error: subsError } = await supabase.rpc(
    "service_list_active_subscribers"
  );

  if (subsError) {
    throw new Error(`Failed to fetch subscribers: ${subsError.message}`);
  }

  const recipientCount = subscribers?.length || 0;
  if (recipientCount === 0) {
    // Revert status to approved
    await supabase.rpc("service_update_newsletter_status", {
      issue_id: issueId,
      new_status: "approved",
    });
    return { sent: 0, message: "No active subscribers found." };
  }

  const from = getFromEmail();
  const emails = (subscribers as { email: string }[]).map((s) => s.email);

  const errors: string[] = [];
  let sentCount = 0;

  for (const email of emails) {
    const hash = recipientHash(email);
    if (await deliveryAlreadySent(supabase, { issueId, hash })) {
      await logDeliveryEvent(supabase, {
        issueId,
        hash,
        status: "skipped",
        metadata: { reason: "already-sent" },
      });
      continue;
    }

    await logDeliveryEvent(supabase, { issueId, hash, status: "sending" });

    const unsubscribeUrl = buildUnsubscribeUrl(email);
    const html = wrapHtmlEmail({
      subject: issue.subject,
      preheader: issue.preheader || "",
      bodyHtml: issue.body_html || "",
      unsubscribeUrl,
    });

    const { data: sendData, error: sendError } = await resend.emails.send({
      from,
      to: email,
      subject: issue.subject,
      html,
      text: issue.body_text || "",
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (sendError) {
      await logDeliveryEvent(supabase, {
        issueId,
        hash,
        status: "failed",
        errorMessage: sendError.message,
      });
      errors.push(sendError.message);
    } else {
      await logDeliveryEvent(supabase, {
        issueId,
        hash,
        status: "sent",
        providerMessageId:
          sendData && "id" in sendData && typeof sendData.id === "string" ? sendData.id : undefined,
      });
      sentCount += 1;
    }
  }

  if (errors.length > 0) {
    // Set status to failed
    await supabase.rpc("service_update_newsletter_status", {
      issue_id: issueId,
      new_status: "failed",
      new_metadata: { errors },
    });
    throw new Error(`Broadcast partially failed. Sent: ${sentCount}. Errors: ${errors.join(", ")}`);
  }

  // 5. Update issue status to sent/archived
  await supabase.rpc("service_update_newsletter_status", {
    issue_id: issueId,
    new_status: "sent",
    new_sent_at: new Date().toISOString(),
    new_archive_visible: true,
  });

  return { sent: sentCount, message: "Broadcast completed successfully." };
}

export async function sendWelcomeEmail(email: string, firstName?: string, country?: string) {
  const isPH =
    country?.toLowerCase().trim() === "philippines" || country?.toLowerCase().trim() === "ph";

  const greetingName = firstName ? ` ${firstName}` : "";

  const subject = "Welcome to The Watch List · The Watch Alley";
  const preheader = "You're now on The Watch List. Welcome to curated timepiece drops from Manila.";

  const unsubscribeUrl = buildUnsubscribeUrl(email);
  let bodyHtml = "";
  let bodyText = "";

  if (isPH) {
    bodyHtml = `
      <div style="font-family: 'Spectral', Georgia, serif; line-height: 1.8; font-size: 16px; color: #F1ECE0;">
        <p style="margin-top: 0;">Hi${greetingName},</p>
        <p>Mabuhay from Manila! Thank you for joining <strong>The Watch List</strong> by The Watch Alley.</p>
        <p>We are a boutique curator dedicated to sourcing exceptional timepieces. By subscribing, you've unlocked direct, early access to our curated drops—before they go public on our storefront or social channels.</p>
        <p><strong>What to expect next:</strong></p>
        <ul style="padding-left: 20px; margin-bottom: 24px;">
          <li style="margin-bottom: 8px;"><strong>Curated Watch Drops</strong>: We share daylight-photographed watches with fully transparent condition notes. No surprises, no hidden flaws.</li>
          <li style="margin-bottom: 8px;"><strong>Collector Commentary</strong>: Notes on watch design, trends, mechanical history, and the watch culture of Manila.</li>
          <li style="margin-bottom: 8px;"><strong>Sourcing Privileges</strong>: Access to our Private Sourcing Desk. If you have a specific reference in mind, we'll locate it for you.</li>
        </ul>
        <p>If you ever want to adjust your preferences or look for a specific piece, feel free to visit <a href="${absoluteUrl("/watch-list")}" style="color: #BD9A32; text-decoration: underline;">The Watch List Preferences</a>.</p>
        <p style="margin-bottom: 0;">Wear them in good health,<br><strong>The Watch Alley Team</strong></p>
      </div>
    `;
    bodyText = `Hi${greetingName},

Mabuhay from Manila! Thank you for joining The Watch List by The Watch Alley.

We are a boutique curator dedicated to sourcing exceptional timepieces. By subscribing, you've unlocked direct, early access to our curated drops—before they go public on our storefront or social channels.

What to expect next:
- Curated Watch Drops: We share daylight-photographed watches with fully transparent condition notes. No surprises, no hidden flaws.
- Collector Commentary: Notes on watch design, trends, mechanical history, and the watch culture of Manila.
- Sourcing Privileges: Access to our Private Sourcing Desk. If you have a specific reference in mind, we'll locate it for you.

If you ever want to adjust your preferences or look for a specific piece, feel free to visit The Watch List Preferences at ${absoluteUrl("/watch-list")}.

Wear them in good health,
The Watch Alley Team

---
Unsubscribe: ${unsubscribeUrl}
View Online Archive: ${absoluteUrl("/watch-list/archive")}`;
  } else {
    bodyHtml = `
      <div style="font-family: 'Spectral', Georgia, serif; line-height: 1.8; font-size: 16px; color: #F1ECE0;">
        <p style="margin-top: 0;">Hi${greetingName},</p>
        <p>Thank you for subscribing to <strong>The Watch List</strong> by The Watch Alley.</p>
        <p>We are a Manila-based curator of fine brand-new and pre-owned timepieces. By joining, you'll receive direct, early access to our curated releases, collector notes, and exclusive sourcing updates.</p>
        <p><strong>What to expect next:</strong></p>
        <ul style="padding-left: 20px; margin-bottom: 24px;">
          <li style="margin-bottom: 8px;"><strong>Curated Watch Drops</strong>: Meticulously inspected, daylight-photographed timepieces. We fully disclose conditions in writing so you can collect with confidence.</li>
          <li style="margin-bottom: 8px;"><strong>Sourcing Services</strong>: Need a rare reference? Our team works across international channels to source specific timepieces for collectors worldwide.</li>
          <li style="margin-bottom: 8px;"><strong>Collector Insights</strong>: Brief, thoughtful dispatches covering mechanical history, brand design, and vintage values.</li>
        </ul>
        <p>For preferences, inquiries, or custom sourcing, please check <a href="${absoluteUrl("/watch-list")}" style="color: #BD9A32; text-decoration: underline;">The Watch List</a> or reply directly to this email.</p>
        <p style="margin-bottom: 0;">Wear them in good health,<br><strong>The Watch Alley Team</strong></p>
      </div>
    `;
    bodyText = `Hi${greetingName},

Thank you for subscribing to The Watch List by The Watch Alley.

We are a Manila-based curator of fine brand-new and pre-owned timepieces. By joining, you'll receive direct, early access to our curated releases, collector notes, and exclusive sourcing updates.

What to expect next:
- Curated Watch Drops: Meticulously inspected, daylight-photographed timepieces. We fully disclose conditions in writing so you can collect with confidence.
- Sourcing Services: Need a rare reference? Our team works across international channels to source specific timepieces for collectors worldwide.
- Collector Insights: Brief, thoughtful dispatches covering mechanical history, brand design, and vintage values.

For preferences, inquiries, or custom sourcing, please check The Watch List at ${absoluteUrl("/watch-list")} or reply directly to this email.

Wear them in good health,
The Watch Alley Team

---
Unsubscribe: ${unsubscribeUrl}
View Online Archive: ${absoluteUrl("/watch-list/archive")}`;
  }

  const html = wrapHtmlEmail({
    subject,
    preheader,
    bodyHtml,
    unsubscribeUrl,
  });

  const from = getFromEmail();

  const { data, error } = await resend.emails.send({
    from,
    to: email,
    subject,
    html,
    text: bodyText,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("Failed to send welcome email:", error);
    throw error;
  }

  return data;
}
