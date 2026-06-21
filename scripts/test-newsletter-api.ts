import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

async function run() {
  const supabase = createClient(url, anonKey);

  console.log("Signing in with admin temp credentials...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "admin_temp@thewatchalley.com",
    password: "SuperSecurePassword123!Temporary",
  });

  if (authError || !authData.session) {
    console.error("Authentication failed:", authError?.message);
    process.exit(1);
  }

  const token = authData.session.access_token;
  console.log("Successfully signed in. Token obtained.");

  // Test 1: Generate Draft
  console.log("\n--- Testing: Generate Draft API ---");
  const uniqueTitle = `Integration Test ${Date.now()}`;
  console.log(`Calling POST /api/newsletter/generate-draft with title: "${uniqueTitle}"...`);
  
  const generateRes = await fetch("http://localhost:3000/api/newsletter/generate-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ title: uniqueTitle })
  });

  const generateBody = await generateRes.json() as any;
  if (!generateRes.ok || !generateBody.ok) {
    console.error("Draft generation failed:", generateBody);
    process.exit(1);
  }

  console.log("Success! Draft generated response status ok.");
  const issueId = generateBody.issue?.issue?.id;
  if (!issueId) {
    console.error("Could not find issue ID in the response.");
    process.exit(1);
  }
  console.log(`Generated Issue ID: ${issueId}`);

  // Test 2: Send Test Email
  console.log("\n--- Testing: Send Test Email API ---");
  const recipient = process.env.NEWSLETTER_TEST_RECIPIENT || "virongestrada@gmail.com";
  console.log(`Calling POST /api/newsletter/send-test for recipient: ${recipient}...`);

  const sendRes = await fetch("http://localhost:3000/api/newsletter/send-test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      issueId,
      recipient
    })
  });

  const sendBody = await sendRes.json() as any;
  if (!sendRes.ok || !sendBody.ok) {
    console.error("Send test failed:", sendBody);
    process.exit(1);
  }

  console.log("Success! Send test response:", sendBody);
  console.log("\nAll integration tests passed successfully!");
}

run().catch(err => {
  console.error("Error running integration test:", err);
  process.exit(1);
});
