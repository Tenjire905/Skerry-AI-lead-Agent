# Data Processing Addendum & Subprocessors

This document describes the third-party processors ("Subprocessors") that
Skerry uses to deliver the service, the categories of data they process on
our behalf, where that processing happens, and the legal basis we rely on.

It is referenced from our customer DPA (Data Processing Addendum). Material
changes to this list will be announced at least 30 days in advance via email
to the customer's DPO contact.

> **Last updated**: 2026-05-09. Owner: `legal@skerry.io`.
> **Review cadence**: quarterly, plus on every Subprocessor change.

---

## 1. Roles

- **Customer** = the company that buys a Skerry subscription. Acts as
  Controller for its own end users' personal data and for the prospect data
  the customer uploads or has Skerry generate.
- **Skerry** = Processor under the customer DPA, Controller for its own
  internal personnel data (out of scope for this document).
- **Subprocessor** = third party that Skerry instructs to process data on the
  customer's behalf in order to deliver the service.

---

## 2. Subprocessor list

| Subprocessor                                                                                                      | Purpose                                                                                                                                                                                                                      | Categories of data processed                                                                                                                                                                                                    | Hosting region                                                    | Legal basis                |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------- |
| **Supabase Inc.** (or the underlying Postgres host — currently configurable to Supabase, Fly Postgres, Neon, RDS) | Primary application database: user accounts, monthly usage records, generated lead artefacts                                                                                                                                 | Account email, hashed session metadata, usage counters, generated lead profiles (name, title, company, work email, public LinkedIn URL)                                                                                         | EU (Frankfurt) when configured, else US-East per provider default | Art. 28 GDPR DPA + EU SCCs |
| **OpenAI, L.L.C.**                                                                                                | LLM inference for lead-research and email-draft generation                                                                                                                                                                   | Customer-supplied business description, target-audience description, generated lead profiles passed back into the model. Skerry calls OpenAI with `data_retention=zero` where supported (Enterprise / Zero-Data-Retention tier) | US                                                                | OpenAI DPA + EU SCCs       |
| **Apify Technologies s.r.o.** (acts as gateway to Apollo.io for lead enrichment)                                  | Discovery and enrichment of B2B prospect profiles                                                                                                                                                                            | Search criteria (industry, role, geography), retrieved prospect profile data (name, title, work email, public LinkedIn / company URLs) — all from publicly available sources                                                    | EU (Czech Republic)                                               | Apify DPA + EU SCCs        |
| **NeverBounce, LLC** (a ZoomInfo company)                                                                         | Email validity check before send                                                                                                                                                                                             | Single email address per request, no other PII                                                                                                                                                                                  | US                                                                | NeverBounce DPA + EU SCCs  |
| **Resend, Inc.**                                                                                                  | Transactional + outbound email delivery                                                                                                                                                                                      | Recipient address, sender address, subject, body, send-time metadata, bounce / open events                                                                                                                                      | US (with EU edge)                                                 | Resend DPA + EU SCCs       |
| **Functional Software, Inc. (Sentry.io)**                                                                         | Application error monitoring (server + client)                                                                                                                                                                               | Error stacks, request paths, user agent, IP truncated to /24, hashed user ID. **PII scrubbed**: email, password, cookies, `Authorization` header, request body fields                                                           | US (with EU data residency option configured for prod)            | Sentry DPA + EU SCCs       |
| **Cloudflare, Inc.**                                                                                              | TLS termination, DDoS protection, edge caching, R2 backup storage when configured                                                                                                                                            | Request/response metadata, IP, encrypted backup blobs (no plaintext PII at rest in R2 — see `scripts/backup.sh`)                                                                                                                | Global edge                                                       | Cloudflare DPA + EU SCCs   |
| **GitHub, Inc.**                                                                                                  | Source-code hosting, CI runners that execute the daily encrypted-backup workflow (see `scripts/backup.sh`). Backup payload is **already encrypted** before GitHub touches it; GitHub holds neither the key nor the plaintext | Encrypted Postgres dumps, action logs (no payload bodies)                                                                                                                                                                       | US                                                                | GitHub DPA + EU SCCs       |

> Two Subprocessors are commonly assumed but are **not** used at this time:
> Stripe (no in-app billing yet; payments handled out of band) and Slack
> (operational alerts go via webhook URLs the customer-of-Skerry configures —
> no customer data is sent to Slack by default).

---

## 3. International transfers

For all transfers from the EU/EEA to the US we rely on the latest
European Commission Standard Contractual Clauses (Module 3, Processor → Processor)
together with the relevant transfer impact assessment (TIA) on file.

Where the Subprocessor is certified under the **EU-US Data Privacy Framework**,
we additionally rely on that adequacy decision as primary basis (currently
applicable to Resend, Sentry, GitHub, Cloudflare, OpenAI; verify each
Subprocessor's certification at <https://www.dataprivacyframework.gov> before
relying on it).

---

## 4. Sub-Subprocessors

Each Subprocessor publishes its own list of further processors (e.g. cloud
infrastructure providers — AWS, GCP, Azure). We do not duplicate those lists
here; please consult the Subprocessor's public Trust Center.

---

## 5. Customer rights

Customers (data exporters under the SCCs) may:

- Object to a new Subprocessor within 30 days of the announcement above; if
  Skerry cannot provide a replacement, the customer may terminate for cause.
- Audit Skerry's processing per the DPA (annual SOC 2 Type II report
  satisfies this — see `docs/SOC2-Controls.md` for status).
- Receive on request the latest TIA, the executed SCCs, and any Subprocessor
  DPA we have on file.

Contact: `legal@skerry.io` (DPO inquiries) and `security@skerry.io`
(incident-response).

---

## 6. Change history

| Date       | Change               |
| ---------- | -------------------- |
| 2026-05-09 | Initial publication. |
