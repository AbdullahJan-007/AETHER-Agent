/**
 * Sliding-window rate limiter shared by every agent run in this process.
 *
 * Gemini's free tier rejects bursts above its per-minute quota, which wastes
 * a request and forces a retry. Waiting locally is cheaper and keeps long
 * agent runs moving instead of failing halfway.
 */
export class RateLimiter {
  private readonly timestamps: number[] = [];

  constructor(
    private readonly perMinute: number,
    private readonly now: () => number = Date.now,
    private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void> = abortableSleep
  ) {}

  /** Resolves once a request slot is free. Rejects with AbortError if aborted. */
  async acquire(signal?: AbortSignal): Promise<void> {
    if (this.perMinute <= 0) return;

    for (;;) {
      throwIfAborted(signal);
      const current = this.now();
      while (this.timestamps.length > 0 && current - this.timestamps[0] >= 60_000) {
        this.timestamps.shift();
      }
      if (this.timestamps.length < this.perMinute) {
        this.timestamps.push(current);
        return;
      }
      const waitMs = 60_000 - (current - this.timestamps[0]) + 50;
      await this.sleep(waitMs, signal);
    }
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

let shared: { rpm: number; limiter: RateLimiter } | null = null;

/** Process-wide limiter; rebuilt if the configured RPM changes. */
export function getSharedRateLimiter(rpm: number): RateLimiter {
  if (!shared || shared.rpm !== rpm) {
    shared = { rpm, limiter: new RateLimiter(rpm) };
  }
  return shared.limiter;
}
