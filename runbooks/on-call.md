# On-Call Runbook

> **Today's primary on-call**: _fill in name + phone + Slack handle._
> _Single-operator while the team is small; expand when headcount > 1._
>
> **Owner of this doc**: `engineering@skerry.io`. Review monthly.

---

## 1. Coverage model (current)

- **Single primary** (24×7) for the first phase. The same person owns release
  - incident response.
- **Hours of meaningful response**: 09:00–22:00 local. Overnight pages route to
  the same number; expect a 30-minute response window for SEV-1 only.
- **Escalation contact**: founder / CTO mobile (in 1Password → Skerry / Ops).

When headcount allows, switch to a 2-person rotation with weekly handoff every
**Monday 10:00 local**.

## 2. What pages me

| Source                                          | Trigger                                                                  | Severity |
| ----------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| Sentry                                          | Crash rate > 1% over 5 min, or any new `error` issue tagged `production` | SEV-2    |
| Cloudflare / status check                       | `/api/ready` returns non-200 for >2 min                                  | SEV-1    |
| Backup workflow                                 | `daily-backup` fails (`OPS_SLACK_WEBHOOK_URL`)                           | SEV-3    |
| Customer report (`security@skerry.io`)          | Suspected breach / data exposure                                         | SEV-1    |
| Provider outage page (OpenAI / Resend / Apollo) | Major outage that cascades into our error rate                           | SEV-2    |

Pager target: dedicated phone number → SMS + voice. Use a Better Stack /
PagerDuty / OpsGenie free tier rather than personal Slack DMs.

## 3. Severity definitions

| Sev       | Definition                                                         | Response time                | Comms                        |
| --------- | ------------------------------------------------------------------ | ---------------------------- | ---------------------------- |
| **SEV-1** | Service down for all users, or active data exposure                | ≤30 min ack, ≤1 h mitigation | Status page + customer email |
| **SEV-2** | Major feature degraded (lead gen / send broken), or partial outage | ≤1 h ack                     | Status page banner           |
| **SEV-3** | Background process failing, no immediate customer impact           | Next business day            | None unless prolonged        |
| **SEV-4** | Cosmetic / observability gap                                       | Backlog                      | None                         |

## 4. First-15-minutes checklist (any page)

1. Acknowledge the page (silences the rotation).
2. Open a thread in `#incident-<short-name>` (create if missing). Pin it.
3. Read `/api/ready`, server logs (last 15 min), Sentry (last 15 min).
4. Decide severity per the table above. Post in the thread.
5. If SEV-1: post the status-page banner template (in `docs/incident-templates.md` —
   create on first use), declare incident commander = on-call.
6. If you're unsure about severity, **default up** (treat as SEV-2).

## 5. Common scenarios → runbook

| Symptom                           | Runbook                                                                                                                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/ready` 503 — DB unreachable | (a) Check provider status. (b) `psql "$DATABASE_URL" -c 'SELECT 1'` from a bastion. (c) If extended, prepare PITR per `runbooks/restore.md`                                                              |
| LLM error rate spikes             | (a) Check OpenAI status. (b) Confirm circuit breaker tripped via logs (`logEvent('warn','provider_breaker_open')`). (c) The synth fallback in `server/index.ts` should keep lead-gen functional — verify |
| Email send failures               | (a) Check Resend status. (b) Re-queue dryRun=true if needed; never re-send from a stale queue                                                                                                            |
| Daily backup failed               | `runbooks/restore.md` is unchanged; investigate the GH Action run (link in alert) and re-run via workflow_dispatch                                                                                       |
| Suspected breach                  | Activate `SECURITY.md` flow internally + rotate the relevant secret (SESSION_SECRET, BACKUP_ENCRYPTION_KEY, API key) before forensics. Preserve logs                                                     |

## 6. Comms templates

Copy/paste, fill the brackets:

**Status-page banner (SEV-1)**

```
We're investigating an issue affecting [feature]. Some users may see
[symptom]. We'll update this banner within 30 minutes.
— Skerry Engineering, [time UTC]
```

**Status-page resolution**

```
Resolved at [time UTC]. Root cause: [one sentence]. We will share a more
detailed post-mortem within 7 days.
```

## 7. Post-incident (within 7 days, blameless)

For every SEV-1 / SEV-2:

1. Write a post-mortem in `docs/incidents/YYYY-MM-DD-<slug>.md` from the
   template (timeline / impact / root cause / what worked / what didn't /
   action items with owners + due dates).
2. File a GitHub issue per action item, label `post-mortem`.
3. Skim previous PMs for repeats — patterns there are worth a deeper fix.
4. Append the incident to `docs/SOC2-Controls.md` CC7.3 evidence.

## 8. Handoff (when the team grows)

Outgoing on-call posts in `#ops` at end of shift:

- Open issues as of now, severity, link to thread.
- Anything fragile to watch.
- One-liner per incident handled.

Incoming on-call ack-replies to confirm pager is now on their phone.

---

_Last updated: 2026-05-09._
