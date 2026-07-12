/**
 * Shared pipeline utilities.
 *
 * Common helpers used across the collection, clustering, scoring,
 * discovery, and monitoring pipelines.
 */

/** Normalize a URL for deduplication — strip trailing slashes, www, and fragments. */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.replace(/^www\./, "");
    parsed.hash = "";
    parsed.searchParams.sort();
    let result = parsed.toString();
    // Strip trailing slash for consistency (but not for root path)
    if (result.endsWith("/") && parsed.pathname !== "/") {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return url;
  }
}

/** Extract root domain from a URL or hostname. */
export function rootDomain(hostname: string): string {
  const cleaned = hostname.replace(/^www\./, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  // Handle country-code second-level domains like .co.uk
  const tld = parts[parts.length - 1] ?? "";
  const sld = parts[parts.length - 2] ?? "";
  if (["co", "com", "org", "net", "gov", "edu", "ac"].includes(sld) && tld.length === 2) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

/** Simple moving average for time series smoothing. */
export function movingAverage(values: number[], window: number): number[] {
  if (values.length === 0) return [];
  if (window <= 0) return [...values];
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length;
    result.push(Math.round(avg * 100) / 100);
  }
  return result;
}

/** Exponential moving average. */
export function exponentialMovingAverage(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const result: number[] = [values[0] ?? 0];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * (values[i] ?? 0) + (1 - alpha) * (result[i - 1] ?? 0));
  }
  return result.map((v) => Math.round(v * 100) / 100);
}

/** Calculate percentage change between two numbers. */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return Math.round(((newValue - oldValue) / Math.abs(oldValue)) * 100);
}

/** Truncate a string to max length with ellipsis. */
export function truncate(value: string, maxLength: number, ellipsis = "..."): string {
  if (value.length <= maxLength) return value;
  const sliceLen = maxLength - ellipsis.length;
  return sliceLen > 0 ? value.slice(0, sliceLen) + ellipsis : ellipsis;
}

/** Format a duration in milliseconds to human-readable string. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

/** Format bytes to human-readable string. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** Sleep for a given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry a function with exponential backoff. */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    onRetry?: (error: unknown, attempt: number) => void;
  } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      options.onRetry?.(error, attempt);
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 500;
      await sleep(delay);
    }
  }
  throw new Error("Unreachable: retry loop exhausted");
}

/** Chunk an array into smaller arrays of specified size. */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/** Deduplicate an array by a key function. */
export function dedupeBy<T, K>(array: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Safely parse JSON with a fallback value. */
export function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Pick specified keys from an object. */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result as Pick<T, K>;
}

/** Omit specified keys from an object. */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}
