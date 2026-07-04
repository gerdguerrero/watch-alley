import "server-only";

/**
 * Minimal in-memory fixed-window rate limiter for abuse-prone public routes.
 *
 * Scope: per function instance. Vercel's Fluid Compute reuses instances across
 * concurrent requests, so this meaningfully throttles a single-source flood,
 * but it is NOT a distributed limit — a determined attacker spread across
 * instances needs a platform-level control (Vercel Firewall / WAF rule).
 * Treat this as the in-app seatbelt, not the crash barrier.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function pruneExpired(now: number) {
  // Cheap opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function clientIpKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Returns true when the caller is within `limit` hits per `windowMs` for the
 * given scope+key, false when the request should be rejected with 429.
 */
export function checkRateLimit(
  scope: string,
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
) {
  const now = Date.now();
  pruneExpired(now);

  const bucketKey = `${scope}:${key}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}
