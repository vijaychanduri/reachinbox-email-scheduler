import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { scheduleEmailJob } from "../queues/email.queue.js";
import { indexEmail } from "./elasticsearch.service.js";
import { sendEmail } from "./mailer.service.js";
import {
  incrementHourlyCount,
  decrementHourlyCount,
  msUntilNextHour,
  msToWaitForMinDelay,
  markSentNow,
  shouldSendSlackRateLimitNotification,
} from "./rateLimit.service.js";
import { sendRateLimitSlackNotification } from "./slack.service.js";
import type { Email } from "@prisma/client";

export interface CreateScheduledEmailsParams {
  userId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: Date;
  delayBetweenEmails: number;
  hourlyLimit: number;
  senderEmail: string;
}

/**
 * Creates one Email row per recipient and enqueues a BullMQ delayed job for
 * each. Each recipient gets its own scheduledAt, spaced out by
 * `delayBetweenEmails` starting at `startTime`, so recipients don't all
 * literally fire at the exact same millisecond.
 */
export async function createScheduledEmails(params: CreateScheduledEmailsParams): Promise<Email[]> {
  const createdEmails: Email[] = [];

  for (let i = 0; i < params.recipients.length; i++) {
    const recipient = params.recipients[i];
    const scheduledAt = new Date(params.startTime.getTime() + i * params.delayBetweenEmails);

    const email = await prisma.email.create({
      data: {
        userId: params.userId,
        recipient,
        subject: params.subject,
        body: params.body,
        senderEmail: params.senderEmail,
        scheduledAt,
        status: "scheduled",
        delayBetweenEmails: params.delayBetweenEmails,
        hourlyLimit: params.hourlyLimit,
      },
    });

    await scheduleEmailJob(email.id, scheduledAt);
    await indexEmail(email);

    createdEmails.push(email);
  }

  logger.info("Emails scheduled", {
    count: createdEmails.length,
    sender: params.senderEmail,
  });

  return createdEmails;
}

export type ProcessResult =
  | { outcome: "sent" }
  | { outcome: "skipped-already-sent" }
  | { outcome: "rescheduled"; delayMs: number }
  | { outcome: "failed"; error: string };

/**
 * Processes a single email job. This is the heart of the idempotency and
 * rate limiting logic described in the README:
 *
 *  1. Load the email fresh from PostgreSQL (source of truth).
 *  2. If already "sent", do nothing (protects against duplicate delivery).
 *  3. Check the Redis-backed hourly limit. If exceeded, tell the caller to
 *     reschedule the BullMQ job for the next hour window instead of sending.
 *  4. Check the Redis-backed minimum delay. If we sent something for this
 *     sender too recently, tell the caller how long to wait.
 *  5. Mark as "processing", send via Ethereal, then mark "sent"/"failed".
 */
export async function processEmailJob(emailId: string): Promise<ProcessResult> {
  const email = await prisma.email.findUnique({ where: { id: emailId } });

  if (!email) {
    logger.error("Email not found for job", { emailId });
    return { outcome: "failed", error: "Email record not found" };
  }

  if (email.status === "sent") {
    logger.info("Email already sent, skipping (idempotency)", { emailId });
    return { outcome: "skipped-already-sent" };
  }

  // --- Hourly rate limit check ---
  const hourlyCount = await incrementHourlyCount(email.senderEmail);
  if (hourlyCount > email.hourlyLimit) {
    // We already incremented - give the slot back since we're not sending.
    await decrementHourlyCount(email.senderEmail);

    const delayMs = msUntilNextHour();
    logger.warn("Hourly rate limit reached, rescheduling job", {
      emailId,
      sender: email.senderEmail,
      limit: email.hourlyLimit,
    });

    const notify = await shouldSendSlackRateLimitNotification(email.senderEmail);
    if (notify) {
      const now = new Date();
      const windowStart = `${String(now.getUTCHours()).padStart(2, "0")}:00`;
      const nextHour = (now.getUTCHours() + 1) % 24;
      const windowEnd = `${String(nextHour).padStart(2, "0")}:00`;

      await sendRateLimitSlackNotification({
        userId: email.userId,
        senderEmail: email.senderEmail,
        hourlyLimit: email.hourlyLimit,
        windowStart,
        windowEnd,
      });
    }

    return { outcome: "rescheduled", delayMs };
  }

  // --- Minimum delay between emails check ---
  const waitMs = await msToWaitForMinDelay(email.senderEmail, email.delayBetweenEmails);
  if (waitMs > 0) {
    await decrementHourlyCount(email.senderEmail); // give back the slot, we'll recount on retry
    return { outcome: "rescheduled", delayMs: waitMs };
  }

  // --- Mark as processing (idempotency guard) ---
  const claimed = await prisma.email.updateMany({
    where: { id: email.id, status: { in: ["scheduled", "failed"] } },
    data: { status: "processing" },
  });

  if (claimed.count === 0) {
    // Another worker already claimed/sent it.
    logger.info("Email already claimed by another worker", { emailId });
    return { outcome: "skipped-already-sent" };
  }

  try {
    const result = await sendEmail({
      from: email.senderEmail,
      to: email.recipient,
      subject: email.subject,
      text: email.body,
    });

    const updated = await prisma.email.update({
      where: { id: email.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        messageId: result.messageId,
        previewUrl: result.previewUrl,
        error: null,
      },
    });

    await markSentNow(email.senderEmail);
    await indexEmail(updated);

    logger.info("Email sent", { emailId, recipient: email.recipient });
    return { outcome: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    const updated = await prisma.email.update({
      where: { id: email.id },
      data: { status: "failed", error: message },
    });

    await indexEmail(updated);

    logger.error("Email send failed", { emailId, error: message });
    return { outcome: "failed", error: message };
  }
}
