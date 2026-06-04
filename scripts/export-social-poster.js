const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// Helper to parse arguments like --style=5
function getArgs() {
  const args = {};
  process.argv.slice(2).forEach(val => {
    if (val.startsWith("--")) {
      const parts = val.substring(2).split("=");
      const key = parts[0];
      const value = parts.slice(1).join("=");
      args[key] = value;
    }
  });
  return args;
}

const args = getArgs();

// Defaults
const style = args.style || "4";
const headline = args.headline || "";
const sub = args.sub || "";
const author = args.author || "";
const project = args.project || "";
const port = args.port || "3000";

// Build URL query parameters
const queryParams = new URLSearchParams();
if (style) queryParams.append("style", style);
if (headline) queryParams.append("headline", headline);
if (sub) queryParams.append("sub", sub);
if (author) queryParams.append("author", author);
if (queryParams) queryParams.append("project", project);

const baseUrl = `http://localhost:${port}/developer/social-poster`;
const fullUrl = `${baseUrl}?${queryParams.toString()}`;

console.log("🚀 Starting Watch Alley Social Poster Export...");
console.log(`📍 Targeting style: ${style}`);
console.log(`🌐 Query URL: ${fullUrl}`);

// Setup directories
const outputDir = path.join(__dirname, "../public/social");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = path.join(outputDir, "ai-can-read-ai-poster.png");

// MacOS Chrome execution path
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Execute headless screenshot
const command = `"${chromePath}" --headless --disable-gpu --screenshot="${outputPath}" --window-size=1080,1350 "${fullUrl}"`;

console.log("📸 Snapping high-res 1080x1350 screenshot via headless Chrome...");

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error("❌ Error exporting poster:", error.message);
    console.error("⚠️ Ensure your Next.js local server is running at http://localhost:3000 (pnpm dev)");
    process.exit(1);
  }
  
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log("✅ Success! Poster exported successfully.");
    console.log(`📁 File written: public/social/ai-can-read-ai-poster.png (${stats.size} bytes)`);
  } else {
    console.error("❌ Failed: Screenshot file was not written.");
    process.exit(1);
  }
});
