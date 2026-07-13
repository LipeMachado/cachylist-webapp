// Best-effort in-memory rate limiter (per server instance). Doesn't survive
// serverless cold starts or apply across multiple instances, but it's enough
// to blunt a single attacker hammering auth or the search/identify routes —
// especially since the DB runs on a single pooled connection (see session.ts).
interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 5000;
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  resetAt: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) {
        if (now > b.resetAt) buckets.delete(k);
      }
      if (buckets.size >= MAX_BUCKETS) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) buckets.delete(oldestKey);
      }
    }
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  return { allowed: bucket.count <= limit, resetAt: bucket.resetAt };
}

// NOTE: this trusts X-Forwarded-For/X-Real-IP as-is. That's only safe when the
// app sits behind a proxy that overwrites (rather than appends to) those
// headers on every inbound request — true on Vercel and most managed
// platforms, but if this is ever self-hosted directly behind an untrusted
// proxy (or exposed with no proxy at all), a client can set an arbitrary
// X-Forwarded-For value to get a fresh rate-limit bucket per request.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
