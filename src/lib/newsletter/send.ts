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
        <a href="https://www.thewatchalley.com" class="logo-link">
          <img src="${absoluteUrl("/brand/logo-gold.png")}" alt="The Watch Alley" style="height: 48px; width: auto; display: block; margin: 0 auto; border: 0;" />
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
