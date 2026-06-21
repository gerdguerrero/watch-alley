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

function absolutizeLinks(html: string) {
  return html.replace(/\shref="\/([^"]*)"/g, (_match, path: string) => {
    return ` href="${absoluteUrl(`/${path}`)}"`;
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
  const safeBodyHtml = absolutizeLinks(sanitizeNewsletterHtml(bodyHtml));

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeSubject}</title>
    <style>
      body {
        background-color: #080706;
        color: #f5f4f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 24px 16px;
      }
      .header {
        text-align: center;
        border-bottom: 1px solid rgba(253, 224, 71, 0.15);
        padding-bottom: 20px;
        margin-bottom: 24px;
      }
      .logo {
        font-family: Georgia, serif;
        font-size: 22px;
        letter-spacing: 0.15em;
        text-decoration: none;
        color: #f5f4f0;
        font-weight: bold;
      }
      .preheader {
        display: none;
        font-size: 1px;
        color: #080706;
        line-height: 1px;
        max-height: 0px;
        max-width: 0px;
        opacity: 0;
        overflow: hidden;
      }
      .content {
        font-size: 15px;
        line-height: 1.8;
        color: #d1d1cd;
      }
      .content a {
        color: #f59e0b;
        text-decoration: none;
        border-bottom: 1px solid rgba(245, 158, 11, 0.3);
      }
      .content h2 {
        font-family: Georgia, serif;
        color: #f5f4f0;
        font-size: 18px;
        margin-top: 32px;
        border-bottom: 1px solid rgba(253, 224, 71, 0.15);
        padding-bottom: 8px;
      }
      .content ul {
        padding-left: 20px;
      }
      .footer {
        margin-top: 48px;
        border-top: 1px solid rgba(253, 224, 71, 0.15);
        padding-top: 24px;
        font-size: 11px;
        color: rgba(245, 244, 240, 0.5);
        text-align: center;
        line-height: 1.6;
      }
      .footer a {
        color: #f59e0b;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <span class="preheader">${safePreheader}</span>
    <div class="container">
      <div class="header">
        <a href="https://www.thewatchalley.com" class="logo">THE WATCH ALLEY</a>
      </div>
      <div class="content">
        ${safeBodyHtml}
      </div>
      <div class="footer">
        <p>© 2026 The Watch Alley PH. All rights reserved.</p>
        <p>Manila, Philippines</p>
        <p>
          You received this email because you are on The Watch List. <br>
          <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a> · 
          <a href="${absoluteUrl("/watch-list/archive")}">View online archive</a>
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
