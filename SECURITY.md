# Security Policy

We take the security of Skerry seriously. Thank you for helping keep our users
and their data safe.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Email **`security@skerry.io`** with:

- A description of the issue, the impact you believe it has, and the affected
  endpoint / page / component.
- Reproduction steps (curl / HTTP capture / minimal PoC). The smaller the
  better; we don't need an exploit, we need to be able to reproduce.
- Whether the issue is being actively exploited or is, to your knowledge, only
  known to you.
- Your name / handle and (optional) where you'd like credit posted.

If the issue is sensitive enough that PGP matters, request our key at the same
address before sending details.

We will acknowledge receipt within **2 business days** and aim to provide a
status update or remediation plan within **5 business days**.

## Scope

In scope:

- The Skerry web application (`https://app.skerry.io` and any subdomain we
  control).
- The HTTP API documented at `/api/docs` (or `docs/openapi.json`).
- The official Skerry repositories on GitHub.

Out of scope:

- Reports requiring physical access, social engineering of staff, DoS / volumetric
  attacks, or rate-limiting bypasses that do not lead to authn/authz / data
  impact.
- Vulnerabilities in third-party services (OpenAI, Resend, Apollo, NeverBounce,
  Supabase, Sentry, etc.) — please report those to the respective vendors.
  We're happy to coordinate if the issue manifests in our integration.
- Findings on `localhost`, demo / staging hosts not listed above, or against
  accounts other than your own.

## Safe-harbor

If you make a good-faith effort to comply with this policy during your
research, we will:

- Not pursue or support legal action against you.
- Work with you to understand and resolve the issue quickly.
- Recognize your contribution publicly (with your permission) once the issue
  is fixed.

"Good faith" means: you don't intentionally degrade service for other users,
you don't access, modify, or exfiltrate data beyond the minimum needed to
demonstrate the issue, and you give us reasonable time to remediate before
public disclosure (we suggest 90 days, negotiable).

## Disclosure timeline

We follow coordinated disclosure. Default timeline:

| Day | Action                                                      |
| --- | ----------------------------------------------------------- |
| 0   | Report received                                             |
| ≤2  | Acknowledgement sent                                        |
| ≤5  | Triage complete, severity assigned, remediation plan shared |
| ≤30 | Fix shipped to production for high / critical               |
| ≤90 | Fix shipped for medium / low                                |
| +14 | Public advisory + credit (with reporter consent)            |

## Supported versions

Only the **current production deployment** is supported. There are no LTS
branches at this time; older self-hosted forks are expected to track `main`.

---

_Last updated: 2026-05-09._
