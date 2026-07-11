import { resolve4, resolve6 } from "node:dns/promises";
import { isIP } from "node:net";
import type { AppConfig } from "../config/env.js";
import type { FetchResult } from "./types.js";

const MAX_BODY_BYTES = 5 * 1024 * 1024;

export function createSafeFetcher(config: AppConfig) {
  return async (urlValue: string, headers: Record<string, string> = {}): Promise<FetchResult> => {
    await assertPublicHttpUrl(urlValue);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.COLLECTOR_TIMEOUT_MS);
    try {
      const response = await fetch(urlValue, {
        headers: {
          accept:
            "application/json, application/rss+xml, application/atom+xml, text/html;q=0.9, */*;q=0.5",
          "user-agent": config.COLLECTOR_USER_AGENT,
          ...headers,
        },
        redirect: "follow",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${urlValue}`);
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength > MAX_BODY_BYTES)
        throw new Error(`Response exceeds ${MAX_BODY_BYTES} bytes`);
      const body = await response.text();
      if (Buffer.byteLength(body) > MAX_BODY_BYTES)
        throw new Error(`Response exceeds ${MAX_BODY_BYTES} bytes`);
      return { body, status: response.status, headers: response.headers };
    } finally {
      clearTimeout(timeout);
    }
  };
}

export async function assertPublicHttpUrl(value: string): Promise<void> {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("Only HTTP(S) sources are allowed");
  if (url.username || url.password) throw new Error("Credentials in source URLs are not allowed");

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost"))
    throw new Error("Local source URLs are blocked");
  const addresses = isIP(hostname)
    ? [hostname]
    : [
        ...(await resolve4(hostname).catch(() => [])),
        ...(await resolve6(hostname).catch(() => [])),
      ];
  if (addresses.length === 0) throw new Error(`Cannot resolve source hostname: ${hostname}`);
  if (addresses.some(isPrivateAddress))
    throw new Error(`Private source address blocked: ${hostname}`);
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4) return false;
  const [a = -1, b = -1] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}
