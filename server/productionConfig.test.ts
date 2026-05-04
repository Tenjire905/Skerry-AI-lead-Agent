import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertEnterpriseProductionConfig } from "./productionConfig";

describe("assertEnterpriseProductionConfig", () => {
  let savedNodeEnv: string | undefined;
  let savedOrigins: string | undefined;
  let savedDemo: string | undefined;

  beforeEach(() => {
    savedNodeEnv = process.env.NODE_ENV;
    savedOrigins = process.env.SKERRY_ALLOWED_ORIGINS;
    savedDemo = process.env.ALLOW_DEMO_AUTH;
  });

  afterEach(() => {
    process.env.NODE_ENV = savedNodeEnv;
    if (savedOrigins === undefined) delete process.env.SKERRY_ALLOWED_ORIGINS;
    else process.env.SKERRY_ALLOWED_ORIGINS = savedOrigins;
    if (savedDemo === undefined) delete process.env.ALLOW_DEMO_AUTH;
    else process.env.ALLOW_DEMO_AUTH = savedDemo;
  });

  it("does nothing when not production", () => {
    process.env.NODE_ENV = "test";
    delete process.env.SKERRY_ALLOWED_ORIGINS;
    expect(() => assertEnterpriseProductionConfig()).not.toThrow();
  });

  it("throws when production without allowed origins", () => {
    process.env.NODE_ENV = "production";
    delete process.env.SKERRY_ALLOWED_ORIGINS;
    delete process.env.ALLOW_DEMO_AUTH;
    expect(() => assertEnterpriseProductionConfig()).toThrow(
      /SKERRY_ALLOWED_ORIGINS/
    );
  });

  it("throws when production with demo auth enabled", () => {
    process.env.NODE_ENV = "production";
    process.env.SKERRY_ALLOWED_ORIGINS = "https://app.example.com";
    process.env.ALLOW_DEMO_AUTH = "true";
    expect(() => assertEnterpriseProductionConfig()).toThrow(/ALLOW_DEMO_AUTH/);
  });

  it("passes when production with origins and no demo auth", () => {
    process.env.NODE_ENV = "production";
    process.env.SKERRY_ALLOWED_ORIGINS = "https://app.example.com";
    delete process.env.ALLOW_DEMO_AUTH;
    expect(() => assertEnterpriseProductionConfig()).not.toThrow();
  });
});
