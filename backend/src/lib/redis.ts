import IORedis from "ioredis";
import { env } from "../config/env.js";

// BullMQ requires maxRetriesPerRequest to be null on the connection it uses.
// We share one connection for the app, and workers create their own via the
// same factory so both processes behave consistently.
export function createRedisConnection() {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}

// General-purpose connection used for rate limiting / dedupe keys outside BullMQ.
export const redis = createRedisConnection();
