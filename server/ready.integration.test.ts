import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";

let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "test_session_secret_at_least_32_chars_long_123";
  process.env.ALLOW_DEMO_AUTH = "true";
  delete process.env.DATABASE_URL;
  const mod = await import("./index");
  app = await mod.buildApp();
});

describe("/api/ready", () => {
  it("returns 200 when database is not configured", async () => {
    const resp = await request(app).get("/api/ready");
    expect(resp.status).toBe(200);
    expect(resp.body.ok).toBe(true);
    expect(resp.body.database).toBe("not_configured");
  });
});
