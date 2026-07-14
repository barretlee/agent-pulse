import { describe, expect, it, vi } from "vitest";
import { DeepSeekClient, DeepSeekError } from "../src/ai/deepseek.js";

describe("DeepSeek JSON client", () => {
  it("requests V4 Flash JSON output without exposing the key", async () => {
    const request = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        model: "deepseek-v4-flash",
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        stream: false,
      });
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-secret-value");
      return new Response(
        JSON.stringify({
          model: "deepseek-v4-flash",
          choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }],
          usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const client = new DeepSeekClient({
      apiKey: "test-secret-value",
      fetch: request as typeof fetch,
      maxAttempts: 1,
    });

    await expect(client.completeJson({ system: "system", user: "user" })).resolves.toEqual({
      value: { ok: true },
      model: "deepseek-v4-flash",
      usage: { promptTokens: 11, completionTokens: 7, totalTokens: 18 },
    });
    expect(request).toHaveBeenCalledOnce();
  });

  it("retries 429 with Retry-After and keeps API error text secret-safe", async () => {
    const wait = vi.fn(async () => undefined);
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "rate_limit" } }), {
          status: 429,
          headers: { "retry-after": "0" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ finish_reason: "stop", message: { content: "{}" } }],
          }),
          { status: 200 },
        ),
      );
    const client = new DeepSeekClient({
      apiKey: "test-secret-value",
      fetch: request as typeof fetch,
      sleep: wait,
      maxAttempts: 2,
    });

    await client.completeJson({ system: "system", user: "user" });
    expect(request).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(0);

    const unauthorized = new DeepSeekClient({
      apiKey: "test-secret-value",
      fetch: (async () =>
        new Response(
          JSON.stringify({ error: { code: "authentication_error", message: "bad key" } }),
          { status: 401 },
        )) as typeof fetch,
      maxAttempts: 1,
    });
    const error = await unauthorized
      .completeJson({ system: "system", user: "user" })
      .catch((value: unknown) => value);
    expect(error).toBeInstanceOf(DeepSeekError);
    expect(String(error)).not.toContain("test-secret-value");
    expect(String(error)).not.toContain("bad key");
  });

  it("enables V4 Pro high-effort thinking only when the request asks for it", async () => {
    const request = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        model: "deepseek-v4-pro",
        thinking: { type: "enabled" },
        reasoning_effort: "high",
        temperature: 0,
        response_format: { type: "json_object" },
      });
      return new Response(
        JSON.stringify({
          model: "deepseek-v4-pro",
          choices: [{ finish_reason: "stop", message: { content: '{"decision":"hold"}' } }],
        }),
        { status: 200 },
      );
    });
    const client = new DeepSeekClient({
      apiKey: "test-secret-value",
      model: "deepseek-v4-pro",
      fetch: request as typeof fetch,
      maxAttempts: 1,
    });

    await client.completeJson({
      system: "system",
      user: "user",
      thinking: true,
      reasoningEffort: "high",
      temperature: 0,
    });

    expect(request).toHaveBeenCalledOnce();
  });
});
