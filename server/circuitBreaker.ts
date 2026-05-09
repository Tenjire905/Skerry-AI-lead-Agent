/**
 * Minimal in-memory circuit breaker per upstream provider.
 *
 * - CLOSED → calls go through; failures increment a rolling counter.
 * - OPEN   → calls reject immediately for `cooldownMs`. Switches to HALF_OPEN
 *            after the cooldown window.
 * - HALF_OPEN → next call is allowed; success closes the breaker, failure
 *            re-opens it for another cooldown.
 *
 * Per-process state. For a multi-instance deploy, swap the in-memory map for
 * a Redis-backed counter — the state machine stays the same.
 */

export type BreakerState = "closed" | "open" | "half_open";

interface BreakerOptions {
  failureThreshold: number; // failures within window to trip
  windowMs: number;
  cooldownMs: number;
}

interface ProviderState {
  failures: number[];
  state: BreakerState;
  openedAt: number;
}

const REGISTRY: Map<string, ProviderState> = new Map();

const DEFAULTS: BreakerOptions = {
  failureThreshold: 5,
  windowMs: 60_000,
  cooldownMs: 30_000,
};

export class CircuitOpenError extends Error {
  readonly provider: string;
  constructor(provider: string) {
    super(`circuit_open:${provider}`);
    this.name = "CircuitOpenError";
    this.provider = provider;
  }
}

function getState(provider: string): ProviderState {
  let s = REGISTRY.get(provider);
  if (!s) {
    s = { failures: [], state: "closed", openedAt: 0 };
    REGISTRY.set(provider, s);
  }
  return s;
}

export function breakerState(provider: string): BreakerState {
  return getState(provider).state;
}

/**
 * Wrap a provider call. Throws `CircuitOpenError` immediately when the
 * breaker is OPEN; otherwise runs `fn` and records the outcome.
 */
export async function withBreaker<T>(
  provider: string,
  fn: () => Promise<T>,
  partial: Partial<BreakerOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULTS, ...partial };
  const s = getState(provider);
  const now = Date.now();

  if (s.state === "open") {
    if (now - s.openedAt < opts.cooldownMs) {
      throw new CircuitOpenError(provider);
    }
    s.state = "half_open";
  }

  try {
    const result = await fn();
    if (s.state === "half_open") {
      s.state = "closed";
      s.failures = [];
    } else {
      // Drop expired failures so the breaker auto-recovers without traffic.
      s.failures = s.failures.filter(t => now - t < opts.windowMs);
    }
    return result;
  } catch (err) {
    s.failures.push(now);
    s.failures = s.failures.filter(t => now - t < opts.windowMs);
    if (s.state === "half_open" || s.failures.length >= opts.failureThreshold) {
      s.state = "open";
      s.openedAt = now;
    }
    throw err;
  }
}

/** Test-only: reset all breakers. */
export function _resetBreakers(): void {
  REGISTRY.clear();
}
