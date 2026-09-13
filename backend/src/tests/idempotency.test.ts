import { describe, it, expect } from "vitest";
import { emailJobId } from "../queues/email.queue.js";

describe("idempotency: deterministic job ids", () => {
  it("produces the same job id for the same email id", () => {
    const emailId = "abc-123";
    expect(emailJobId(emailId)).toBe(emailJobId(emailId));
  });

  it("uses the expected 'email:<id>' format", () => {
    expect(emailJobId("xyz-789")).toBe("email:xyz-789");
  });

  it("produces different ids for different emails", () => {
    expect(emailJobId("a")).not.toBe(emailJobId("b"));
  });
});
