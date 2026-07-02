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

function managePreferencesUrl() {
  return absoluteUrl("/watch-list?intent=preferences");
}

function archiveUrl() {
  return absoluteUrl("/watch-list/archive");
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
  const logoUrl = "https://www.thewatchalley.com/brand/logo-gold.png";
  const siteUrl = absoluteUrl("/");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${safeSubject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Petrona:ital,wght@0,300..900;1,300..900&family=Spectral:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
    <style>
      :root {
        color-scheme: light dark;
        supported-color-schemes: light dark;
      }
      body {
        background-color: #13110f !important;
        color: #F1ECE0;
        font-family: 'Spectral', Georgia, serif;
        margin: 0;
        padding: 0;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      .email-bg {
        background-color: #13110f !important;
        width: 100%;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 40px 24px;
        background-color: #13110f !important;
        text-align: left;
      }
      @media screen and (max-width: 480px) {
        .container {
          padding: 28px 16px !important;
        }
        .content h2 {
          font-size: 19px !important;
        }
        .content h3 {
          font-size: 17px !important;
        }
        .content {
          font-size: 15px !important;
        }
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
      .email-logo {
        border: 0;
        display: block;
        height: auto;
        margin: 0 auto;
        max-width: 170px;
        outline: none;
        text-decoration: none;
        width: 170px;
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
      /* Semantic classes newsletter authors can use in body_html (see html.ts SAFE_CLASSES)
         instead of hardcoding a hex color, so text stays legible in both color schemes. */
      .content .heading {
        color: #F1ECE0;
      }
      .content .eyebrow {
        color: #BD9A32;
      }
      .content .muted {
        color: #d1d1cd;
      }
      .content .accent-heading {
        color: #BD9A32;
      }
      .content a.btn-outline {
        border: 1px solid #BD9A32;
        color: #BD9A32;
      }
      .content .show-light {
        display: none;
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
      @media screen and (prefers-color-scheme: light) {
        body {
          background-color: #FBF7EE !important;
          color: #3F392E !important;
        }
        .email-bg,
        .container {
          background-color: #FBF7EE !important;
        }
        .content {
          color: #3F392E !important;
        }
        .content a {
          color: #8A6B1C !important;
          border-bottom-color: rgba(138, 107, 28, 0.35) !important;
        }
        .content h2,
        .content h3,
        .content .heading {
          color: #1C1712 !important;
          border-bottom-color: rgba(138, 107, 28, 0.25) !important;
        }
        .content .eyebrow,
        .content .accent-heading {
          color: #8A6B1C !important;
        }
        .content .muted {
          color: #6B6252 !important;
        }
        .content a.btn-outline {
          border-color: #8A6B1C !important;
          color: #8A6B1C !important;
        }
        .content .show-dark {
          display: none !important;
        }
        .content .show-light {
          display: inline-block !important;
        }
        .header {
          border-bottom-color: rgba(138, 107, 28, 0.2) !important;
        }
        .footer {
          border-top-color: rgba(138, 107, 28, 0.2) !important;
          color: rgba(28, 23, 18, 0.55) !important;
        }
        .footer a {
          color: #8A6B1C !important;
        }
        .preheader {
          color: #FBF7EE !important;
        }
      }
    </style>
  </head>
  <body style="background-color: #13110f; margin: 0; padding: 0;" bgcolor="#13110f">
    <span class="preheader">${safePreheader}</span>
    <table role="presentation" class="email-bg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#13110f" style="background-color: #13110f; width: 100%;">
      <tr>
        <td align="center" class="email-bg" bgcolor="#13110f" style="background-color: #13110f;">
          <div class="container">
            <div class="header">
              <a href="${siteUrl}" class="logo-link" style="display: block; text-decoration: none; text-align: center; margin: 0 auto;">
                <img class="email-logo" src="${logoUrl}" width="170" height="126" alt="The Watch Alley" style="border: 0; display: block; height: auto; margin: 0 auto; max-width: 170px; outline: none; text-decoration: none; width: 170px;" />
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
                <a href="${managePreferencesUrl()}">Manage Preferences</a> |
                <a href="${archiveUrl()}">View Online Archive</a> |
                <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildUnsubscribeUrl(email: string) {
  return absoluteUrl(`/api/watch-list/unsubscribe?token=${createUnsubscribeToken(email)}`);
}

function appendTextFooter(bodyText: string, unsubscribeUrl: string) {
  return `${bodyText.trim()}

--
Manage Preferences: ${managePreferencesUrl()}
View Online Archive: ${archiveUrl()}
Unsubscribe: ${unsubscribeUrl}`;
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
  const unsubscribeUrl = buildUnsubscribeUrl(recipient);

  const html = wrapHtmlEmail({
    subject: issue.subject,
    preheader: issue.preheader || "",
    bodyHtml: issue.body_html || "",
    unsubscribeUrl,
  });
  const from = getFromEmail();

  // 2. Send via Resend
  const { data: sendData, error: sendError } = await resend.emails.send({
    from,
    to: recipient,
    subject: `[TEST] ${issue.subject}`,
    html,
    text: appendTextFooter(issue.body_text || issue.subject, unsubscribeUrl),
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
      text: appendTextFooter(issue.body_text || issue.subject, unsubscribeUrl),
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

  const subject = "Welcome to The Watch List | The Watch Alley";
  const preheader = "You're now on The Watch List. Welcome to curated timepiece drops from Manila.";

  const unsubscribeUrl = buildUnsubscribeUrl(email);
  let bodyHtml = "";
  let bodyText = "";

  if (isPH) {
    bodyHtml = `
      <div style="font-family: 'Spectral', Georgia, serif; line-height: 1.8; font-size: 16px; color: #F1ECE0;">
        <p style="margin-top: 0;">Hi${greetingName},</p>
        <p>Mabuhay from Manila! Thank you for joining <strong>The Watch List</strong> by The Watch Alley.</p>
        <p>We are a boutique curator dedicated to sourcing exceptional timepieces. By subscribing, you've unlocked direct, early access to our curated drops before they go public on our storefront or social channels.</p>
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

We are a boutique curator dedicated to sourcing exceptional timepieces. By subscribing, you've unlocked direct, early access to our curated drops before they go public on our storefront or social channels.

What to expect next:
- Curated Watch Drops: We share daylight-photographed watches with fully transparent condition notes. No surprises, no hidden flaws.
- Collector Commentary: Notes on watch design, trends, mechanical history, and the watch culture of Manila.
- Sourcing Privileges: Access to our Private Sourcing Desk. If you have a specific reference in mind, we'll locate it for you.

If you ever want to adjust your preferences or look for a specific piece, feel free to visit The Watch List Preferences at ${absoluteUrl("/watch-list")}.

Wear them in good health,
The Watch Alley Team

---
Manage Preferences: ${managePreferencesUrl()}
View Online Archive: ${archiveUrl()}
Unsubscribe: ${unsubscribeUrl}`;
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
Manage Preferences: ${managePreferencesUrl()}
View Online Archive: ${archiveUrl()}
Unsubscribe: ${unsubscribeUrl}`;
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

/**
 * Send a profile-completion nudge email to subscribers who are missing
 * key collector profile fields (first name, country, or preferences).
 */
export async function sendProfileCompletionEmail(
  email: string,
  firstName?: string,
  missingFields: string[] = []
) {
  const greetingName = firstName ? ` ${firstName}` : "";
  const subject = "Complete your collector profile | The Watch Alley";
  const preheader =
    "Help us send you better watch selections. A quick update takes less than a minute.";

  const unsubscribeUrl = buildUnsubscribeUrl(email);
  const preferencesUrl = absoluteUrl("/watch-list?intent=preferences");

  const missingList =
    missingFields.length > 0
      ? `<ul style="padding-left: 20px; margin-bottom: 24px;">
          ${missingFields.map((f) => `<li style="margin-bottom: 8px;">${f}</li>`).join("\n")}
        </ul>`
      : "";

  const bodyHtml = `
    <div style="font-family: 'Spectral', Georgia, serif; line-height: 1.8; font-size: 16px; color: #F1ECE0;">
      <p style="margin-top: 0;">Hi${greetingName},</p>
      <p>We noticed your Watch List profile is missing a few details that help us curate better selections for you. When we know your taste (such as the brands you follow, your budget, and where you are based), we can surface pieces that actually match your eye instead of sending everything.</p>
      ${missingList}
      <p>Updating takes less than a minute:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${escapeHtml(preferencesUrl)}" style="display: inline-block; background-color: #BD9A32; color: #090806; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; text-decoration: none; padding: 14px 28px; border-radius: 12px;">Complete Your Profile</a>
      </div>
      <p style="font-size: 13px; color: rgba(241, 236, 224, 0.5);">If you prefer to stay as a simple subscriber with no collector details, no action is needed. You will still receive our regular Watch List dispatches.</p>
      <p style="margin-bottom: 0;">Wear them in good health,<br><strong>The Watch Alley Team</strong></p>
    </div>
  `;

  const bodyText = `Hi${greetingName},

We noticed your Watch List profile is missing a few details that help us curate better selections for you. When we know your taste (such as the brands you follow, your budget, and where you are based), we can surface pieces that actually match your eye instead of sending everything.

Update your profile here: ${preferencesUrl}

If you prefer to stay as a simple subscriber with no collector details, no action is needed. You will still receive our regular Watch List dispatches.

Wear them in good health,
The Watch Alley Team

--
Manage Preferences: ${managePreferencesUrl()}
View Online Archive: ${archiveUrl()}
Unsubscribe: ${unsubscribeUrl}`;

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
    console.error("Failed to send profile completion email:", error);
    throw error;
  }

  return data;
}
