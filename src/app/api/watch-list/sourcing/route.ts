import type { NextRequest } from "next/server";
import { handleSourcingPost } from "@/lib/watch-list/server";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return handleSourcingPost(request);
}
