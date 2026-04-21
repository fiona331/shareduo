type InMemoryEntry = { count: number; resetAt: number };
const inMemory = new Map<string, InMemoryEntry>();

function inMemoryCheck(ip: string): boolean {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const entry = inMemory.get(ip);

  if (!entry || entry.resetAt < now) {
    inMemory.set(ip, { count: 1, resetAt: now + hourMs });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function checkRateLimit(ip: string): Promise<boolean> {
  const hasUpstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!hasUpstash) {
    return inMemoryCheck(ip);
  }

  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
  });

  const { success } = await ratelimit.limit(ip);
  return success;
}
