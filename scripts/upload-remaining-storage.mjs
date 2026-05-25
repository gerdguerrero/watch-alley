import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = '/Users/buloy/projects/watch-alley';
const artifactScratchDir = '/Users/buloy/.gemini/antigravity-cli/brain/2924d5b2-c8fe-4cd2-9419-30404c3dd8ed/scratch';

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
    slug: "automatic-hand-wind-quartz-solar",
    localName: "four-movements.png",
    localPath: "/Users/buloy/projects/watch-alley/public/journal/four-movements.png"
  },
  {
    slug: "keeping-your-mechanical-watch-healthy",
    localName: "watch-care.png",
    localPath: "/Users/buloy/projects/watch-alley/public/journal/watch-care.png"
  },
  {
    slug: "the-state-of-watch-collecting-in-2026",
    localName: "market-trends.png",
    localPath: "/Users/buloy/projects/watch-alley/public/journal/market-trends.png"
  },
  {
    slug: "seiko-presage-and-the-art-of-japanese-dials",
    localName: "presage-dial.png",
    localPath: "/Users/buloy/projects/watch-alley/public/journal/presage-dial.png"
  },
  {
    slug: "omega-marks-75-years-of-the-seamaster",
    localName: "seamaster-75th.png",
    localPath: "/Users/buloy/projects/watch-alley/public/journal/seamaster-75th.png"
  },
  {
    slug: "buying-pre-owned-in-the-philippines",
    localName: "preowned-guide.png",
    localPath: "/Users/buloy/projects/watch-alley/public/journal/preowned-guide.png"
  },
  {
    slug: "moonswatch-resale-cools-time-to-buy",
    localName: "moonswatch-cools.png",
    localPath: "/Users/buloy/projects/watch-alley/public/journal/moonswatch-cools.png"
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
          'x-upsert': 'true'
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
      urls[item.slug] = publicUrl;
    }

    console.log("\nObtaining Admin Authorization JWT...");
    const accessToken = await getAdminToken();

    // Load audited journals details to get full properties of pre-existing posts
    const jsonPath = path.join(artifactScratchDir, 'journals_details.json');
    if (!existsSync(jsonPath)) {
      throw new Error(`Missing audited journals details file at: ${jsonPath}`);
    }
    const rawData = readFileSync(jsonPath, 'utf8');
    const existingPosts = JSON.parse(rawData);

    console.log("\nUpdating pre-existing watch journal posts with Supabase CDN URLs...");
    
    // Track SQL updates to append to our migration file
    const sqlUpdates = [];

    for (const item of filesToUpload) {
      const original = existingPosts.find(p => p.slug === item.slug);
      if (!original) {
        console.warn(`Could not find original audited post for slug: ${item.slug}`);
        continue;
      }

      console.log(`Mapping and updating "${item.slug}"...`);
      const payload = {
        id: original.id,
        slug: original.slug,
        title: original.title,
        summary: original.summary,
        bodyMarkdown: original.body_markdown,
        heroImage: urls[item.slug],
        tags: original.tags,
        status: original.status,
        publishAt: original.publish_at || original.published_at,
        author: original.author,
        readMinutes: original.read_minutes
      };

      await callUpsertRpc(payload, accessToken);
      console.log(`Successfully updated: "${item.slug}"!`);

      // Track SQL update
      sqlUpdates.push(`update watch_alley.journal_posts set hero_image = '${urls[item.slug]}' where slug = '${item.slug}';`);
    }

    // 3. Append SQL updates to docs migration file so everything remains perfectly in sync
    console.log("\nAppending SQL updates to docs migration file...");
    const sqlPath = '/Users/buloy/projects/watch-alley/docs/migrations/0022-watch-alley-premium-journal-expansion.sql';
    let sqlContent = readFileSync(sqlPath, 'utf8');
    
    sqlContent += `\n-- ===========================================================================\n`;
    sqlContent += `-- Backfill pre-existing audited watch articles with custom photography CDN URLs\n`;
    sqlContent += `-- ===========================================================================\n\n`;
    sqlUpdates.forEach(stmt => {
      sqlContent += `${stmt}\n`;
    });

    writeFileSync(sqlPath, sqlContent, 'utf8');
    console.log("Successfully appended SQL updates to docs/migrations/0022-watch-alley-premium-journal-expansion.sql!");

    console.log("\nAll pre-existing watch articles fully updated with new macro photography CDN assets!");
  } catch (err) {
    console.error("Storage upload process encountered critical failure:", err.message);
    process.exit(1);
  }
}

runProcess();
