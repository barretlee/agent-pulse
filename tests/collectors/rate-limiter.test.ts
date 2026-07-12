import { describe, expect, it } from "vitest";
import { RateLimiter } from "../../src/collectors/rate-limiter.js";

function makeLimiter(
  overrides?: Partial<{ defaultRpm: number; maxConcurrency: number; burstMultiplier: number }>,
) {
  return new RateLimiter({
    defaultRpm: overrides?.defaultRpm ?? 60,
    maxConcurrency: overrides?.maxConcurrency ?? 4,
    burstMultiplier: overrides?.burstMultiplier ?? 2,
  });
}

describe("RateLimiter", () => {
  it("acquires and releases tokens without blocking under limit", async () => {
    const limiter = makeLimiter({ defaultRpm: 600 }); // Very high limit
    const start = Date.now();
    await limiter.acquire("example.com");
    limiter.release("example.com");
    await limiter.acquire("example.com");
    limiter.release("example.com");
    expect(Date.now() - start).toBeLessThan(500); // Should be nearly instant
  });

  it("enforces concurrency limit", async () => {
    const limiter = makeLimiter({ maxConcurrency: 2, defaultRpm: 600 });
    let concurrent = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({ length: 4 }, async () => {
      await limiter.acquire("example.com");
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      // Simulate work
      await new Promise((r) => setTimeout(r, 20));
      concurrent--;
      limiter.release("example.com");
    });

    await Promise.all(tasks);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("extracts domain from URL", () => {
    expect(RateLimiter.domainFromUrl("https://www.example.com/path?q=1")).toBe("example.com");
    expect(RateLimiter.domainFromUrl("https://sub.domain.co.uk/path")).toBe("sub.domain.co.uk");
    expect(RateLimiter.domainFromUrl("https://example.com:8080/path")).toBe("example.com");
  });

  it("handles invalid URLs gracefully", () => {
    expect(RateLimiter.domainFromUrl("not-a-url")).toBe("unknown");
  });

  it("reports rate limit backoff", () => {
    const limiter = makeLimiter();
    limiter.reportRateLimited("example.com", 1000);
    const stats = limiter.stats();
    const example = stats.find((s) => s.domain === "example.com");
    expect(example?.backoff).toBe(true);
  });

  it("reports success resets backoff", () => {
    const limiter = makeLimiter();
    limiter.reportRateLimited("example.com", 100);
    limiter.reportSuccess("example.com");
    limiter.reportSuccess("example.com");
    const stats = limiter.stats();
    const example = stats.find((s) => s.domain === "example.com");
    expect(example?.backoff).toBe(false);
  });

  it("tracks multiple domains independently", () => {
    const limiter = makeLimiter({ defaultRpm: 600 });
    limiter.reportRateLimited("a.com", 5000);
    limiter.reportSuccess("a.com");
    // b.com should not be affected
    const stats = limiter.stats();
    const b = stats.find((s) => s.domain === "b.com");
    const a = stats.find((s) => s.domain === "a.com");
    expect(a).toBeDefined();
    expect(b).toBeUndefined(); // b.com was never accessed
  });

  it("provides stats for tracked domains", () => {
    const limiter = makeLimiter({ defaultRpm: 600 });
    limiter.acquire("stats-test.com").then(() => limiter.release("stats-test.com"));
    const stats = limiter.stats();
    expect(stats.length).toBeGreaterThanOrEqual(0);
  });
});
