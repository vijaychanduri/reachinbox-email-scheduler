import { describe, it, expect } from "vitest";
import { msUntilNextHour } from "../services/rateLimit.service.js";

describe("rate limit time helpers", () => {
  it("msUntilNextHour returns a value between 0 and 1 hour", () => {
    const ms = msUntilNextHour(new Date());
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(ms).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("msUntilNextHour is exactly 1 hour when called right on the hour boundary", () => {
    const onTheHour = new Date(Date.UTC(2026, 0, 1, 10, 0, 0, 0));
    const ms = msUntilNextHour(onTheHour);
    expect(ms).toBe(60 * 60 * 1000);
  });

  it("msUntilNextHour is small when called just before the hour rolls over", () => {
    const almostNextHour = new Date(Date.UTC(2026, 0, 1, 10, 59, 59, 500));
    const ms = msUntilNextHour(almostNextHour);
    expect(ms).toBe(500);
  });
});
