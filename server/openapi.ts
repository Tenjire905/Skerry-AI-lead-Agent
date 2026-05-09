/**
 * OpenAPI 3.1 specification for the Skerry public API.
 *
 * Hand-maintained because (a) the spec is small enough to keep up to date,
 * (b) JSDoc-scraping tools tend to drift silently, (c) the spec doubles as
 * the contract reviewers and integration partners read first.
 *
 * Add a route here in the same PR that adds the route in `server/index.ts`.
 */

import type { Express, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";

const errorSchema = {
  type: "object",
  required: ["ok", "error"],
  properties: {
    ok: { type: "boolean", const: false },
    error: { type: "string" },
  },
} as const;

const okSchema = (
  extraProps: Record<string, unknown> = {},
  required: string[] = []
) => ({
  type: "object" as const,
  required: ["ok", ...required],
  properties: {
    ok: { type: "boolean", const: true },
    ...extraProps,
  },
});

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Skerry Lead-Gen API",
    version: "1.0.0",
    description:
      "Backend API for the Skerry lead-gen OS. All state-changing routes " +
      "require a valid session cookie (`skerry_session`) plus a CSRF token " +
      "(`X-CSRF-Token` header that matches the `skerry_csrf` cookie). " +
      "Login and CSRF endpoints are exempt.",
    contact: { name: "Skerry Engineering", email: "engineering@skerry.io" },
    license: { name: "Proprietary" },
  },
  servers: [
    { url: "http://localhost:3001", description: "Local dev" },
    { url: "https://app.skerry.io", description: "Production (placeholder)" },
  ],
  tags: [
    { name: "Auth" },
    { name: "Entitlements" },
    { name: "Leads" },
    { name: "Email" },
    { name: "Health" },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "skerry_session",
      },
      csrfHeader: {
        type: "apiKey",
        in: "header",
        name: "X-CSRF-Token",
      },
    },
    schemas: {
      Error: errorSchema,
      AuthUser: {
        type: "object",
        required: ["name", "email", "role", "tier"],
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["user", "developer"] },
          tier: { type: "string", enum: ["solo", "team", "agency"] },
        },
      },
      Lead: {
        type: "object",
        required: [
          "firstName",
          "lastName",
          "title",
          "email",
          "linkedin",
          "organization",
          "websiteContext",
          "personContext",
          "uniqueAngles",
        ],
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          title: { type: "string" },
          email: { type: "string", format: "email" },
          linkedin: { type: "string", format: "uri" },
          organization: {
            type: "object",
            required: ["name", "website"],
            properties: {
              name: { type: "string" },
              website: { type: "string", format: "uri" },
            },
          },
          websiteContext: { type: "string" },
          personContext: { type: "string" },
          uniqueAngles: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  security: [{ sessionCookie: [], csrfHeader: [] }],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        security: [],
        summary: "Liveness check",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: okSchema({ uptimeMs: { type: "integer" } }),
              },
            },
          },
        },
      },
    },
    "/api/ready": {
      get: {
        tags: ["Health"],
        security: [],
        summary: "Readiness check (DB + dependencies)",
        responses: {
          "200": {
            description: "Ready",
            content: { "application/json": { schema: okSchema() } },
          },
          "503": {
            description: "Not ready",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/auth/csrf": {
      get: {
        tags: ["Auth"],
        security: [],
        summary: "Issue a CSRF token (also sets the cookie)",
        responses: {
          "200": {
            description: "Token issued",
            content: {
              "application/json": {
                schema: okSchema({ csrfToken: { type: "string" } }, [
                  "csrfToken",
                ]),
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        security: [],
        summary: "Sign in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 1 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Authenticated",
            content: {
              "application/json": {
                schema: okSchema(
                  {
                    user: { $ref: "#/components/schemas/AuthUser" },
                    csrfToken: { type: "string" },
                  },
                  ["user", "csrfToken"]
                ),
              },
            },
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "429": {
            description: "Too many login attempts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/auth/session": {
      get: {
        tags: ["Auth"],
        summary: "Current session info",
        responses: {
          "200": {
            description: "Session valid",
            content: {
              "application/json": {
                schema: okSchema(
                  {
                    user: { $ref: "#/components/schemas/AuthUser" },
                    csrfToken: { type: "string" },
                  },
                  ["user", "csrfToken"]
                ),
              },
            },
          },
          "401": {
            description: "Not authenticated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Sign out (invalidates the session cookie)",
        responses: {
          "200": {
            description: "Logged out",
            content: { "application/json": { schema: okSchema() } },
          },
        },
      },
    },
    "/api/entitlements/usage": {
      get: {
        tags: ["Entitlements"],
        summary: "Current monthly usage and remaining quota",
        responses: {
          "200": {
            description: "Usage",
            content: {
              "application/json": {
                schema: okSchema({
                  tier: {
                    type: "string",
                    enum: ["solo", "team", "agency"],
                  },
                  runsUsed: { type: "integer" },
                  monthlyRuns: { type: "integer" },
                  runsRemaining: { type: "integer" },
                  maxLeadsPerRun: { type: "integer" },
                }),
              },
            },
          },
        },
      },
    },
    "/api/entitlements/research/start": {
      post: {
        tags: ["Entitlements"],
        summary: "Atomically reserve one research run",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["requestedLeads"],
                properties: {
                  requestedLeads: { type: "integer", minimum: 1, maximum: 50 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Reserved",
            content: {
              "application/json": {
                schema: okSchema({
                  runsRemaining: { type: "integer" },
                }),
              },
            },
          },
          "402": {
            description: "Quota exhausted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/leads/generate": {
      post: {
        tags: ["Leads"],
        summary: "Generate AI-discovered leads",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "businessDescription",
                  "targetAudience",
                  "requestedLeads",
                ],
                properties: {
                  businessDescription: { type: "string", maxLength: 4000 },
                  targetAudience: { type: "string", maxLength: 4000 },
                  requestedLeads: {
                    type: "integer",
                    minimum: 1,
                    maximum: 50,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Leads",
            content: {
              "application/json": {
                schema: okSchema({
                  source: {
                    type: "string",
                    enum: ["openai", "synthesizer"],
                  },
                  leads: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Lead" },
                  },
                  runsUsed: { type: "integer" },
                  monthlyRuns: { type: "integer" },
                }),
              },
            },
          },
        },
      },
    },
    "/api/email/generate": {
      post: {
        tags: ["Email"],
        summary: "Draft a personalized cold email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["lead", "businessDescription", "senderName"],
                properties: {
                  lead: { $ref: "#/components/schemas/Lead" },
                  businessDescription: { type: "string", maxLength: 4000 },
                  senderName: { type: "string", maxLength: 200 },
                  angle: { type: "string", maxLength: 4000 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Markdown email body",
            content: {
              "application/json": {
                schema: okSchema({
                  source: {
                    type: "string",
                    enum: ["openai", "synthesizer"],
                  },
                  markdown: { type: "string" },
                }),
              },
            },
          },
        },
      },
    },
    "/api/email/verify": {
      post: {
        tags: ["Email"],
        summary: "Verify a single email via NeverBounce",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Result",
            content: {
              "application/json": {
                schema: okSchema({
                  result: {
                    type: "string",
                    enum: ["valid", "invalid", "disposable", "unknown"],
                  },
                  source: {
                    type: "string",
                    enum: ["neverbounce", "format-only"],
                  },
                }),
              },
            },
          },
        },
      },
    },
    "/api/email/send": {
      post: {
        tags: ["Email"],
        summary: "Send an email via Resend",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["to", "subject", "bodyMarkdown"],
                properties: {
                  to: { type: "string", format: "email" },
                  subject: { type: "string", maxLength: 300 },
                  bodyMarkdown: { type: "string", maxLength: 100_000 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sent",
            content: {
              "application/json": {
                schema: okSchema({
                  id: { type: "string" },
                  dryRun: { type: "boolean" },
                }),
              },
            },
          },
        },
      },
    },
  },
} as const;

export function mountOpenApi(app: Express): void {
  // Raw JSON spec (consumed by Postman / OpenAPI Generator / contract tests).
  app.get("/api/docs.json", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(openApiSpec);
  });

  // Swagger UI. Set explicit options so the UI fetches from the same origin
  // we just registered above (no CDN dependency).
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: { url: "/api/docs.json" },
      customSiteTitle: "Skerry API",
    })
  );
}
