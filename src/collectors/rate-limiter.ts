/**
 * Adaptive rate limiter for collector HTTP requests.
 *
 * Provides:
 *   - Per-domain token bucket rate limiting
 *   - Global concurrency control
 *   - Automatic backoff on rate-limit responses (429)
 *   - Domain-level quota tracking
 *   - Burst allowance for small request windows
 */

export interface RateLimiterConfig {
  /** Default requests per minute per domain */
  defaultRpm: number;
  /** Maximum concurrent requests globally */
  maxConcurrency: number;
  /** Burst multiplier (extra tokens for short bursts) */
  burstMultiplier: number;
}

export interface RateLimitState {
  domain: string;
  tokens: number;
  maxTokens: number;
  lastRefill: number;
  consecutive429s: number;
  backoffUntil: number;
  requestsPerMinute: number;
}

export class RateLimiter {
  private domains = new Map<string, RateLimitState>();
  private activeRequests = 0;
  private waitQueue: Array<{ resolve: () => void }> = [];

  constructor(private config: RateLimiterConfig) {}

  /**
   * Acquire a token for a domain. Returns a promise that resolves
   * when the request is allowed to proceed.
   */
  async acquire(domain: string, requestsPerMinute = this.config.defaultRpm): Promise<void> {
    // Wait for concurrency slot
    while (this.activeRequests >= this.config.maxConcurrency) {
      await new Promise<void>((resolve) => {
        this.waitQueue.push({ resolve });
      });
    }

    // Wait for rate limit token
    const state = this.getOrCreateState(domain, requestsPerMinute);
    const now = Date.now();

    // Check backoff
    if (state.backoffUntil > now) {
      const waitMs = state.backoffUntil - now;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    // Refill tokens
    this.refillTokens(state, now);

    // Wait for a token
    while (state.tokens < 1) {
      const waitMs = this.tokenWaitMs(state);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.refillTokens(state, Date.now());
    }

    state.tokens -= 1;
    this.activeRequests++;
  }

  /**
   * Release a token after a request completes.
   */
  release(_domain: string): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    // Wake up next waiter
    const next = this.waitQueue.shift();
    if (next) next.resolve();
  }

  /**
   * Report a 429 rate-limit response, triggering backoff.
   */
  reportRateLimited(domain: string, retryAfterMs?: number): void {
    const state = this.getOrCreateState(domain, this.config.defaultRpm);
    state.consecutive429s++;
    const backoff = Math.min(
      300_000, // Max 5 minutes
      (retryAfterMs ?? 60_000) * 2 ** (state.consecutive429s - 1),
    );
    state.backoffUntil = Date.now() + backoff;
    state.tokens = 0; // Drain tokens
  }

  /**
   * Report a successful request, resetting backoff.
   */
  reportSuccess(domain: string): void {
    const state = this.domains.get(domain);
    if (!state) return;
    state.consecutive429s = Math.max(0, state.consecutive429s - 1);
    if (state.consecutive429s === 0) {
      state.backoffUntil = 0;
    }
  }

  /**
   * Get current statistics for all tracked domains.
   */
  stats(): Array<{ domain: string; tokens: number; backoff: boolean; activeRequests: number }> {
    const now = Date.now();
    const stats: Array<{
      domain: string;
      tokens: number;
      backoff: boolean;
      activeRequests: number;
    }> = [];
    for (const [domain, state] of this.domains) {
      this.refillTokens(state, now);
      stats.push({
        domain,
        tokens: Math.round(state.tokens * 100) / 100,
        backoff: state.backoffUntil > now,
        activeRequests: this.activeRequests,
      });
    }
    return stats;
  }

  /**
   * Get the domain key from a URL string.
   */
  static domainFromUrl(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return "unknown";
    }
  }

  private getOrCreateState(domain: string, requestsPerMinute: number): RateLimitState {
    let state = this.domains.get(domain);
    if (!state) {
      const rpm = Math.max(1, requestsPerMinute);
      state = {
        domain,
        tokens: rpm,
        maxTokens: rpm * this.config.burstMultiplier,
        lastRefill: Date.now(),
        consecutive429s: 0,
        backoffUntil: 0,
        requestsPerMinute: rpm,
      };
      this.domains.set(domain, state);
    } else if (requestsPerMinute < state.requestsPerMinute) {
      state.requestsPerMinute = Math.max(1, requestsPerMinute);
      state.maxTokens = state.requestsPerMinute * this.config.burstMultiplier;
      state.tokens = Math.min(state.tokens, state.maxTokens);
    }
    return state;
  }

  private refillTokens(state: RateLimitState, now: number): void {
    const elapsed = now - state.lastRefill;
    const refillRate = state.requestsPerMinute / 60_000; // tokens per ms
    const newTokens = elapsed * refillRate;
    state.tokens = Math.min(state.maxTokens, state.tokens + newTokens);
    state.lastRefill = now;
  }

  private tokenWaitMs(state: RateLimitState): number {
    const refillRate = state.requestsPerMinute / 60_000;
    const needed = 1 - state.tokens;
    return Math.ceil(needed / refillRate) + 10; // Add 10ms buffer
  }
}

/**
 * Create a default rate limiter suitable for most collector use cases.
 */
export function createDefaultRateLimiter(): RateLimiter {
  return new RateLimiter({
    defaultRpm: 30,
    maxConcurrency: 8,
    burstMultiplier: 3,
  });
}
