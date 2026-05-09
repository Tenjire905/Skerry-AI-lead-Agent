/**
 * Redact sensitive fields from any object before it leaves the server boundary
 * (logs, error reporters, traces). Conservative defaults — extend the deny
 * list as new sensitive surfaces are added.
 *
 * Used by `logEvent` and intended to be the `beforeSend` hook for the error
 * reporter (Sentry et al).
 */

const DENY_KEYS = new Set([
  "password",
  "passwd",
  "newpassword",
  "currentpassword",
  "token",
  "csrftoken",
  "x-csrf-token",
  "authorization",
  "cookie",
  "set-cookie",
  "session",
  "skerry_session",
  "skerry_csrf",
  "secret",
  "api_key",
  "apikey",
  "openai_api_key",
  "resend_api_key",
  "neverbounce_api_key",
  "apify_api_key",
  "database_url",
  "session_secret",
  "backup_encryption_key",
  "aws_secret_access_key",
]);

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 8;
const MAX_STRING = 8 * 1024; // 8 KiB — prevents accidental log bombs

const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "openai", re: /sk-[A-Za-z0-9_-]{20,}/g },
  { name: "anthropic", re: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: "resend", re: /re_[A-Za-z0-9_-]{20,}/g },
  { name: "aws-access-key", re: /AKIA[0-9A-Z]{16}/g },
  { name: "jwt", re: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
  { name: "bearer", re: /Bearer\s+[A-Za-z0-9._-]+/gi },
  // Plain email — keep the local-part hint but mask the rest.
  {
    name: "email",
    re: /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
  },
];

function scrubString(input: string): string {
  let out =
    input.length > MAX_STRING ? input.slice(0, MAX_STRING) + "…" : input;
  for (const p of SECRET_PATTERNS) {
    if (p.name === "email") {
      out = out.replace(p.re, "$1***$2");
    } else {
      out = out.replace(p.re, `[REDACTED:${p.name}]`);
    }
  }
  return out;
}

export function redact<T>(value: T, depth = 0): T {
  if (value == null) return value;
  if (depth > MAX_DEPTH) return REDACTED as unknown as T;

  if (typeof value === "string") {
    return scrubString(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(v => redact(v, depth + 1)) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (DENY_KEYS.has(k.toLowerCase())) {
        out[k] = REDACTED;
      } else {
        out[k] = redact(v, depth + 1);
      }
    }
    return out as unknown as T;
  }
  return value;
}
