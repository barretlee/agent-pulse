import { describe, expect, it, vi } from "vitest";
import { createSafeFetcher, type FetchError } from "../src/collectors/fetcher.js";
import { loadConfig } from "../src/config/env.js";
import {
  applySourceFailure,
  applySourceSuccess,
  transitionSource,
} from "../src/domain/source-lifecycle.js";
import { concurrentMap } from "../src/pipeline/collect.js";

const config = loadConfig({
  NODE_ENV: "test",
  DATABASE_URL: "sqlite::memory:",
  COLLECTOR_TIMEOUT_MS: "1000",
});

describe("resilient fetcher", () => {
  it("retries recoverable upstream failures and records attempts", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200, headers: { etag: '"v1"' } }));
    const sleep = vi.fn(async () => undefined);
    const fetchText = createSafeFetcher(config, {
      fetchImpl,
      sleep,
      random: () => 0,
      validateUrl: async () => undefined,
    });
    const result = await fetchText("https://example.com/feed", {}, { maxRetries: 2 });
    expect(result).toMatchObject({ body: "ok", attemptCount: 2, responseBytes: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(new Headers(fetchImpl.mock.calls[0]?.[1]?.headers).get("user-agent")).toBe(
      config.COLLECTOR_USER_AGENT,
    );
  });

  it("does not retry permanent HTTP errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("no", { status: 404 }));
    const fetchText = createSafeFetcher(config, {
      fetchImpl,
      sleep: async () => undefined,
      validateUrl: async () => undefined,
    });
    await expect(fetchText("https://example.com/missing")).rejects.toMatchObject({
      type: "permanent_http",
      retryable: false,
      attemptCount: 1,
    } satisfies Partial<FetchError>);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("honors Retry-After for rate limits", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("slow down", { status: 429, headers: { "retry-after": "2" } }),
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const sleep = vi.fn(async () => undefined);
    const fetchText = createSafeFetcher(config, {
      fetchImpl,
      sleep,
      validateUrl: async () => undefined,
    });
    await fetchText("https://example.com/feed", {}, { maxRetries: 1 });
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("validates every redirect target", async () => {
    const visited: string[] = [];
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }),
      );
    const fetchText = createSafeFetcher(config, {
      fetchImpl,
      validateUrl: async (url) => {
        visited.push(url);
        if (url.includes("127.0.0.1")) throw new Error("blocked");
      },
    });
    await expect(fetchText("https://example.com/start")).rejects.toMatchObject({
      type: "security",
    });
    expect(visited).toEqual(["https://example.com/start", "http://127.0.0.1/private"]);
  });
});

describe("source health lifecycle", () => {
  const healthy = {
    lifecycle: "active" as const,
    healthScore: 100,
    consecutiveFailures: 0,
    successCount: 0,
    failureCount: 0,
  };

  it("degrades and quarantines repeated failures", () => {
    const one = applySourceFailure(healthy);
    const two = applySourceFailure(one);
    let state = two;
    for (let index = 0; index < 3; index += 1) state = applySourceFailure(state);
    expect(one.lifecycle).toBe("active");
    expect(two.lifecycle).toBe("degraded");
    expect(state.lifecycle).toBe("quarantined");
  });

  it("recovers degraded health but keeps quarantine under human control", () => {
    const degraded = {
      ...healthy,
      lifecycle: "degraded" as const,
      healthScore: 70,
      consecutiveFailures: 2,
    };
    expect(applySourceSuccess(degraded).lifecycle).toBe("active");
    expect(applySourceSuccess({ ...degraded, lifecycle: "quarantined" }).lifecycle).toBe(
      "quarantined",
    );
    expect(transitionSource("quarantined", "restore")).toBe("shadow");
  });
});

describe("bounded collection concurrency", () => {
  it("never exceeds the configured worker count", async () => {
    let active = 0;
    let peak = 0;
    const values = Array.from({ length: 9 }, (_, index) => index);
    const result = await concurrentMap(values, 3, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return value * 2;
    });
    expect(peak).toBe(3);
    expect(result).toEqual(values.map((value) => value * 2));
  });
});
