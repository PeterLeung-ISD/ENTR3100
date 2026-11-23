/**
 * 輕量級滑動視窗速率限制器：保護伺服器端共享的 DeepSeek API 額度不被惡意刷爆。
 * Netlify Serverless 環境下以記憶體紀錄（單一實例內即時生效）。
 */

export type RateLimitBucket = "npc-chat" | "evaluate";

interface BucketRule {
  maxRequests: number;
  windowMs: number;
}

const BUCKET_RULES: Record<RateLimitBucket, BucketRule> = {
  "npc-chat": { maxRequests: 45, windowMs: 10 * 60 * 1000 },
  evaluate: { maxRequests: 12, windowMs: 10 * 60 * 1000 },
};

const MAX_TRACKED_KEYS = 500;
const requestLog = new Map<string, number[]>();

function extractClientIp(headers: Headers): string {
  const nfIp = (headers.get("x-nf-client-connection-ip") ?? "").trim();
  if (nfIp) return nfIp;

  const forwarded = (headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim();
  if (forwarded) return forwarded;

  const realIp = (headers.get("x-real-ip") ?? "").trim();
  if (realIp) return realIp;

  return "local";
}

function pruneStaleEntries(now: number, maxWindowMs: number): void {
  if (requestLog.size <= MAX_TRACKED_KEYS) return;
  const cutoff = now - maxWindowMs;
  for (const [key, timestamps] of requestLog.entries()) {
    const active = timestamps.filter((t) => t > cutoff);
    if (active.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, active);
    }
  }
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export function checkRateLimit(
  headers: Headers,
  bucket: RateLimitBucket,
): RateLimitDecision {
  const rule = BUCKET_RULES[bucket];
  if (process.env.DISABLE_RATE_LIMIT === "true") {
    return { allowed: true, retryAfterSeconds: 0, remaining: rule.maxRequests };
  }

  const now = Date.now();
  const ip = extractClientIp(headers);
  const key = `${bucket}:${ip}`;
  const cutoff = now - rule.windowMs;

  pruneStaleEntries(now, rule.windowMs);

  const recent = (requestLog.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= rule.maxRequests) {
    const oldestInWindow = recent[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + rule.windowMs - now) / 1000));
    requestLog.set(key, recent);
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
    };
  }

  recent.push(now);
  requestLog.set(key, recent);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, rule.maxRequests - recent.length),
  };
}
