import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = '/Users/buloy/projects/watch-alley';

function loadEnv() {
  const fullPath = path.join(projectRoot, '.env.local');
  if (!existsSync(fullPath)) {
    console.error("Missing .env.local file at:", fullPath);
    process.exit(1);
  }
  const raw = readFileSync(fullPath, 'utf8');
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase URL or Service Role Key in environment!");
  process.exit(1);
}

const filesToUpload = [
  {
    localName: "whiskered-pitta.png",
    localPath: "/Users/buloy/projects/watch-alley/public/journal/whiskered-pitta.png"
  },
  {
    localName: "neo-vintage.png",
    localPath: "/Users/buloy/projects/watch-alley/public/journal/neo-vintage.png"
  },
  {
    localName: "watch-straps.png",
    localPath: "/Users/buloy/projects/watch-alley/public/journal/watch-straps.png"
  },
  {
    localName: "gs-spring-drive.png",
    localPath: "/Users/buloy/projects/watch-alley/public/journal/gs-spring-drive.png"
  }
];

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function uploadToSupabaseStorage(localPath, filename, retries = 3) {
  if (!existsSync(localPath)) {
    throw new Error(`File does not exist locally: ${localPath}`);
  }

  const fileBuffer = readFileSync(localPath);
  const uploadUrl = `${supabaseUrl}/storage/v1/object/journal-images/${filename}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Uploading ${filename} to Supabase Storage (Attempt ${attempt}/${retries})...`);
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'image/png',
          'x-upsert': 'true' // Overwrites the file if it already exists in bucket
        },
        body: fileBuffer
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Storage upload failed (${res.status}): ${text}`);
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/journal-images/${filename}`;
      console.log(`Successfully uploaded ${filename}! Public URL: ${publicUrl}`);
      return publicUrl;
    } catch (err) {
      console.warn(`Attempt ${attempt} failed for ${filename}:`, err.message);
      if (attempt === retries) {
        throw err;
      }
      console.log(`Waiting 2 seconds before retry...`);
      await wait(2000);
    }
  }
}

// Admin Auth and database upsert functions
async function getAdminToken() {
  const email = "admin_temp@watchalley.ph";
  const password = "SuperSecurePassword123!Temporary";

  const loginUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
  const res = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sign in failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function callUpsertRpc(payload, accessToken) {
  const url = `${supabaseUrl}/rest/v1/rpc/admin_upsert_journal_post`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ payload })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC call failed (${res.status}): ${text}`);
  }
}

async function runProcess() {
  try {
    const urls = {};
    for (const item of filesToUpload) {
      const publicUrl = await uploadToSupabaseStorage(item.localPath, item.localName);
      urls[item.localName] = publicUrl;
    }

    console.log("\nObtaining Admin Authorization JWT...");
    const accessToken = await getAdminToken();

    // 1. Update Whiskered Pitta post hero image in live DB with Supabase Storage CDN URL
    console.log("Updating live Seiko Alpinist Whiskered Pitta post hero URL...");
    const whiskeredPittaPayload = {
      id: "9fb626f5-2145-49c4-85d7-4fc320597b85",
      slug: "seiko-launches-5th-philippine-limited-edition",
      title: "Seiko launches its 5th Philippine Limited Edition.",
      summary: "The Prospex Alpinist \"Whiskered Pitta\" SPB491J1, limited to 1,288 pieces, marks Seiko's fifth Philippine Limited Edition and its growing commitment to the local collector community.",
      bodyMarkdown: `## **Seiko** has *quietly* become the brand most willing to make watches *for* the Philippine market, not just sell into it. The Prospex Alpinist "Whiskered Pitta" SPB491J1 is the brand's fifth Philippine Limited Edition in a row, and like the four before it, it is a piece designed around a Filipino subject — the country's namesake bird, often photographed in the slopes of Palawan and the Sierra Madre.

1,288 pieces. 39.5 mm steel case. The 6R35 automatic. The dial picks up the green and yellow of the bird's plumage, and the rotor is engraved with a Whiskered Pitta silhouette — the kind of detail you only notice if you know what you are looking at, which is the entire point of a limited edition.

## Why this matters for the local market

Limited editions are the cleanest demand signal a brand can send. When Seiko ships a Philippine LE every year on a quiet rhythm — they did the Tikbalang in 2021, the Apo Reef in 2022, the Tarsier in 2023, the Mt. Pinatubo in 2024, and now the Whiskered Pitta in 2026 — it tells distributors and collectors that the Philippines is a long-term market, not a tactical one.

That changes the resale economics. A piece that sells out in three days in Manila and never comes back to retail builds a floor under the secondary price. That floor is what turns a watch into a collector's asset rather than a consumer good.

> Limited editions are the cleanest demand signal a brand can send. Seiko has been shipping one a year for the Philippines.

## What we are watching

Three things over the next quarter: how fast the Whiskered Pitta clears at authorised dealers; whether the secondary asks land near the 1.4× retail ceiling that the Mt. Pinatubo settled at; and whether Seiko commits to a sixth piece in 2027, which would harden the pattern from "a habit" into "a program."

For collectors the action is simple. If you can buy at retail, buy at retail. If you cannot, the secondary market will give you a better read in 60 days than it does in week one.`,
      heroImage: urls["whiskered-pitta.png"],
      tags: ["industry", "seiko", "limited-edition"],
      status: "published",
      publishAt: "2026-04-28T10:00:00+00:00",
      author: "The Watch Alley",
      readMinutes: 4
    };
    await callUpsertRpc(whiskeredPittaPayload, accessToken);
    console.log("Successfully updated Seiko Alpinist hero URL!");

    // 2. Define and Upsert the three articles with Supabase Storage CDN URLs
    // Using their existing database UUIDs to perform update matches on conflict id
    const newArticles = [
      {
        id: "f5464c01-1c2e-41ff-ac03-9ad7bb3e3305",
        slug: "the-allure-of-neo-vintage-timepieces",
        title: "The allure of Neo-Vintage timepieces — why the late 90s is watch collecting's best-kept secret.",
        summary: "A deep dive into the sweet spot of watchmaking: the perfect case proportions, the romantic transition of tritium to rich pumpkin patina, and why these modern-classic references outperform contemporary size bloat.",
        bodyMarkdown: `## The Golden Era of Proportions

Walk into any watch boutique today, and you are likely to be met with case sizes that dwarf the wrists of the average collector. The "size bloat" of the late 2000s and 2010s left a generation of beautiful designs supersized and over-polished. 

Enter **Neo-Vintage**: the period broadly spanning the mid-1980s to the late 1990s. This was watchmaking's transition era, where classic aesthetic DNA met modern build reliability. You get sapphire crystals that don't scratch easily, solid end-link bracelets, and workhorse movements that any competent independent watchmaker can service—yet the proportions remain beautifully classical, thin, and wearable.

## The Magic of Tritium Patina

The single most romantic element of neo-vintage watches is **Tritium**. Before the industry transitioned to Super-LumiNova in the late 90s, watch dials used tritium-based luminous paint. Tritium is radioactive and decays over time, losing its glow—but as it ages, the chemical compound reacts with humidity, light, and air to turn from stark white to a rich, warm, creamy tone. 

On some references, it settles into an exquisite "pumpkin orange" or "honey gold" hue. Unlike modern watches with "fauxtina" (chemically dyed Super-LumiNova designed to look old), a neo-vintage dial has authentic, slow-cooked age. Each watch has aged uniquely based on its life story. The dial is a live canvas.

## Spotting the Modern-Classics: Omega Speedmaster Automatic

A prime example of this neo-vintage sweet spot is the late-90s **Omega Speedmaster Automatic (Reduced)** references like the 3510.50 or its triple-calendar siblings. While the Speedmaster Professional "Moonwatch" carries the history, the Automatic models offered an incredibly wearable 39mm footprint, automatic convenience, and a much lower price of entry.

When you find one with tritium dial markers that have turned to a beautiful warm custard color, set against the stark black dial and a brushed steel tachymeter bezel, it has a character that no brand-new luxury chronograph can replicate. It feels alive.

## The Buying Playbook for Neo-Vintage in Manila

If you are looking to enter the neo-vintage market in the Philippines, keep three rules in mind:

1. **Prioritize Dial and Hands over Case:** A case can be polished, but a damaged tritium dial cannot be restored. Look for matching patina on the dial markers and hand lume. If the hands are stark white while the dial markers are creamy, the hands were likely replaced during a service, which reduces the collector value.
2. **Accept the Wear:** A 25-year-old watch should have hairline scratches. Be highly suspicious of neo-vintage pieces with razor-sharp lugs that look brand new—they have likely been heavily laser-welded or over-polished, losing their original lines.
3. **Budget for a Service:** Assume the watch has not been serviced recently, regardless of what the seller says. Factor a ₱8,000 to ₱15,000 mechanical overhaul into your purchase decision. Once serviced, a 90s watch is fully ready for another decade of daily wear.

Neo-vintage is not a compromise. It is a recognition that the watch industry got it right the first time, and that real character is earned, not manufactured.

*— The Watch Alley desk*`,
        heroImage: urls["neo-vintage.png"],
        tags: ["Neo-Vintage", "Speedmaster", "Patina", "Collecting"],
        status: "published",
        author: "The Watch Alley",
        readMinutes: 5,
        publishAt: new Date().toISOString()
      },
      {
        id: "1288be52-02a9-4441-98be-5f70a4b0c5f9",
        slug: "watch-straps-philippine-tropics-guide",
        title: "Survival in the tropics — a Manila collector's guide to the best summer watch straps.",
        summary: "Untreated suede, cheap silicone, and unlined exotic leathers will rot in Philippine humidity. We evaluate FKM rubber, Perlon, and NATO options to keep your wrist cool and your watch secure.",
        bodyMarkdown: `## The Tropical Humidity Tax

Any watch enthusiast living in the Philippines knows the dread of the summer heat. You step out of an air-conditioned room in BGC, and within five minutes, your wrist is covered in sweat. 

If your watch is on a premium Italian suede strap or an unlined alligator band, you are actively destroying it. Sweat contains salts and acids that penetrate leather fibers, causing them to stiffen, crack, and develop an unpleasant odor. 

To survive the Philippine climate, you need to swap your leather for straps engineered to breathe, repel water, and stand up to high humidity. Here is our direct evaluation of what actually works.

## 1. FKM Rubber (The Modern Standard)

Do not confuse **FKM (Fluoroelastomer) rubber** with cheap silicone. Silicone straps are lint-magnets, feel sticky against the skin, and tear easily. FKM is a high-density rubber that is extremely supple, completely dust-resistant, and chemically stable. 

Whether you opt for a vintage-style **Tropic rubber strap** (featuring micro-perforations that let air reach the skin) or a clean **Waffle strap**, FKM is the ultimate summer daily. It can be washed with hand soap in the sink, dries instantly, and gives any sport watch a rugged, functional tool aesthetic.

## 2. Perlon (The Ultimate Breathability)

For dressier pieces or lightweight field watches, **Perlon** is the undisputed champion of the heat. Perlon is made of braided nylon threads. Because it is a woven mesh, there are no pre-punched buckle holes—you simply pass the buckle prong directly through the weave at the exact millimeter that fits your wrist.

The woven structure makes it incredibly breathable, allowing sweat to evaporate immediately. If it gets dirty, throw it in a mesh laundry bag and toss it in the washing machine. It comes out looking brand new.

## 3. NATO Straps (A Double-Edged Sword)

NATO straps are incredibly popular, but they come with a warning for the tropics: **they hold moisture**. A thick, tightly woven seatbelt NATO feels premium, but once it gets wet from sweat or a sudden Manila downpour, it will stay damp against your skin for hours.

If you love the military look of a NATO, opt for lightweight, single-pass nylon straps rather than heavy double-layer NATOs, and wash them frequently to prevent salt buildup.

## The Materials to Avoid

* **Untreated Suede and Nubuck:** They act like sponges for sweat and will stain permanently within weeks of daily wear in Manila.
* **Cheap Silicone:** They trap heat, attract lint, and feel sticky.
* **Unlined Leather:** If the underside of the strap is raw leather without a water-resistant lining, it will degrade rapidly.

## The Summer Rotation Ritual

Just as you rotate your watches, rotate your straps. Give a nylon or rubber strap a quick rinse in fresh water at the end of a hot day. Taking two minutes to flush out sweat and skin oils will easily double the lifespan of your straps and keep your wrist free of irritation.

*— The Watch Alley desk*`,
        heroImage: urls["watch-straps.png"],
        tags: ["Straps", "Guide", "Tropics", "Maintenance"],
        status: "published",
        author: "The Watch Alley",
        readMinutes: 4,
        publishAt: new Date().toISOString()
      },
      {
        id: "968c9167-f47f-4f37-920f-9da26b7aeff8",
        slug: "grand-seiko-spring-drive-poetry-of-time",
        title: "Grand Seiko, the Spring Drive, and the quiet poetry of silent time.",
        summary: "How a twenty-year obsession birthed the ultimate hybrid movement—fusing mechanical romance with quartz precision to create a second hand that doesn't tick, but glides like time itself.",
        bodyMarkdown: `## The Silent Sweep

Watch a mechanical watch, and you will see the second hand beat—usually six to eight times a second. Watch a quartz watch, and you will see it tick once every second. 

But watch a **Grand Seiko Spring Drive**, and you will witness something entirely different: a blued steel hand that glides in a perfectly continuous, completely silent sweep. There is no stutter, no vibration, and no sound. It is a visual representation of time as a continuous flow, a philosophical signature that could only have come from Japan.

## Fusing Two Worlds

The development of the Spring Drive is one of watchmaking's great obsessive quests. It took Yoshikazu Akahane, a young engineer at Suwa Seikosha (now Seiko Epson), over twenty years, 600 prototypes, and dozens of patents to bring the movement to commercial viability in 1999.

The core genius of Spring Drive lies in its hybrid architecture. It is not a quartz watch, nor is it a traditional mechanical watch. 

* **The Power Source:** Like a mechanical watch, it is powered entirely by a mainspring wound by a rotor. There is no battery, no capacitor, and no electrical storage.
* **The Regulator:** Traditional mechanical watches use a hairspring and escapement to regulate the release of energy. The Spring Drive replaces this with a **Tri-Synchro Regulator**.
* **The Brake:** The mainspring unwinds, turning a wheel called the **Glide Wheel**. As the glide wheel spins, it generates a tiny electric current (just a few nanowatts). This current powers a quartz crystal oscillator and an integrated circuit (IC). The IC compares the spin speed of the glide wheel against the precise vibration of the quartz crystal and applies an electromagnetic brake to keep the glide wheel spinning at exactly eight rotations per second.

The result: a watch with the soul and winding romance of a mechanical movement, but with an incredible quartz accuracy of ±1 second per day.

## The Collector's Grail: Grand Seiko Snowflake SBGA211

While Spring Drive powers many high-end Seiko and Grand Seiko references, its spiritual home is the **Grand Seiko Snowflake SBGA211**. 

Constructed of high-intensity titanium (which is 30% lighter than steel and highly scratch-resistant), the Snowflake is famous for its pure white dial. The dial texture is inspired by the wind-blown snow on the mountains surrounding the Shinshu Watch Studio in Shiojiri, where all Spring Drive pieces are hand-assembled.

When you look at the textured, paper-like snow dial, framed by Zaratsu-polished titanium indices, and watch that blued steel second hand glide silently across the snowscape, you realize that this is not just engineering. It is poetry in motion.

## Why the Swiss Dismissed It (And Why They Were Wrong)

When Seiko first demonstrated Spring Drive concepts to the Swiss industry, many dismissed it as a gimmick or a "cheat" because it used a quartz crystal. 

* Reference: Spring Drive represents the peak of modern horological innovation. It does not compromise the craft of mechanical watchmaking; instead, it elevates it by solving the mechanical escapement's oldest enemy: friction. 
* By using an electromagnetic brake instead of physical pallet stones striking an escape wheel, a Spring Drive movement undergoes far less wear and tear, ensuring long-term reliability and a lifetime of silent, mesmerizing glide.

*— The Watch Alley desk*`,
        heroImage: urls["gs-spring-drive.png"],
        tags: ["Grand Seiko", "Spring Drive", "Snowflake", "Japanese Craft"],
        status: "published",
        author: "The Watch Alley",
        readMinutes: 5,
        publishAt: new Date().toISOString()
      }
    ];

    for (const article of newArticles) {
      console.log(`Upserting live DB post for: "${article.slug}" with CDN URL...`);
      await callUpsertRpc(article, accessToken);
      console.log(`Successfully upserted "${article.slug}"!`);
    }

    // 3. Write the updated SQL migration file so that the CDN URLs are persistent in Git
    console.log("\nUpdating SQL database migration seed file with direct Supabase Storage CDN URLs...");
    const sqlPath = '/Users/buloy/projects/watch-alley/docs/migrations/0022-watch-alley-premium-journal-expansion.sql';
    const sqlContent = `-- Docs Migration: 0022-watch-alley-premium-journal-expansion.sql
-- ===========================================================================
-- Clean up the graduation toga picture set on the Whiskered Pitta Seiko Alpinist article
-- and inject three highly detailed premium localized watch collecting articles.
-- ===========================================================================

-- 1. Clean the toga picture placeholder and replace it with the macro Alpinist steel bracelet shot
update watch_alley.journal_posts
set hero_image = '${urls["whiskered-pitta.png"]}'
where slug = 'seiko-launches-5th-philippine-limited-edition';

-- 2. Upsert the three brand new articles with automatic conflict resolution on unique slug
insert into watch_alley.journal_posts (
  slug, title, summary, body_markdown, hero_image, tags, status, author, read_minutes, published_at
)
values (
  'the-allure-of-neo-vintage-timepieces',
  'The allure of Neo-Vintage timepieces — why the late 90s is watch collecting''s best-kept secret.',
  'A deep dive into the sweet spot of watchmaking: the perfect case proportions, the romantic transition of tritium to rich pumpkin patina, and why these modern-classic references outperform contemporary size bloat.',
  '## The Golden Era of Proportions

Walk into any watch boutique today, and you are likely to be met with case sizes that dwarf the wrists of the average collector. The ''size bloat'' of the late 2000s and 2010s left a generation of beautiful designs supersized and over-polished. 

Enter **Neo-Vintage**: the period broadly spanning the mid-1980s to the late 1990s. This was watchmaking''s transition era, where classic aesthetic DNA met modern build reliability. You get sapphire crystals that don''t scratch easily, solid end-link bracelets, and workhorse movements that any competent independent watchmaker can service—yet the proportions remain beautifully classical, thin, and wearable.

## The Magic of Tritium Patina

The single most romantic element of neo-vintage watches is **Tritium**. Before the industry transitioned to Super-LumiNova in the late 90s, watch dials used tritium-based luminous paint. Tritium is radioactive and decays over time, losing its glow—but as it ages, the chemical compound reacts with humidity, light, and air to turn from stark white to a rich, warm, creamy tone. 

On some references, it settles into an exquisite ''pumpkin orange'' or ''honey gold'' hue. Unlike modern watches with ''fauxtina'' (chemically dyed Super-LumiNova designed to look old), a neo-vintage dial has authentic, slow-cooked age. Each watch has aged uniquely based on its life story. The dial is a live canvas.

## Spotting the Modern-Classics: Omega Speedmaster Automatic

A prime example of this neo-vintage sweet spot is the late-90s **Omega Speedmaster Automatic (Reduced)** references like the 3510.50 or its triple-calendar siblings. While the Speedmaster Professional ''Moonwatch'' carries the history, the Automatic models offered an incredibly wearable 39mm footprint, automatic convenience, and a much lower price of entry.

When you find one with tritium dial markers that have turned to a beautiful warm custard color, set against the stark black dial and a brushed steel tachymeter bezel, it has a character that no brand-new luxury chronograph can replicate. It feels alive.

## The Buying Playbook for Neo-Vintage in Manila

If you are looking to enter the neo-vintage market in the Philippines, keep three rules in mind:

1. **Prioritize Dial and Hands over Case:** A case can be polished, but a damaged tritium dial cannot be restored. Look for matching patina on the dial markers and hand lume. If the hands are stark white while the dial markers are creamy, the hands were likely replaced during a service, which reduces the collector value.
2. **Accept the Wear:** A 25-year-old watch should have hairline scratches. Be highly suspicious of neo-vintage pieces with razor-sharp lugs that look brand new—they have likely been heavily laser-welded or over-polished, losing their original lines.
3. **Budget for a Service:** Assume the watch has not been serviced recently, regardless of what the seller says. Factor a ₱8,000 to ₱15,000 mechanical overhaul into your purchase decision. Once serviced, a 90s watch is fully ready for another decade of daily wear.

Neo-vintage is not a compromise. It is a recognition that the watch industry got it right the first time, and that real character is earned, not manufactured.

*— The Watch Alley desk*',
  '${urls["neo-vintage.png"]}',
  array['Neo-Vintage', 'Speedmaster', 'Patina', 'Collecting'],
  'published',
  'The Watch Alley',
  5,
  now()
),
(
  'watch-straps-philippine-tropics-guide',
  'Survival in the tropics — a Manila collector''s guide to the best summer watch straps.',
  'Untreated suede, cheap silicone, and unlined exotic leathers will rot in Philippine humidity. We evaluate FKM rubber, Perlon, and NATO options to keep your wrist cool and your watch secure.',
  '## The Tropical Humidity Tax

Any watch enthusiast living in the Philippines knows the dread of the summer heat. You step out of an air-conditioned room in BGC, and within five minutes, your wrist is covered in sweat. 

If your watch is on a premium Italian suede strap or an unlined alligator band, you are actively destroying it. Sweat contains salts and acids that penetrate leather fibers, causing them to stiffen, crack, and develop an unpleasant odor. 

To survive the Philippine climate, you need to swap your leather for straps engineered to breathe, repel water, and stand up to high humidity. Here is our direct evaluation of what actually works.

## 1. FKM Rubber (The Modern Standard)

Do not confuse **FKM (Fluoroelastomer) rubber** with cheap silicone. Silicone straps are lint-magnets, feel sticky against the skin, and tear easily. FKM is a high-density rubber that is extremely supple, completely dust-resistant, and chemically stable. 

Whether you opt for a vintage-style **Tropic rubber strap** (featuring micro-perforations that let air reach the skin) or a clean **Waffle strap**, FKM is the ultimate summer daily. It can be washed with hand soap in the sink, dries instantly, and gives any sport watch a rugged, functional tool aesthetic.

## 2. Perlon (The Ultimate Breathability)

For dressier pieces or lightweight field watches, **Perlon** is the undisputed champion of the heat. Perlon is made of braided nylon threads. Because it is a woven mesh, there are no pre-punched buckle holes—you simply pass the buckle prong directly through the weave at the exact millimeter that fits your wrist.

The woven structure makes it incredibly breathable, allowing sweat to evaporate immediately. If it gets dirty, throw it in a mesh laundry bag and toss it in the washing machine. It comes out looking brand new.

## 3. NATO Straps (A Double-Edged Sword)

NATO straps are incredibly popular, but they come with a warning for the tropics: **they hold moisture**. A thick, tightly woven seatbelt NATO feels premium, but once it gets wet from sweat or a sudden Manila downpour, it will stay damp against your skin for hours.

If you love the military look of a NATO, opt for lightweight, single-pass nylon straps rather than heavy double-layer NATOs, and wash them frequently to prevent salt buildup.

## The Materials to Avoid

* **Untreated Suede and Nubuck:** They act like sponges for sweat and will stain permanently within weeks of daily wear in Manila.
* **Cheap Silicone:** They trap heat, attract lint, and feel sticky.
* **Unlined Leather:** If the underside of the strap is raw leather without a water-resistant lining, it will degrade rapidly.

## The Summer Rotation Ritual

Just as you rotate your watches, rotate your straps. Give a nylon or rubber strap a quick rinse in fresh water at the end of a hot day. Taking two minutes to flush out sweat and skin oils will easily double the lifespan of your straps and keep your wrist free of irritation.

*— The Watch Alley desk*',
  '${urls["watch-straps.png"]}',
  array['Straps', 'Guide', 'Tropics', 'Maintenance'],
  'published',
  'The Watch Alley',
  4,
  now()
),
(
  'grand-seiko-spring-drive-poetry-of-time',
  'Grand Seiko, the Spring Drive, and the quiet poetry of silent time.',
  'How a twenty-year obsession birthed the ultimate hybrid movement—fusing mechanical romance with quartz precision to create a second hand that doesn''t tick, but glides like time itself.',
  '## The Silent Sweep

Watch a mechanical watch, and you will see the second hand beat—usually six to eight times a second. Watch a quartz watch, and you will see it tick once every second. 

But watch a **Grand Seiko Spring Drive**, and you will witness something entirely different: a blued steel hand that glides in a perfectly continuous, completely silent sweep. There is no stutter, no vibration, and no sound. It is a visual representation of time as a continuous flow, a philosophical signature that could only have come from Japan.

## Fusing Two Worlds

The development of the Spring Drive is one of watchmaking''s great obsessive quests. It took Yoshikazu Akahane, a young engineer at Suwa Seikosha (now Seiko Epson), over twenty years, 600 prototypes, and dozens of patents to bring the movement to commercial viability in 1999.

The core genius of Spring Drive lies in its hybrid architecture. It is not a quartz watch, nor is it a traditional mechanical watch. 

* **The Power Source:** Like a mechanical watch, it is powered entirely by a mainspring wound by a rotor. There is no battery, no capacitor, and no electrical storage.
* **The Regulator:** Traditional mechanical watches use a hairspring and escapement to regulate the release of energy. The Spring Drive replaces this with a **Tri-Synchro Regulator**.
* **The Brake:** The mainspring unwinds, turning a wheel called the **Glide Wheel**. As the glide wheel spins, it generates a tiny electric current (just a few nanowatts). This current powers a quartz crystal oscillator and an integrated circuit (IC). The IC compares the spin speed of the glide wheel against the precise vibration of the quartz crystal and applies an electromagnetic brake to keep the glide wheel spinning at exactly eight rotations per second.

The result: a watch with the soul and winding romance of a mechanical movement, but with an incredible quartz accuracy of ±1 second per day.

## The Collector''s Grail: Grand Seiko Snowflake SBGA211

While Spring Drive powers many high-end Seiko and Grand Seiko references, its spiritual home is the **Grand Seiko Snowflake SBGA211**. 

Constructed of high-intensity titanium (which is 30% lighter than steel and highly scratch-resistant), the Snowflake is famous for its pure white dial. The dial texture is inspired by the wind-blown snow on the mountains surrounding the Shinshu Watch Studio in Shiojiri, where all Spring Drive pieces are hand-assembled.

When you look at the textured, paper-like snow dial, framed by Zaratsu-polished titanium indices, and watch that blued steel second hand glide silently across the snowscape, you realize that this is not just engineering. It is poetry in motion.

## Why the Swiss Dismissed It (And Why They Were Wrong)

When Seiko first demonstrated Spring Drive concepts to the Swiss industry, many dismissed it as a gimmick or a ''cheat'' because it used a quartz crystal. 

* Reference: Spring Drive represents the peak of modern horological innovation. It does not compromise the craft of mechanical watchmaking; instead, it elevates it by solving the mechanical escapement''s oldest enemy: friction. 
* By using an electromagnetic brake instead of physical pallet stones striking an escape wheel, a Spring Drive movement undergoes far less wear and tear, ensuring long-term reliability and a lifetime of silent, mesmerizing glide.

*— The Watch Alley desk*',
  '${urls["gs-spring-drive.png"]}',
  array['Grand Seiko', 'Spring Drive', 'Snowflake', 'Japanese Craft'],
  'published',
  'The Watch Alley',
  5,
  now()
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  body_markdown = excluded.body_markdown,
  hero_image = excluded.hero_image,
  tags = excluded.tags,
  status = excluded.status,
  author = excluded.author,
  read_minutes = excluded.read_minutes,
  published_at = coalesce(watch_alley.journal_posts.published_at, excluded.published_at);
`;
    writeFileSync(sqlPath, sqlContent, 'utf8');
    console.log("Successfully backfilled docs migration SQL file with direct Supabase Storage URLs!");

    console.log("\nAll Storage uploads and database backfills completed successfully!");
  } catch (err) {
    console.error("Storage upload process encountered critical failure:", err.message);
    process.exit(1);
  }
}

runProcess();
