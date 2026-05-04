import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";

let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "test_session_secret_at_least_32_chars_long_123";
  process.env.ALLOW_DEMO_AUTH = "true";
  process.env.SKERRY_ALLOWED_ORIGINS = "http://localhost:3000";
  delete process.env.DATABASE_URL;
  const mod = await import("./index");
  app = await mod.buildApp();
});

describe("CORS allowlist (SKERRY_ALLOWED_ORIGINS)", () => {
  it("rejects API preflight from a disallowed origin", async () => {
    const resp = await request(app)
      .options("/api/health")
      .set("Origin", "https://evil.example")
      .set("Access-Control-Request-Method", "GET");
    expect(resp.status).toBe(403);
  });

  it("allows API GET from an allowed origin", async () => {
    const resp = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:3000");
    expect(resp.status).toBe(200);
    expect(resp.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000"
    );
  });
});
