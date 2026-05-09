/**
 * Thin observability shim. Today: no-op unless `SENTRY_DSN` is set, in which
 * case it tries to load the optional `@sentry/node` peer dep at runtime.
 *
 * Why a shim: Sentry needs a DSN that we don't ship. We want the integration
 * point on the production code path now so adding it later is a config change,
 * not a code change.
 *
 * To activate:
 *   pnpm add @sentry/node
 *   export SENTRY_DSN=https://...
 *   export SENTRY_TRACES_SAMPLE_RATE=0.05
 */

import { redact } from "./redact";

interface CaptureContext {
  requestId?: string;
  userId?: string;
  route?: string;
  extra?: Record<string, unknown>;
}

interface Reporter {
  captureException(err: unknown, ctx?: CaptureContext): void;
  captureMessage(msg: string, ctx?: CaptureContext): void;
  flush(timeoutMs?: number): Promise<boolean>;
}

const noopReporter: Reporter = {
  captureException: () => {},
  captureMessage: () => {},
  flush: async () => true,
};

let reporter: Reporter = noopReporter;

export async function initObservability(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    // Optional peer dep — only loaded when DSN configured. The dynamic import
    // keeps the bundle small in environments without observability. We do
    // not depend on Sentry's types so the package can stay an optional peer.
    type SentryShape = {
      init: (config: Record<string, unknown>) => void;
      captureException: (err: unknown) => void;
      captureMessage: (msg: string) => void;
      withScope: (cb: (scope: SentryScope) => void) => void;
      flush: (timeoutMs?: number) => Promise<boolean>;
    };
    type SentryScope = {
      setTag: (k: string, v: string) => void;
      setUser: (u: { id?: string }) => void;
      setContext: (k: string, v: unknown) => void;
    };
    const moduleId = "@sentry/node";
    const Sentry = (await import(/* @vite-ignore */ moduleId).catch(
      () => null
    )) as SentryShape | null;
    if (!Sentry?.init) return;

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      release: process.env.GIT_SHA ?? undefined,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.0"),
      sendDefaultPii: false,
      beforeSend(event: unknown) {
        // Defense in depth: even though Sentry has its own scrubbers, we
        // run our redactor against the entire payload before send.
        return redact(event);
      },
    });

    reporter = {
      captureException(err, ctx) {
        Sentry.withScope((scope: SentryScope) => {
          if (ctx?.requestId) scope.setTag("request_id", ctx.requestId);
          if (ctx?.route) scope.setTag("route", ctx.route);
          if (ctx?.userId) scope.setUser({ id: ctx.userId });
          if (ctx?.extra) scope.setContext("extra", redact(ctx.extra));
          Sentry.captureException(err);
        });
      },
      captureMessage(msg, ctx) {
        Sentry.withScope((scope: SentryScope) => {
          if (ctx?.requestId) scope.setTag("request_id", ctx.requestId);
          if (ctx?.route) scope.setTag("route", ctx.route);
          if (ctx?.userId) scope.setUser({ id: ctx.userId });
          if (ctx?.extra) scope.setContext("extra", redact(ctx.extra));
          Sentry.captureMessage(msg);
        });
      },
      async flush(timeoutMs = 2000) {
        return Sentry.flush(timeoutMs);
      },
    };
    // eslint-disable-next-line no-console
    console.log("[observability] Sentry initialized");
  } catch {
    // @sentry/node is not installed; stay no-op.
  }
}

export function captureException(err: unknown, ctx?: CaptureContext): void {
  reporter.captureException(err, ctx);
}

export function captureMessage(msg: string, ctx?: CaptureContext): void {
  reporter.captureMessage(msg, ctx);
}

export async function flushObservability(timeoutMs = 2000): Promise<void> {
  await reporter.flush(timeoutMs);
}
