// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export function createRatelimit(requests: number, window: `${number} ${"ms" | "s" | "m" | "h" | "d"}`) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });
}

export const apiRatelimit = createRatelimit(100, "1 h");
export const incidentsRatelimit = createRatelimit(60, "1 h");
