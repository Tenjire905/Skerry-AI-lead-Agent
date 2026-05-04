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

describe("auth + csrf integration", () => {
  it("requires auth for session endpoint before login", async () => {
    const resp = await request(app).get("/api/auth/session");
    expect(resp.status).toBe(401);
  });

  it("rejects invalid login credentials", async () => {
    const resp = await request(app).post("/api/auth/login").send({
      email: "solo@skerry.io",
      password: "wrong",
    });
    expect(resp.status).toBe(401);
    expect(resp.body.ok).toBe(false);
  });

  it("enforces csrf token on mutating endpoints", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({
      email: "solo@skerry.io",
      password: "solo123",
    });
    expect(login.status).toBe(200);
    expect(login.body.ok).toBe(true);
    expect(typeof login.body.csrfToken).toBe("string");

    const noCsrf = await agent.post("/api/auth/logout").send({});
    expect(noCsrf.status).toBe(403);

    const session = await agent.get("/api/auth/session");
    expect(session.status).toBe(200);
    expect(typeof session.body.csrfToken).toBe("string");

    const logout = await agent
      .post("/api/auth/logout")
      .set("x-csrf-token", session.body.csrfToken)
      .send({});
    expect(logout.status).toBe(200);
    expect(logout.body.ok).toBe(true);
  });
});
