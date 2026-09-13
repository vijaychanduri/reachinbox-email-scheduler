import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { createScheduledEmails } from "../services/email.service.js";
import { searchEmails } from "../services/elasticsearch.service.js";
import { env } from "../config/env.js";

const scheduleSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  recipients: z
    .array(z.string().email("Invalid recipient email"))
    .min(1, "At least one recipient is required")
    .max(5000, "Too many recipients in a single request"),
  startTime: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid startTime"),
  delayBetweenEmails: z.number().int().positive().optional(),
  hourlyLimit: z.number().int().positive().optional(),
  senderEmail: z.string().email("Invalid sender email"),
});

export async function scheduleEmails(req: Request, res: Response) {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
  }

  const data = parsed.data;

  const emails = await createScheduledEmails({
    userId: req.user!.userId,
    subject: data.subject,
    body: data.body,
    recipients: data.recipients,
    startTime: new Date(data.startTime),
    delayBetweenEmails: data.delayBetweenEmails ?? env.MIN_DELAY_BETWEEN_EMAILS,
    hourlyLimit: data.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR,
    senderEmail: data.senderEmail,
  });

  res.status(201).json({
    message: `${emails.length} emails scheduled successfully`,
    emails,
  });
}

export async function listScheduled(req: Request, res: Response) {
  const emails = await prisma.email.findMany({
    where: {
      userId: req.user!.userId,
      status: { in: ["scheduled", "processing"] },
    },
    orderBy: { scheduledAt: "asc" },
  });
  res.json({ emails });
}

export async function listSent(req: Request, res: Response) {
  const emails = await prisma.email.findMany({
    where: {
      userId: req.user!.userId,
      status: { in: ["sent", "failed"] },
    },
    orderBy: { sentAt: "desc" },
  });
  res.json({ emails });
}

export async function search(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const results = await searchEmails(req.user!.userId, q);
  res.json({ results });
}

export async function getById(req: Request, res: Response) {
  const email = await prisma.email.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!email) {
    return res.status(404).json({ error: "Email not found" });
  }
  res.json({ email });
}
