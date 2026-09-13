import { Queue } from "bullmq";
import { createRedisConnection } from "../lib/redis.js";
import type { EmailJobData } from "../types/index.js";

export const EMAIL_QUEUE_NAME = "emailQueue";

// A dedicated Redis connection for the Queue object (BullMQ recommendation:
// don't share the same ioredis connection between Queue/Worker/QueueEvents).
export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 60 * 60 * 24, // keep completed jobs for a day (Bull Board visibility)
      count: 1000,
    },
    removeOnFail: false, // keep failed jobs visible in Bull Board for debugging
  },
});

/** Deterministic job id so scheduling the same email twice is a no-op (idempotency). */
export function emailJobId(emailId: string): string {
  return `email-${emailId}`;
}

/**
 * Enqueues a delayed job for the given email. Uses a deterministic jobId so
 * BullMQ silently ignores duplicate add() calls for the same email.
 */
export async function scheduleEmailJob(emailId: string, scheduledAt: Date) {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());

  await emailQueue.add(
    "send-email",
    { emailId },
    {
      delay,
      jobId: emailJobId(emailId),
    },
  );
}
