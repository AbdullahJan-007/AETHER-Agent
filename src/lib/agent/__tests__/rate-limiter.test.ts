import { describe, it, expect, vi } from "vitest";
import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  it("allows requests immediately when under limit", async () => {
    let now = 1000;
    const sleep = vi.fn().mockResolvedValue(undefined);
    const limiter = new RateLimiter(5, () => now, sleep);

    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }

    expect(sleep).not.toHaveBeenCalled();
  });

  it("waits until window slides when limit is exceeded", async () => {
    let now = 1000;
    const sleep = vi.fn().mockImplementation(async (ms: number) => {
      now += ms;
    });
    const limiter = new RateLimiter(2, () => now, sleep);

    await limiter.acquire();
    await limiter.acquire();
    expect(sleep).not.toHaveBeenCalled();

    await limiter.acquire();
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(now).toBeGreaterThanOrEqual(61000);
  });

  it("bypasses throttling when perMinute <= 0", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const limiter = new RateLimiter(0, () => 1000, sleep);

    for (let i = 0; i < 10; i++) {
      await limiter.acquire();
    }
    expect(sleep).not.toHaveBeenCalled();
  });

  it("aborts when signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const limiter = new RateLimiter(5);

    await expect(limiter.acquire(controller.signal)).rejects.toThrow("The operation was aborted.");
  });
});
