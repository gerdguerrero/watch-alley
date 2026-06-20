import "server-only";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key");

function getFromEmail() {
  return process.env.NEWSLETTER_FROM_EMAIL || "The Watch Alley <newsletter@thewatchalley.com>";
}

function wrapHtmlEmail(subject: string, preheader: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
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
    <span class="preheader">${preheader}</span>
    <div class="container">
      <div class="header">
        <a href="https://www.thewatchalley.com" class="logo">THE WATCH ALLEY</a>
      </div>
      <div class="content">
        ${bodyHtml}
      </div>
      <div class="footer">
        <p>© 2026 The Watch Alley PH. All rights reserved.</p>
        <p>Manila, Philippines</p>
        <p>
          You received this email because you are on The Watch List. <br>
          <a href="https://www.thewatchalley.com/watch-list/unsubscribe">Unsubscribe</a> · 
          <a href="https://www.thewatchalley.com/watch-list/archive">View online archive</a>
        </p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendTestEmail(issueId: string, recipient: string) {
  const supabase = createSupabaseAdminClient();

  // 1. Fetch issue
  const { data: issue, error: issueError } = await supabase
    .schema("watch_alley")
    .from("newsletter_issues")
    .select("*")
    .eq("id", issueId)
    .single();

  if (issueError || !issue) {
    throw new Error(issueError?.message || "Newsletter issue not found.");
  }

  const html = wrapHtmlEmail(issue.subject, issue.preheader || "", issue.body_html || "");
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
  const { data: issue, error: issueError } = await supabase
    .schema("watch_alley")
    .from("newsletter_issues")
    .select("*")
    .eq("id", issueId)
    .single();

  if (issueError || !issue) {
    throw new Error(issueError?.message || "Newsletter issue not found.");
  }

  // Double check status
  if (issue.status !== "approved" && issue.status !== "scheduled" && issue.status !== "sending") {
    throw new Error(`Cannot send newsletter issue with status: ${issue.status}`);
  }

  // 2. Update issue status to sending
  await supabase
    .schema("watch_alley")
    .from("newsletter_issues")
    .update({ status: "sending" })
    .eq("id", issueId);

  // 3. Fetch active subscribers
  const { data: subscribers, error: subsError } = await supabase
    .schema("watch_alley")
    .from("watch_list_subscribers")
    .select("email")
    .eq("status", "active");

  if (subsError) {
    throw new Error(`Failed to fetch subscribers: ${subsError.message}`);
  }

  const recipientCount = subscribers?.length || 0;
  if (recipientCount === 0) {
    // Revert status to approved
    await supabase
      .schema("watch_alley")
      .from("newsletter_issues")
      .update({ status: "approved" })
      .eq("id", issueId);
    return { sent: 0, message: "No active subscribers found." };
  }

  const html = wrapHtmlEmail(issue.subject, issue.preheader || "", issue.body_html || "");
  const from = getFromEmail();
  const emails = subscribers.map((s) => s.email);

  // 4. Send via Resend (broadcast batch)
  // For Resend, if we want to send to many, we can use the batch send API or send to them as Bcc.
  // Resend single email allows sending to multiple recipients in a single call. Let's send in batches of 100 as Bcc, or use batch api.
  // To avoid exposing recipients to each other, we MUST send individual emails or use Bcc.
  const batchSize = 100;
  const errors: string[] = [];
  let sentCount = 0;

  for (let i = 0; i < emails.length; i += batchSize) {
    const chunk = emails.slice(i, i + batchSize);

    // We send to the generic address, with subscribers as Bcc.
    const { error: batchError } = await resend.emails.send({
      from,
      to: "newsletter@thewatchalley.com", // placeholder to satisfy required To field
      bcc: chunk,
      subject: issue.subject,
      html,
      text: issue.body_text || "",
    });

    if (batchError) {
      errors.push(batchError.message);
    } else {
      sentCount += chunk.length;
    }
  }

  if (errors.length > 0) {
    // Set status to failed
    await supabase
      .schema("watch_alley")
      .from("newsletter_issues")
      .update({
        status: "failed",
        metadata: { ...((issue.metadata as Record<string, unknown>) || {}), errors },
      })
      .eq("id", issueId);
    throw new Error(`Broadcast partially failed. Sent: ${sentCount}. Errors: ${errors.join(", ")}`);
  }

  // 5. Update issue status to sent/archived
  await supabase
    .schema("watch_alley")
    .from("newsletter_issues")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      archive_visible: true, // Make it visible in archive by default upon broadcast
    })
    .eq("id", issueId);

  return { sent: sentCount, message: "Broadcast completed successfully." };
}
