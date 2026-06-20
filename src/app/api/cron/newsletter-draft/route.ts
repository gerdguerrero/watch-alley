import { jsonError, jsonOk, requireCronSecret } from "@/lib/newsletter/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized.", 401);
  }

  return jsonOk({
    generated: false,
    message: "Cron draft generation is scaffolded but disabled pending approval.",
  });
}
