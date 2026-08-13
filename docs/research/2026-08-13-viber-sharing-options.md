# Viber sharing and broadcasting options for The Watch Alley admin

**Date:** 2026-08-13
**Scope:** An operator-facing web admin action that shares one published product listing. Only first-party Rakuten Viber sources were used.

## Executive conclusion

The current `viber://forward?text=<encoded text>` approach is **officially documented**, not merely a community URI hack. Viber’s live Share Button documentation shows exactly that scheme and constructs the payload with `encodeURIComponent(...)`. It is a user-mediated share: Viber opens a composer/forwarding flow, and **the user—not the website—selects the Viber contact(s)** and may edit the message before sending.[1]

Keep it as a lightweight, progressive-enhancement “Share via Viber” action, but keep the complete decoded payload at **200 characters or fewer**, include the canonical product URL before optional copy, and provide a normal copy-link/copy-message fallback.[1] Do not treat it as a reliable broadcast API, do not claim delivery, and do not attempt recipient preselection with undocumented URI parameters.[1]

For actual campaign delivery, the production choices are (a) a commercial Viber Bot for users who have subscribed to that bot, or (b) Viber Business Messages, obtained through Viber/official partners, for business-initiated messaging against an existing customer database.[3][4]

## 1. Audit of `viber://forward?text=`

### Verified official behavior

- Viber’s official Share Button page documents `viber://forward?text=<Your Text>` and describes it as a custom URL scheme for mobile website visitors.[1]
- Its official sample builds the URI as `"viber://forward?text=" + encodeURIComponent(text + " " + window.location.href)`. The current implementation’s use of `encodeURIComponent(message)` therefore matches the documented encoding pattern.[1]
- The resulting flow is user-controlled: the predefined text and current URL can be sent to a Viber contact **selected by the user**, and the user may edit the text or send it unchanged.[1]
- Viber warns not to place the integration inside an iframe.[1]

### Encoding and practical length limit

- Build the payload from Unicode text first, then apply `encodeURIComponent` **once** to the entire payload. Do not manually replace spaces/newlines and do not encode the already encoded result.[1]
- The official troubleshooting section says text longer than **200 characters** is trimmed so only the first 200 characters are inserted.[1]
- The sample concatenates the message and page URL before encoding, so the safest operational rule is to budget the **entire decoded composer payload—including the URL—to 200 characters**. Put the URL early enough that truncation cannot remove it.[1]
- Viber does not define whether “character” means Unicode code points, UTF-16 units, or bytes, nor does the Share Button page publish separate browser/OS URL-length limits.[1] Treat 200 as a hard content ceiling, leave margin for emoji and non-ASCII text, and test the supported device matrix.

### Recipient selection and delivery guarantees

- There is **no documented recipient parameter** for the share scheme.[1]
- The only documented parameter is `text`, and Viber explicitly says the user selects the destination contact.[1]
- Therefore a web page cannot officially preselect arbitrary contacts, groups, or a broadcast list through this URI.[1]
- Any `viber://forward` variant that injects a phone number, chat ID, group ID, or auto-send behavior should be classified as **unverified/unsupported** and excluded from production.[1]

The documented URI handoff provides no message ID, delivery receipt, recipient list, or proof that the operator pressed Send.[1] The admin should record at most “Viber share opened/copied,” never “sent” or “delivered.”

## 2. Official production alternatives

| Option | Recipient control | Important limits / requirements | Best use here |
|---|---|---|---|
| **Share Button / `viber://forward`** | User chooses recipients in Viber; site cannot preselect them.[1] | URI handoff for mobile websites; decoded payload is trimmed after 200 characters; user may edit; avoid iframes.[1] | Keep for one-off, operator-mediated sharing of a single listing. |
| **Bot deeplink** | Opens a specific bot’s one-to-one chat—not an arbitrary person/chat. Optional `context` reaches the bot; optional `text` pre-fills the composer and remains editable.[2] | `viber://pa?chatURI=<URI>&context=<...>&text=<...>`; context is bounded by URL length; Viber notes some browsers may not recognize the deeplink. Bot must exist.[2] | Entry point into a guided “ask about this watch” bot flow, with the listing slug in `context`. Not a broadcast mechanism. |
| **Viber Bot REST API** | Server sends to stored Viber user IDs, but only after each user subscribes/messages the bot.[3] | New bots have been commercial-only since 2024. No API returns all subscriber IDs, so the service must retain IDs from callbacks. `send_message` requires one subscribed user ID; text supports up to 7,000 characters. `broadcast_message` supports up to 300 subscribed IDs/request, 30 KB request JSON, and 500 requests per 10 seconds.[3] | Opt-in audience, inventory alerts, or interactive sales assistance when The Watch Alley is ready to operate a paid bot and backend. |
| **Viber Business Messages** | Business-initiated messages to existing customers; the Bot API directs phone-number/database use cases to this product and an official partner.[3] | Commercial onboarding. Viber advertises personalized one-to-one messaging, proactive conversations, an encrypted API/SMS fallback, promotional/transactional/OTP classes, catalogs, carousels, CTA buttons, and pay-per-delivered-message pricing.[4] | Best official route for CRM-driven new-arrival or product campaigns to a consented customer list. |

### Bot broadcast is not arbitrary-recipient broadcast

The Bot API’s `broadcast_list` is server-selected, but every entry must be a valid **subscribed Viber user ID**. It is not a list of phone numbers or arbitrary Viber contacts.[3] Viber also says there is no API to fetch all bot subscribers; the operator’s backend must have lawfully collected and retained each subscriber ID from callbacks.[3]

For phone-number-addressed delivery against an existing customer database, Viber explicitly points developers to Business Messages through official partners.[3] This is the appropriate escalation path if the product requirement changes from “operator shares a listing” to “The Watch Alley sends a campaign to selected customers.”[3][4]

## 3. Recommended near-term admin behavior

1. **Retain the official scheme** as a user-initiated button; invoke it only from a click/tap, not automatically on page load.[1]
2. **Generate a compact payload and validate its decoded length before navigation.** Example:

   ```text
   Rolex Submariner 126610LN — ₱745,000
   View: https://thewatchalley.com/watch/rolex-submariner-126610ln
   Reply for availability.
   ```

   Keep the title concise, place the canonical HTTPS URL on line 2, omit long descriptions/specs, and ensure the complete decoded string remains safely below 200 characters.[1]
3. **Offer fallbacks:** “Copy message” and “Copy listing link.” On desktop, unsupported browsers, or devices without Viber, the operator still gets a useful result. Label the Viber action “Open Viber” or “Share via Viber,” not “Broadcast.”
4. **Do not preselect recipients or automate Send.** Let Viber own the recipient picker and final confirmation.[1]
5. **Track honest events only:** generated, copied, or Viber handoff opened. The documented share URI provides no sent/delivered callback.[1]
6. **Escalate only when justified:** choose a commercial Bot for subscriber-led interactions; choose Business Messages for consented CRM/phone-number campaigns.[3][4]

## 4. Privacy, security, and abuse constraints

- **Keep API credentials server-side.** The Bot API authentication token is a secret account identifier carried in `X-Viber-Auth-Token`; exposing it in static admin JavaScript would let unauthorized parties act as the bot. Bot webhooks must use a valid trusted TLS certificate.[3]
- **Minimize subscriber data.** Viber treats the user’s unique product identifier, profile name, and profile photo as collected data that may be personal data. Its developer terms require lawful processing, transparency, appropriate technical/organizational safeguards, and protection against loss or unauthorized access.[5]
- **Opt out of unnecessary profile fields.** The Bot API lets a developer request placeholder/default names and photos with `send_name: false` and `send_photo: false`; Viber explicitly recommends opting out when these fields are not used.[3]
- **Honor unsubscribe/opt-out state.** Viber says sending to or subscribing to a bot allows its admins to send notifications and personal messages, while users can decline or opt out. The API exposes `subscribed`/`unsubscribed` callbacks; stop campaigns promptly when consent is withdrawn.[3][6]
- **Do not automate a consumer account or scrape contacts.** Viber’s acceptable-use rules prohibit spam, impermissible bulk/auto messaging, and collecting or publishing others’ private information. Authorized Bot or Business Messages functionality should be used under its commercial terms rather than GUI automation or recipient-harvesting hacks.[7]
- **Keep share payloads non-sensitive.** A listing share should contain public product information and a canonical HTTPS URL only—never customer phone numbers, inquiry notes, internal prices, access tokens, or signed/private asset URLs.[5][7]

## 5. Verified vs. unverified boundary

**Verified official:** `viber://forward?text=`, one-pass `encodeURIComponent`, 200-character trimming, user-selected destination, and editable text.[1]

Bot `chatURI` deeplinks are documented.[2]

Bot API sending/broadcast is subscriber-gated, while Business Messages supports existing customer databases.[3][4]

**Unverified/unsupported:** recipient-bearing variants of `viber://forward`, direct phone-number preselection for ordinary sharing, group/broadcast-list injection through a URI, auto-send, success callbacks from the share URI, and any promise that the URI behaves identically across every desktop/mobile browser.[1][2][3] These must not become product contracts without new first-party documentation and device testing.

## Sources

[1] https://developers.viber.com/docs/tools/share-button — Viber Share Button
[2] https://developers.viber.com/docs/tools/deep-links — Viber Deeplinks
[3] https://developers.viber.com/docs/api/rest-bot-api — Viber REST Bot API
[4] https://www.forbusiness.viber.com/en/business-messages — Viber Business Messages
[5] https://www.viber.com/en/terms/viber-developer-distribution-agreement — Viber Developer Distribution Agreement
[6] https://www.viber.com/en/terms/viber-privacy-policy — Viber Privacy Policy
[7] https://www.viber.com/en/terms/viber-public-content-policy — Viber Acceptable Use Policy
