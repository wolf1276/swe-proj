import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";

/** Atomic shared counters; one bucket per account/action, recycled each minute. */
export async function limitMutation(userId: string, action: string, max = 20) {
  const key = `${action}:${userId}`;
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "expiresAt")
    VALUES (${key}, 1, NOW() + INTERVAL '1 minute')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= NOW() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= NOW() THEN NOW() + INTERVAL '1 minute' ELSE "RateLimitBucket"."expiresAt" END
    RETURNING "count"`;
  if (rows[0].count > max) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Try again in a minute.");
}
