# SOC 2 Controls Inventory

Status snapshot of the 2017 Trust Services Criteria (Common Criteria CC1–CC9
plus the Availability category A) for Skerry. Used as the spine for an
upcoming Type II audit.

> **Status legend**: ✅ Implemented · ⚠️ Partial / in progress · ⏸ Planned · N/A
>
> **Owner**: `compliance@skerry.io`. **Last reviewed**: 2026-05-09.
> Re-review every quarter, every audit kickoff, and after any material change.

Each row should accumulate dated **evidence pointers** (commit SHAs, PR
numbers, runbook drill records, screenshots in the audit drive). Auditors
sample these — keep them current.

---

## CC1 — Control Environment

| ID    | Control                                                      | Status | Implementation / evidence                                                                 |
| ----- | ------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------- |
| CC1.1 | Commitment to integrity and ethical values                   | ⏸     | Code of conduct + acknowledgement workflow. Planned via HR onboarding doc                 |
| CC1.2 | Board / leadership oversight of internal control             | ⏸     | Quarterly security review meeting. Planned, schedule TBD                                  |
| CC1.3 | Org structure, reporting lines, authority                    | ✅     | Org chart in shared drive; Skerry is a small org — single CTO owns engineering + security |
| CC1.4 | Commitment to attract / develop / retain competent personnel | ⏸     | Hiring rubric + perf-review cadence. Planned                                              |
| CC1.5 | Accountability for internal control responsibilities         | ⚠️     | RACI for security tasks captured in `runbooks/on-call.md`; expand to all controls         |

## CC2 — Communication & Information

| ID    | Control                                               | Status | Implementation / evidence                                                        |
| ----- | ----------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| CC2.1 | Internally relevant info — quality + availability     | ✅     | All operational state in `runbooks/`, `docs/`, `PROJECT_BRAIN.md`, GitHub issues |
| CC2.2 | Internal communication of policies / responsibilities | ⚠️     | `SECURITY.md` covers external; internal handbook still TODO                      |
| CC2.3 | External communication (customers, partners)          | ✅     | Status page (Cloudflare), `SECURITY.md`, `docs/DPA-Subprocessors.md`             |

## CC3 — Risk Assessment

| ID    | Control                  | Status | Implementation / evidence                                            |
| ----- | ------------------------ | ------ | -------------------------------------------------------------------- |
| CC3.1 | Risk identification      | ⚠️     | Threat model captured in `docs/THREAT-MODEL.md` (TODO — STRIDE pass) |
| CC3.2 | Fraud risk assessment    | ⏸     | Out of scope until billing is launched                               |
| CC3.3 | Risk mitigation strategy | ⚠️     | Per-risk owner assignment pending                                    |
| CC3.4 | Vendor risk management   | ✅     | Subprocessor list + DPAs on file (`docs/DPA-Subprocessors.md`)       |

## CC4 — Monitoring Activities

| ID    | Control                        | Status | Implementation / evidence                                                                                                  |
| ----- | ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| CC4.1 | Ongoing + separate evaluations | ⚠️     | `pnpm test`, `pnpm test:e2e`, CI on every push (`.github/workflows/ci.yml`). External pen-test annually — TODO to schedule |
| CC4.2 | Communication of deficiencies  | ⚠️     | Critical findings → `#security` Slack + GitHub Security Advisory. Process not yet written down                             |

## CC5 — Control Activities

| ID    | Control                                       | Status | Implementation / evidence                                      |
| ----- | --------------------------------------------- | ------ | -------------------------------------------------------------- |
| CC5.1 | Selection / development of control activities | ✅     | This file + `PRODUCTION_CHECKLIST.md`                          |
| CC5.2 | Technology general controls                   | ⚠️     | See CC6/CC7/CC8 detail below                                   |
| CC5.3 | Policies and procedures                       | ⚠️     | `runbooks/` covers ops. Information-security policy still TODO |

## CC6 — Logical & Physical Access

| ID    | Control                                               | Status | Implementation / evidence                                                                                                      |
| ----- | ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| CC6.1 | Logical access provisioning / deprovisioning          | ⚠️     | Demo accounts disabled in prod (`server/productionConfig.ts`). Real auth provider integration (SSO via Clerk / WorkOS) TBD     |
| CC6.2 | Authentication of users                               | ✅     | HMAC-signed session cookies, rate-limited login (`server/index.ts:723`), CSRF double-submit (`server/index.ts:780`)            |
| CC6.3 | Network segmentation / firewall                       | ⚠️     | DB reachable only from app subnet — operator action when deploying. Documented in `runbooks/deploy.md` (TODO)                  |
| CC6.4 | Physical access                                       | N/A    | No data centers; Subprocessors handle physical security (their SOC 2s on file)                                                 |
| CC6.5 | Encryption in transit                                 | ✅     | TLS at the edge; HSTS in prod (`server/index.ts:704`)                                                                          |
| CC6.6 | Encryption at rest                                    | ✅     | Postgres provider encrypts at rest by default. Backups additionally encrypted with AES-256 + PBKDF2 600k (`scripts/backup.sh`) |
| CC6.7 | Restricted access to source code / production systems | ✅     | GitHub branch protection, required reviews on `main`, prod deploys gated on green CI                                           |
| CC6.8 | Endpoint protection                                   | ⚠️     | MDM rollout for staff laptops planned                                                                                          |

## CC7 — System Operations

| ID    | Control                           | Status | Implementation / evidence                                                                       |
| ----- | --------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| CC7.1 | Detection of unauthorized changes | ⚠️     | GitHub Audit Log + `git log` review weekly. Tamper-evident logging on infrastructure TBD        |
| CC7.2 | Detection of vulnerabilities      | ⚠️     | Dependabot enabled; quarterly `pnpm audit` review. SAST / container scanning TODO               |
| CC7.3 | Incident response                 | ✅     | `runbooks/restore.md`, `runbooks/on-call.md`. Tabletop exercise scheduled quarterly             |
| CC7.4 | Recovery from incidents           | ✅     | Runbooks + automated daily backup (`.github/workflows/backup.yml`)                              |
| CC7.5 | **Tested** restore from backup    | ⚠️     | Runbook ✅; **first live drill not yet recorded**. Append drill log to `runbooks/restore.md` §8 |

## CC8 — Change Management

| ID    | Control                                                   | Status | Implementation / evidence                                           |
| ----- | --------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| CC8.1 | Authorize, design, implement, configure, document changes | ✅     | Pull-request workflow on `main`, required CI green, required review |

## CC9 — Risk Mitigation

| ID    | Control                                             | Status | Implementation / evidence                                                          |
| ----- | --------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| CC9.1 | Risk-mitigating activities for business disruptions | ✅     | Daily encrypted backup off-site, restore runbook, multi-region edge via Cloudflare |
| CC9.2 | Vendor / business-partner risk assessment           | ⚠️     | Annual review of Subprocessors (`docs/DPA-Subprocessors.md`) — first cycle pending |

## A — Availability

| ID   | Control                   | Status | Implementation / evidence                                                                                       |
| ---- | ------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| A1.1 | Capacity planning         | ⚠️     | Quota / rate-limit caps protect against thundering herd. Capacity model documented at `docs/capacity.md` (TODO) |
| A1.2 | Environmental protections | N/A    | Subprocessors                                                                                                   |
| A1.3 | Recovery testing          | ⚠️     | Quarterly restore drill (CC7.5) + monthly RTO measurement                                                       |

---

## Evidence-collection checklist (to operationalize)

A control is only as good as the audit trail. Aim per quarter:

- [ ] Export `pg_audit` (or hosted-Postgres equivalent) of admin actions.
- [ ] Export GitHub audit log for the period.
- [ ] Export CI/CD run history for prod deploys.
- [ ] Snapshot `PRODUCTION_CHECKLIST.md` and this file at quarter-end into the
      audit drive (immutable bucket with versioning enabled).
- [ ] Record the most recent restore drill in `runbooks/restore.md` §8.
- [ ] Record the most recent on-call incident retrospective.
- [ ] Refresh Subprocessor DPAs / TIAs that are >12 months old.
- [ ] Run `pnpm audit --prod` and triage findings.

---

## Tooling decision

We use this Markdown file as the canonical inventory; mirror it in **Vanta**
or **Drata** if/when an SOC 2 Type II audit is contracted. Auditors prefer a
GRC tool over Markdown for evidence linking, but starting in version control
keeps the source of truth diffable.
