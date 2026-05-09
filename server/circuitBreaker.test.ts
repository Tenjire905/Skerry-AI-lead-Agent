import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  withBreaker,
  CircuitOpenError,
  breakerState,
  _resetBreakers,
} from "./circuitBreaker";

describe("circuit breaker", () => {
  beforeEach(() => {
    _resetBreakers();
    vi.useRealTimers();
  });

  it("stays closed while calls succeed", async () => {
    for (let i = 0; i < 10; i++) {
      await withBreaker("svc", async () => 1);
    }
    expect(breakerState("svc")).toBe("closed");
  });

  it("trips open after the failure threshold and rejects fast", async () => {
    const opts = {
      failureThreshold: 3,
      windowMs: 60_000,
      cooldownMs: 30_000,
    };
    const failing = vi.fn(async () => {
      throw new Error("boom");
    });

    for (let i = 0; i < 3; i++) {
      await expect(withBreaker("svc", failing, opts)).rejects.toThrow("boom");
    }
    expect(breakerState("svc")).toBe("open");

    // Fourth call: breaker rejects without invoking the function.
    failing.mockClear();
    await expect(withBreaker("svc", failing, opts)).rejects.toBeInstanceOf(
      CircuitOpenError
    );
    expect(failing).not.toHaveBeenCalled();
  });

  it("recovers via half-open on the next success after cooldown", async () => {
    vi.useFakeTimers();
    const opts = {
      failureThreshold: 2,
      windowMs: 60_000,
      cooldownMs: 1_000,
    };
    const failing = async () => {
      throw new Error("boom");
    };
    await expect(withBreaker("svc", failing, opts)).rejects.toThrow();
    await expect(withBreaker("svc", failing, opts)).rejects.toThrow();
    expect(breakerState("svc")).toBe("open");

    vi.advanceTimersByTime(1_500);
    // First call after cooldown is half-open; success closes the breaker.
    await withBreaker("svc", async () => "ok", opts);
    expect(breakerState("svc")).toBe("closed");
  });
});
