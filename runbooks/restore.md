# Postgres Restore Runbook

> **Purpose**: Restore the Skerry production database from an encrypted off-site
> backup (produced by `scripts/backup.sh`, stored in S3 / Cloudflare R2).
>
> **Owner**: Platform on-call. **Last tested**: _to be filled in after first
> live drill — see `docs/SOC2-Controls.md` CC7.5 for evidence._
>
> **RTO target**: 60 min from incident declaration to "service restored".
> **RPO target**: 24 h (daily backup at 03:00 UTC).

---

## 0. Decide whether to restore

A restore overwrites whatever is in the target database. **Confirm in `#ops`
before starting.** A point-in-time recovery from the cloud provider's PITR
window is preferred over a backup restore when both are available — they have a
much smaller RPO. Only use this runbook when:

- The provider's PITR window is exhausted, **or**
- The corruption / data loss predates PITR retention, **or**
- You are running a quarterly disaster-recovery drill.

For drills, restore to a **separate database** (`*_restore_drill`), never to
production.

---

## 1. Prerequisites (one-time per workstation)

```bash
# macOS
brew install postgresql@16 awscli openssl

# Linux
sudo apt-get install -y postgresql-client-16 awscli openssl
```

Required credentials, exported in your shell **for the duration of the
restore** (do not persist in dotfiles):

| Variable                | Source                                                 |
| ----------------------- | ------------------------------------------------------ |
| `BACKUP_BUCKET`         | 1Password → Skerry / Ops / Backups                     |
| `BACKUP_ENCRYPTION_KEY` | 1Password → Skerry / Ops / Backups (32+ chars)         |
| `AWS_ACCESS_KEY_ID`     | 1Password → Skerry / Ops / Backups                     |
| `AWS_SECRET_ACCESS_KEY` | 1Password → Skerry / Ops / Backups                     |
| `AWS_REGION`            | `auto` for R2, `eu-central-1` for AWS                  |
| `AWS_ENDPOINT_URL_S3`   | (R2 only) `https://<account>.r2.cloudflarestorage.com` |
| `RESTORE_DATABASE_URL`  | the **target** database URL (drill or new prod)        |

---

## 2. Pick a backup

```bash
# Newest 10 daily backups:
aws ${AWS_ENDPOINT_URL_S3:+--endpoint-url "$AWS_ENDPOINT_URL_S3"} \
    s3 ls --recursive "${BACKUP_BUCKET%/}/daily/" \
  | sort -r | head -10
```

Each object is named `skerry-YYYY-MM-DDTHH-MM-SSZ.pgcustom.enc`. Copy the **full
object key** of the backup you want — usually the most recent one before the
incident.

---

## 3. Download and decrypt

```bash
WORK="$(mktemp -d)" && echo "WORK=$WORK"
KEY="daily/2026/05/09/skerry-2026-05-09T03-00-12Z.pgcustom.enc"  # replace

aws ${AWS_ENDPOINT_URL_S3:+--endpoint-url "$AWS_ENDPOINT_URL_S3"} \
    s3 cp "${BACKUP_BUCKET%/}/${KEY}" "$WORK/dump.enc"

# Verify the cipher SHA-256 against the object metadata.
EXPECTED_CIPHER_SHA="$(aws ${AWS_ENDPOINT_URL_S3:+--endpoint-url "$AWS_ENDPOINT_URL_S3"} \
    s3api head-object \
    --bucket "$(echo "$BACKUP_BUCKET" | sed -E 's#^s3://([^/]+).*#\1#')" \
    --key "$KEY" \
    --query 'Metadata."cipher-sha256"' --output text)"
ACTUAL_CIPHER_SHA="$(sha256sum "$WORK/dump.enc" | awk '{print $1}')"
[[ "$EXPECTED_CIPHER_SHA" == "$ACTUAL_CIPHER_SHA" ]] \
  && echo "✓ cipher integrity OK" \
  || { echo "✗ cipher SHA mismatch — abort"; exit 1; }

openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 \
    -in "$WORK/dump.enc" \
    -out "$WORK/dump.pgcustom" \
    -pass env:BACKUP_ENCRYPTION_KEY
```

Verify the plain SHA-256 against the same metadata (`plain-sha256`) to detect
any corruption.

---

## 4. Restore into the target database

> **Sanity check** that `$RESTORE_DATABASE_URL` is **not** the live production
> URL unless you are intentionally rolling back prod.

```bash
# Optional: drop & recreate the schema for a clean restore (drill only).
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SQL

# Parallel restore (jobs ≈ vCPUs).
pg_restore \
    --dbname="$RESTORE_DATABASE_URL" \
    --jobs=4 \
    --no-owner \
    --no-privileges \
    --exit-on-error \
    "$WORK/dump.pgcustom"
```

Capture the duration: `time pg_restore …`.

---

## 5. Smoke checks

```bash
psql "$RESTORE_DATABASE_URL" -At -c "
  SELECT
    (SELECT count(*) FROM pg_tables WHERE schemaname='public')        AS tables,
    (SELECT count(*) FROM auth_users)                                  AS users,
    (SELECT count(*) FROM monthly_usage)                               AS usage_rows,
    (SELECT max(created_at) FROM monthly_usage)                        AS last_usage_at;
"
```

Then point a **read-only** instance of the app at `RESTORE_DATABASE_URL` and
verify:

- [ ] `/api/health` and `/api/ready` both return `200`
- [ ] Login works for a known user (use `agency@skerry.io` test account if drill)
- [ ] Dashboard renders with non-zero counters
- [ ] No errors in server logs

---

## 6. Cut over (production restore only)

1. Put the app in maintenance mode (Cloudflare → maintenance page rule).
2. Update `DATABASE_URL` in the app's secret store to the restored DB.
3. Roll the app pods (Fly / Render / k8s — `flyctl deploy` or equivalent).
4. Verify `/api/ready` is `200` from outside the network.
5. Lift the maintenance rule.
6. Announce in `#status` with: incident summary, RPO actually achieved, RTO
   actually achieved, follow-up actions.

---

## 7. Cleanup

```bash
shred -u "$WORK"/* 2>/dev/null || rm -rf "$WORK"
unset BACKUP_ENCRYPTION_KEY AWS_SECRET_ACCESS_KEY RESTORE_DATABASE_URL
```

Rotate `BACKUP_ENCRYPTION_KEY` if there is **any** suspicion the value was
exposed during the restore (e.g., shoulder-surfed, pasted into a chat, ended up
in a shell history sync). Re-encrypt the existing backup set under the new key
in a follow-up Action.

---

## 8. Drill log

Each drill **must** record:

| Field             | Example                                                     |
| ----------------- | ----------------------------------------------------------- |
| Date (UTC)        | `2026-05-09`                                                |
| Operator          | `@on-call`                                                  |
| Backup object     | `daily/2026/05/08/skerry-2026-05-08T03-00-12Z.pgcustom.enc` |
| Plain bytes       | `412 MB`                                                    |
| Download time     | `00:00:48`                                                  |
| Decrypt time      | `00:00:09`                                                  |
| `pg_restore` time | `00:02:31`                                                  |
| Smoke checks      | `pass` / `fail (note)`                                      |
| **Total RTO**     | `00:03:28`                                                  |
| Notes             | `…`                                                         |

Append the entry to `docs/SOC2-Controls.md` (CC7.5 evidence section) and to a
pinned Notion page so auditors can pull it.

---

## 9. First drill — to do

The first drill has not yet been run in this environment. Steps for the
operator running it:

1. Provision a throw-away Postgres (`fly pg create skerry-restore-drill`,
   `supabase projects create`, or a local docker `postgres:16`).
2. Set `RESTORE_DATABASE_URL` to its connection string.
3. Run sections 1–5.
4. Fill in the "Drill log" table above with measured values.
5. Commit the change with message `runbooks: record restore drill YYYY-MM-DD`.
6. Tear down the throw-away DB.
