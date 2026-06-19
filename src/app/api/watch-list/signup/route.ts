import type { NextRequest } from "next/server";
import { handleSignupPost } from "@/lib/watch-list/server";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return handleSignupPost(request);
}
