import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "../lib/redis.js";
import { EMAIL_QUEUE_NAME } from "../queues/email.queue.js";
import { processEmailJob } from "../services/email.service.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import type { EmailJobData } from "../types/index.js";

// This file can run as its own process: `npm run worker`
// It is completely separate from the Express API process (see README).

const worker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>, token?: string) => {
    const { emailId } = job.data;

    const result = await processEmailJob(emailId);

    if (result.outcome === "rescheduled") {
      // Rate limit or min-delay was hit. Move this same job further into the
      // future rather than failing it or creating a new job - this keeps the
      // deterministic jobId and preserves ordering as much as possible.
      await job.moveToDelayed(Date.now() + result.delayMs, token);
      // Throwing here tells BullMQ the job is being "waited on" rather than
      // completed; moveToDelayed already updated its state.
      throw new Error("Rescheduled due to rate limiting - not a real failure");
    }

    if (result.outcome === "failed") {
      // Let BullMQ's retry/backoff policy (see queue defaultJobOptions) handle this.
      throw new Error(result.error);
    }

    // "sent" or "skipped-already-sent" -> job completes successfully.
    return result;
  },
  {
    connection: createRedisConnection(),
    concurrency: env.WORKER_CONCURRENCY,
  }
);

worker.on("ready", () => {
  logger.info("Worker started", { concurrency: env.WORKER_CONCURRENCY });
});

worker.on("failed", (job, err) => {
  logger.warn("Job failed or rescheduled", {
    jobId: job?.id,
    reason: err.message,
  });
});

worker.on("error", (err) => {
  logger.error("Worker error", { error: err.message });
});

process.on("SIGTERM", async () => {
  logger.info("Worker shutting down (SIGTERM)");
  await worker.close();
  process.exit(0);
});
