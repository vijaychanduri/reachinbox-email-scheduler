import { redis } from "../lib/redis.js";

/**
 * Rate limiting approach (see README "Rate Limiting Documentation" for full explanation):
 *
 * 1. Hourly limit per sender
 *    Key: email-rate:<senderEmail>:<YYYYMMDDHH>
 *    We INCR this key atomically. INCR is safe across many worker processes
 *    because Redis executes it atomically - two workers incrementing at the
 *    same time can never both "win" the same count.
 *    The key expires after ~1 hour so we never need manual cleanup.
 *
 * 2. Minimum delay between emails per sender
 *    Key: email-last-sent:<senderEmail>
 *    Stores the timestamp (ms) of the last send. Workers compare "now" against
 *    this value to see if enough time has passed. This is Redis-backed (not an
 *    in-memory JS variable) so it works correctly even with multiple worker
 *    processes/machines.
 */

function currentHourWindow(date = new Date()): string {
  // YYYYMMDDHH, e.g. 2026091219
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate()
  )}${pad(date.getUTCHours())}`;
}

function hourlyRateKey(senderEmail: string, date = new Date()): string {
  return `email-rate:${senderEmail}:${currentHourWindow(date)}`;
}

/**
 * Atomically increments the hourly counter for a sender and returns the new
 * count. Sets an expiry the first time the key is created.
 */
export async function incrementHourlyCount(senderEmail: string): Promise<number> {
  const key = hourlyRateKey(senderEmail);
  const count = await redis.incr(key);
  if (count === 1) {
    // Give a little buffer over 1 hour so a slow clock doesn't drop the key early.
    await redis.expire(key, 60 * 65);
  }
  return count;
}

/** Decrements the hourly counter - used if we need to "give back" a slot (e.g. send failed before counting). */
export async function decrementHourlyCount(senderEmail: string): Promise<void> {
  const key = hourlyRateKey(senderEmail);
  const count = await redis.decr(key);
  if (count < 0) {
    await redis.set(key, 0);
  }
}

export async function getHourlyCount(senderEmail: string): Promise<number> {
  const key = hourlyRateKey(senderEmail);
  const value = await redis.get(key);
  return value ? Number(value) : 0;
}

/** Milliseconds until the start of the next hour window (UTC). */
export function msUntilNextHour(date = new Date()): number {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next.getTime() - date.getTime();
}

const LAST_SENT_PREFIX = "email-last-sent";

export async function getLastSentAt(senderEmail: string): Promise<number | null> {
  const value = await redis.get(`${LAST_SENT_PREFIX}:${senderEmail}`);
  return value ? Number(value) : null;
}

export async function markSentNow(senderEmail: string): Promise<void> {
  await redis.set(`${LAST_SENT_PREFIX}:${senderEmail}`, Date.now(), "EX", 60 * 60 * 24);
}

/**
 * Returns how many ms the caller should wait before sending, given the
 * configured minimum delay between emails for this sender. Returns 0 if it's
 * fine to send immediately.
 */
export async function msToWaitForMinDelay(
  senderEmail: string,
  minDelayMs: number
): Promise<number> {
  const lastSentAt = await getLastSentAt(senderEmail);
  if (!lastSentAt) return 0;
  const elapsed = Date.now() - lastSentAt;
  return elapsed >= minDelayMs ? 0 : minDelayMs - elapsed;
}

const SLACK_NOTIFIED_PREFIX = "slack-rate-limit-notified";

/**
 * Returns true if this is the first time we've hit the rate limit for this
 * sender in this hour window (and marks it as notified). Ensures we send at
 * most one Slack message per sender per hour, even if many jobs are blocked.
 */
export async function shouldSendSlackRateLimitNotification(
  senderEmail: string
): Promise<boolean> {
  const key = `${SLACK_NOTIFIED_PREFIX}:${senderEmail}:${currentHourWindow()}`;
  // SET ... NX returns null if the key already existed - that's our "already notified" case.
  const result = await redis.set(key, "1", "EX", 60 * 65, "NX");
  return result === "OK";
}
