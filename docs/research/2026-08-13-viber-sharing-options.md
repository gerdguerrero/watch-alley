# Viber sharing and broadcasting options for The Watch Alley admin

**Date:** 2026-08-13
**Scope:** An operator-facing web admin action that shares one published product listing. Only first-party Rakuten Viber sources were used.

## Executive conclusion

The `viber://forward?text=<encoded text>` approach appeared in Viber's first-party Share Button documentation and used `encodeURIComponent(...)`. However, as checked on 2026-08-13, that URL now serves Viber's generic developer landing page rather than the cited Share Button content. Treat the scheme and its former 200-character guidance as **legacy first-party behavior requiring device verification**, not as a currently reproducible API contract.[1]

The Watch Alley admin uses the legacy URI as a user-clicked app handoff because the owner requires Viber to open directly. It reserves the complete bare canonical URL first, then shortens only the sales-copy body so the decoded payload stays at or below 200 UTF-16 units. Copy-message/copy-link fallbacks remain available, and the UI does not claim delivery or attempt recipient preselection.[1]

For actual campaign delivery, the production choices are (a) a commercial Viber Bot for users who have subscribed to that bot, or (b) Viber Business Messages, obtained through Viber/official partners, for business-initiated messaging against an existing customer database.[3][4]

## 1. Audit of `viber://forward?text=`

### Historically documented first-party behavior

- Viber's first-party Share Button page previously documented `viber://forward?text=<Your Text>` as a custom URL scheme for mobile website visitors. The same URL no longer exposes that documentation as of 2026-08-13.[1]
- The former first-party sample built the URI as `"viber://forward?text=" + encodeURIComponent(text + " " + window.location.href)`. The current implementation preserves that historical encoding pattern.[1]
- The former documentation described a user-controlled flow: the user selected the Viber contact and could edit the text before sending.[1]
- The former documentation warned not to place the integration inside an iframe.[1]

### Encoding and practical length limit

- Following the former sample, build the payload from Unicode text first and apply `encodeURIComponent` **once** to the entire payload. Do not manually replace spaces/newlines or encode an already encoded result.[1]
- The former troubleshooting section said text longer than **200 characters** was trimmed so only the first 200 characters were inserted.[1]
- Because the former sample concatenated message and URL before encoding, the safest compatibility rule is to budget the **entire decoded composer payload—including the URL—to 200 UTF-16 units**, reserve the URL before shortening the body, and keep that URL as the final line.[1]
- The archived behavior did not define whether “character” meant Unicode code points, UTF-16 units, or bytes, and the current landing page publishes no browser/OS limits. Treat 200 UTF-16 units as a conservative ceiling and test the supported device matrix.

### Recipient selection and delivery guarantees

- The former first-party Share Button guidance documented only the `text` parameter and described the user selecting the destination contact.[1]
- It did not document recipient, phone-number, group, or broadcast-list parameters.[1]
- Therefore the application must not promise or attempt recipient preselection through this URI.
- Any recipient-bearing or auto-send variant should be classified as **unsupported** and excluded from production unless Viber publishes a new first-party contract.

The legacy URI handoff exposes no message ID, delivery receipt, recipient list, or proof that the operator pressed Send.[1] The admin should record at most “Viber handoff requested” or “copied,” never “sent” or “delivered.”

## 2. Official production alternatives

| Option | Recipient control | Important limits / requirements | Best use here |
|---|---|---|---|
| **Legacy Share Button / `viber://forward`** | Historically, the user chose recipients in Viber; the site could not preselect them.[1] | Formerly documented URI handoff; cap the complete decoded payload at 200 UTF-16 units and verify on supported devices.[1] | Keep for one-off, operator-mediated sharing, with copy fallbacks. |
| **Bot deeplink** | Opens a specific bot’s one-to-one chat—not an arbitrary person/chat. Optional `context` reaches the bot; optional `text` pre-fills the composer and remains editable.[2] | `viber://pa?chatURI=<URI>&context=<...>&text=<...>`; context is bounded by URL length; Viber notes some browsers may not recognize the deeplink. Bot must exist.[2] | Entry point into a guided “ask about this watch” bot flow, with the listing slug in `context`. Not a broadcast mechanism. |
| **Viber Bot REST API** | Server sends to stored Viber user IDs, but only after each user subscribes/messages the bot.[3] | New bots have been commercial-only since 2024. No API returns all subscriber IDs, so the service must retain IDs from callbacks. `send_message` requires one subscribed user ID; text supports up to 7,000 characters. `broadcast_message` supports up to 300 subscribed IDs/request, 30 KB request JSON, and 500 requests per 10 seconds.[3] | Opt-in audience, inventory alerts, or interactive sales assistance when The Watch Alley is ready to operate a paid bot and backend. |
| **Viber Business Messages** | Business-initiated messages to existing customers; the Bot API directs phone-number/database use cases to this product and an official partner.[3] | Commercial onboarding. Viber advertises personalized one-to-one messaging, proactive conversations, an encrypted API/SMS fallback, promotional/transactional/OTP classes, catalogs, carousels, CTA buttons, and pay-per-delivered-message pricing.[4] | Best official route for CRM-driven new-arrival or product campaigns to a consented customer list. |

### Bot broadcast is not arbitrary-recipient broadcast

The Bot API’s `broadcast_list` is server-selected, but every entry must be a valid **subscribed Viber user ID**. It is not a list of phone numbers or arbitrary Viber contacts.[3] Viber also says there is no API to fetch all bot subscribers; the operator’s backend must have lawfully collected and retained each subscriber ID from callbacks.[3]

For phone-number-addressed delivery against an existing customer database, Viber explicitly points developers to Business Messages through official partners.[3] This is the appropriate escalation path if the product requirement changes from “operator shares a listing” to “The Watch Alley sends a campaign to selected customers.”[3][4]

## 3. Recommended near-term admin behavior

1. **Use the direct Viber URI behind an explicit owner click** so the installed Viber app opens. Reserve the complete bare canonical item URL as the final line for link-preview eligibility.
2. **Cap the complete decoded payload at 200 UTF-16 units**. If the saved sales copy is longer, shorten the body with an ellipsis while preserving the URL intact.[1] Example of a compact fallback:

   ```text
   Rolex Submariner 126610LN — ₱745,000
   View: https://thewatchalley.com/watch/rolex-submariner-126610ln
   Reply for availability.
   ```

   Ensure the complete decoded URI string, including the URL, remains within 200 UTF-16 units.[1]
3. **Offer fallbacks:** “Copy message” and “Copy listing link.” Label the action “Open Viber app,” not “Broadcast.”
4. **Do not preselect recipients or automate Send.** Let Viber own recipient selection and final confirmation.[1]
5. **Track honest events only:** generated, copied, or Viber handoff requested. The legacy share URI exposes no sent/delivered callback.[1]
6. **Escalate only when justified:** choose a commercial Bot for subscriber-led interactions; choose Business Messages for consented CRM/phone-number campaigns.[3][4]

## 4. Privacy, security, and abuse constraints

- **Keep API credentials server-side.** The Bot API authentication token is a secret account identifier carried in `X-Viber-Auth-Token`; exposing it in static admin JavaScript would let unauthorized parties act as the bot. Bot webhooks must use a valid trusted TLS certificate.[3]
- **Minimize subscriber data.** Viber treats the user’s unique product identifier, profile name, and profile photo as collected data that may be personal data. Its developer terms require lawful processing, transparency, appropriate technical/organizational safeguards, and protection against loss or unauthorized access.[5]
- **Opt out of unnecessary profile fields.** The Bot API lets a developer request placeholder/default names and photos with `send_name: false` and `send_photo: false`; Viber explicitly recommends opting out when these fields are not used.[3]
- **Honor unsubscribe/opt-out state.** Viber says sending to or subscribing to a bot allows its admins to send notifications and personal messages, while users can decline or opt out. The API exposes `subscribed`/`unsubscribed` callbacks; stop campaigns promptly when consent is withdrawn.[3][6]
- **Do not automate a consumer account or scrape contacts.** Viber’s acceptable-use rules prohibit spam, impermissible bulk/auto messaging, and collecting or publishing others’ private information. Authorized Bot or Business Messages functionality should be used under its commercial terms rather than GUI automation or recipient-harvesting hacks.[7]
- **Keep share payloads non-sensitive.** A listing share should contain public product information and a canonical HTTPS URL only—never customer phone numbers, inquiry notes, internal prices, access tokens, or signed/private asset URLs.[5][7]

## 5. Verified vs. unverified boundary

**Historically documented by Viber, but not currently reproducible at the cited URL:** `viber://forward?text=`, one-pass `encodeURIComponent`, 200-character trimming, user-selected destination, and editable text.[1] Retain these as conservative compatibility assumptions and verify them on supported Viber/device combinations.

Bot `chatURI` deeplinks are documented.[2]

Bot API sending/broadcast is subscriber-gated, while Business Messages supports existing customer databases.[3][4]

**Unverified/unsupported:** recipient-bearing variants of `viber://forward`, direct phone-number preselection for ordinary sharing, group/broadcast-list injection through a URI, auto-send, success callbacks from the share URI, and any promise that the URI behaves identically across every desktop/mobile browser.[1][2][3] These must not become product contracts without new first-party documentation and device testing.

## Sources

[1] https://developers.viber.com/docs/tools/share-button — Former Viber Share Button URL; returned the generic developer landing page when rechecked on 2026-08-13
[2] https://developers.viber.com/docs/tools/deep-links — Viber Deeplinks
[3] https://developers.viber.com/docs/api/rest-bot-api — Viber REST Bot API
[4] https://www.forbusiness.viber.com/en/business-messages — Viber Business Messages
[5] https://www.viber.com/en/terms/viber-developer-distribution-agreement — Viber Developer Distribution Agreement
[6] https://www.viber.com/en/terms/viber-privacy-policy — Viber Privacy Policy
[7] https://www.viber.com/en/terms/viber-public-content-policy — Viber Acceptable Use Policy
