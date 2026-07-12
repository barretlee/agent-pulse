import { describe, expect, it } from "vitest";
import {
  chunk,
  dedupeBy,
  exponentialMovingAverage,
  formatBytes,
  formatDuration,
  movingAverage,
  normalizeUrl,
  omit,
  percentChange,
  pick,
  retry,
  rootDomain,
  safeParseJson,
  truncate,
} from "../../src/pipeline/utils.js";

describe("normalizeUrl", () => {
  it("strips www prefix", () => {
    expect(normalizeUrl("https://www.example.com/path")).toBe("https://example.com/path");
  });
  it("strips trailing slash", () => {
    expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path");
  });
  it("preserves root path slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });
  it("strips hash fragments", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe("https://example.com/page");
  });
  it("handles invalid URLs gracefully", () => {
    expect(normalizeUrl("not-a-url")).toBe("not-a-url");
  });
});

describe("rootDomain", () => {
  it("extracts root domain from subdomain", () => {
    expect(rootDomain("blog.example.com")).toBe("example.com");
  });
  it("handles country TLDs", () => {
    expect(rootDomain("example.co.uk")).toBe("example.co.uk");
  });
  it("handles www prefix", () => {
    expect(rootDomain("www.example.com")).toBe("example.com");
  });
});

describe("movingAverage", () => {
  it("computes simple moving average", () => {
    const result = movingAverage([1, 2, 3, 4, 5], 3);
    expect(result[0]).toBe(1);
    expect(result[2]).toBe(2); // (1+2+3)/3
    expect(result[4]).toBe(4); // (3+4+5)/3
  });
  it("handles empty input", () => {
    expect(movingAverage([], 3)).toEqual([]);
  });
});

describe("exponentialMovingAverage", () => {
  it("computes EMA with given alpha", () => {
    const result = exponentialMovingAverage([10, 20, 10], 0.5);
    expect(result[0]).toBe(10);
    expect(result.length).toBe(3);
  });
  it("handles empty input", () => {
    expect(exponentialMovingAverage([], 0.5)).toEqual([]);
  });
});

describe("percentChange", () => {
  it("calculates positive change", () => {
    expect(percentChange(100, 150)).toBe(50);
  });
  it("calculates negative change", () => {
    expect(percentChange(100, 50)).toBe(-50);
  });
  it("handles zero old value", () => {
    expect(percentChange(0, 10)).toBe(100);
    expect(percentChange(0, 0)).toBe(0);
  });
});

describe("truncate", () => {
  it("truncates long strings", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });
  it("keeps short strings intact", () => {
    expect(truncate("hi", 10)).toBe("hi");
  });
});

describe("formatDuration", () => {
  it("formats milliseconds", () => {
    expect(formatDuration(500)).toBe("500ms");
  });
  it("formats seconds", () => {
    expect(formatDuration(5000)).toBe("5.0s");
  });
  it("formats minutes", () => {
    expect(formatDuration(125000)).toContain("m");
  });
});

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500B");
  });
  it("formats KB", () => {
    expect(formatBytes(2048)).toBe("2.0KB");
  });
  it("formats MB", () => {
    expect(formatBytes(2_000_000)).toBe("1.9MB");
  });
});

describe("chunk", () => {
  it("splits array into chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("handles empty array", () => {
    expect(chunk([], 2)).toEqual([]);
  });
});

describe("dedupeBy", () => {
  it("deduplicates by key", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "a" }];
    expect(dedupeBy(items, (x) => x.id)).toEqual([{ id: "a" }, { id: "b" }]);
  });
});

describe("safeParseJson", () => {
  it("parses valid JSON", () => {
    expect(safeParseJson('{"a":1}', {})).toEqual({ a: 1 });
  });
  it("returns fallback on invalid JSON", () => {
    expect(safeParseJson("invalid", { default: true })).toEqual({ default: true });
  });
  it("returns fallback on null/undefined", () => {
    expect(safeParseJson(null, [])).toEqual([]);
    expect(safeParseJson(undefined, [])).toEqual([]);
    expect(safeParseJson("", [])).toEqual([]);
  });
});

describe("pick", () => {
  it("picks specified keys", () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });
});

describe("omit", () => {
  it("omits specified keys", () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ["b"])).toEqual({ a: 1, c: 3 });
  });
});

describe("retry", () => {
  it("succeeds on first attempt", async () => {
    const result = await retry(async () => "ok");
    expect(result).toBe("ok");
  });
  it("retries on failure and succeeds", async () => {
    let attempts = 0;
    const result = await retry(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error("fail");
        return "recovered";
      },
      { maxAttempts: 3, baseDelayMs: 10 },
    );
    expect(result).toBe("recovered");
    expect(attempts).toBe(3);
  });
  it("throws after exhausting retries", async () => {
    let attempts = 0;
    await expect(
      retry(
        async () => {
          attempts++;
          throw new Error("always fails");
        },
        { maxAttempts: 2, baseDelayMs: 10 },
      ),
    ).rejects.toThrow("always fails");
    expect(attempts).toBe(2);
  });
});
