import { describe, it, expect } from "vitest";
import { redact } from "./redact";

describe("redact", () => {
  it("scrubs deny-listed keys", () => {
    const out = redact({
      email: "ada@x.io",
      password: "hunter2",
      Authorization: "Bearer abc.def.ghi",
      nested: { token: "secret", ok: true },
    });
    expect(out).toMatchObject({
      password: "[REDACTED]",
      Authorization: "[REDACTED]",
      nested: { token: "[REDACTED]", ok: true },
    });
    // Email gets pattern-masked, not deny-listed (we keep the local-part hint).
    expect((out as { email: string }).email).toMatch(/^a\*\*\*@x\.io$/);
  });

  it("masks secret patterns inside free-text strings", () => {
    const out = redact({
      msg: "failure: sk-1234567890ABCDEFGHIJKLMNOPQRST hit limit",
    });
    expect((out as { msg: string }).msg).toContain("[REDACTED:openai]");
    expect((out as { msg: string }).msg).not.toContain("sk-1234567890");
  });

  it("caps over-long strings", () => {
    const long = "a".repeat(20_000);
    const out = redact({ blob: long }) as { blob: string };
    expect(out.blob.length).toBeLessThan(20_000);
    expect(out.blob.endsWith("…")).toBe(true);
  });

  it("preserves non-sensitive primitives", () => {
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
    expect(redact(true)).toBe(true);
  });
});
