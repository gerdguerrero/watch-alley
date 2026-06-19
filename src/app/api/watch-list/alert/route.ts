import type { NextRequest } from "next/server";
import { handleAlertPost } from "@/lib/watch-list/server";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return handleAlertPost(request);
}
