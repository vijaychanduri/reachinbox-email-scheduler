import { describe, it, expect } from "vitest";
import { z } from "zod";

// Mirrors the validation schema used in emails.controller.ts.
// Kept as a standalone copy here so the test has no dependency on a live
// database/Prisma client - it purely tests the validation rules.
const scheduleSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1).max(5000),
  startTime: z.string().refine((v) => !isNaN(Date.parse(v))),
  delayBetweenEmails: z.number().int().positive().optional(),
  hourlyLimit: z.number().int().positive().optional(),
  senderEmail: z.string().email(),
});

describe("schedule email validation", () => {
  it("accepts a valid payload", () => {
    const result = scheduleSchema.safeParse({
      subject: "Hello",
      body: "Test email",
      recipients: ["test1@example.com", "test2@example.com"],
      startTime: new Date().toISOString(),
      delayBetweenEmails: 2000,
      hourlyLimit: 200,
      senderEmail: "sender@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid recipient email", () => {
    const result = scheduleSchema.safeParse({
      subject: "Hello",
      body: "Test",
      recipients: ["not-an-email"],
      startTime: new Date().toISOString(),
      senderEmail: "sender@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty recipients list", () => {
    const result = scheduleSchema.safeParse({
      subject: "Hello",
      body: "Test",
      recipients: [],
      startTime: new Date().toISOString(),
      senderEmail: "sender@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed startTime", () => {
    const result = scheduleSchema.safeParse({
      subject: "Hello",
      body: "Test",
      recipients: ["a@example.com"],
      startTime: "not-a-date",
      senderEmail: "sender@example.com",
    });
    expect(result.success).toBe(false);
  });
});
