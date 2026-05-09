#!/usr/bin/env bash
# scripts/backup.sh
#
# Encrypted Postgres backup → S3-compatible bucket (AWS S3 or Cloudflare R2).
#
# Required env:
#   DATABASE_URL              postgres://user:pass@host:5432/dbname
#   BACKUP_BUCKET             e.g. s3://skerry-backups/prod  (no trailing slash)
#   BACKUP_ENCRYPTION_KEY     >=32 char passphrase used for AES-256 envelope
#   AWS_ACCESS_KEY_ID         S3 / R2 access key
#   AWS_SECRET_ACCESS_KEY     S3 / R2 secret
#   AWS_REGION                e.g. eu-central-1 (use 'auto' for R2)
#
# Optional:
#   AWS_ENDPOINT_URL_S3       Custom S3 endpoint (set this for Cloudflare R2:
#                             https://<account-id>.r2.cloudflarestorage.com)
#   BACKUP_RETENTION_DAYS     Default 30. Older objects with the prefix below
#                             are deleted after a successful upload.
#   BACKUP_PREFIX             Default "daily". Used in the object key.
#
# Exit codes:
#   0  success
#   1  config / dependency error
#   2  pg_dump failed
#   3  encryption failed
#   4  upload failed

set -euo pipefail

log()  { printf '[backup] %s\n' "$*" >&2; }
fail() { log "ERROR: $*"; exit "${2:-1}"; }

# --- 1. Validate env --------------------------------------------------------
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_BUCKET:?BACKUP_BUCKET is required (e.g. s3://my-bucket/prod)}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required (>=32 chars)}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
: "${AWS_REGION:?AWS_REGION is required (use 'auto' for Cloudflare R2)}"

if [[ "${#BACKUP_ENCRYPTION_KEY}" -lt 32 ]]; then
  fail "BACKUP_ENCRYPTION_KEY must be at least 32 characters"
fi

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
PREFIX="${BACKUP_PREFIX:-daily}"

for cmd in pg_dump openssl aws sha256sum date; do
  command -v "$cmd" >/dev/null 2>&1 || fail "missing dependency: $cmd"
done

AWS_ENDPOINT_ARGS=()
if [[ -n "${AWS_ENDPOINT_URL_S3:-}" ]]; then
  AWS_ENDPOINT_ARGS=(--endpoint-url "$AWS_ENDPOINT_URL_S3")
fi

# --- 2. Dump ----------------------------------------------------------------
TIMESTAMP="$(date -u +'%Y-%m-%dT%H-%M-%SZ')"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

DUMP_FILE="$WORKDIR/dump.pgcustom"
ENC_FILE="$WORKDIR/dump.pgcustom.enc"

log "starting pg_dump (custom format, compression 9)…"
if ! pg_dump \
      --format=custom \
      --compress=9 \
      --no-owner \
      --no-privileges \
      --file="$DUMP_FILE" \
      "$DATABASE_URL"; then
  fail "pg_dump failed" 2
fi

DUMP_SIZE="$(wc -c <"$DUMP_FILE" | tr -d ' ')"
DUMP_SHA256="$(sha256sum "$DUMP_FILE" | awk '{print $1}')"
log "dump complete: ${DUMP_SIZE} bytes, sha256=${DUMP_SHA256}"

# --- 3. Encrypt -------------------------------------------------------------
log "encrypting (AES-256-CBC + PBKDF2 600k iterations)…"
if ! openssl enc -aes-256-cbc -salt -pbkdf2 -iter 600000 \
      -in "$DUMP_FILE" \
      -out "$ENC_FILE" \
      -pass env:BACKUP_ENCRYPTION_KEY; then
  fail "encryption failed" 3
fi

ENC_SHA256="$(sha256sum "$ENC_FILE" | awk '{print $1}')"

# --- 4. Upload --------------------------------------------------------------
DATE_DIR="$(date -u +'%Y/%m/%d')"
OBJECT_KEY="${PREFIX}/${DATE_DIR}/skerry-${TIMESTAMP}.pgcustom.enc"
S3_URI="${BACKUP_BUCKET%/}/${OBJECT_KEY}"

log "uploading to ${S3_URI}…"
if ! aws "${AWS_ENDPOINT_ARGS[@]}" s3 cp "$ENC_FILE" "$S3_URI" \
      --metadata "plain-sha256=${DUMP_SHA256},cipher-sha256=${ENC_SHA256},plain-bytes=${DUMP_SIZE}" \
      --only-show-errors; then
  fail "s3 upload failed" 4
fi

log "upload complete: ${S3_URI}"

# --- 5. Retention sweep (best-effort) ---------------------------------------
# We list objects under the same prefix root and delete those older than
# RETENTION_DAYS. A failure here does not fail the backup itself.
PRUNE_BEFORE_EPOCH=$(( $(date -u +%s) - RETENTION_DAYS * 86400 ))
log "pruning objects older than ${RETENTION_DAYS} days under ${BACKUP_BUCKET%/}/${PREFIX}/…"

set +e
aws "${AWS_ENDPOINT_ARGS[@]}" s3api list-objects-v2 \
    --bucket "$(echo "${BACKUP_BUCKET}" | sed -E 's#^s3://([^/]+).*#\1#')" \
    --prefix "$(echo "${BACKUP_BUCKET}" | sed -E 's#^s3://[^/]+/?##')${PREFIX}/" \
    --query 'Contents[].{Key:Key,LastModified:LastModified}' \
    --output text 2>/dev/null \
| while IFS=$'\t' read -r key lastmod; do
    [[ -z "$key" || "$key" == "None" ]] && continue
    obj_epoch=$(date -u -d "$lastmod" +%s 2>/dev/null || \
                date -u -j -f "%Y-%m-%dT%H:%M:%S+00:00" "${lastmod%.*}+00:00" +%s 2>/dev/null || echo 0)
    if [[ "$obj_epoch" -gt 0 && "$obj_epoch" -lt "$PRUNE_BEFORE_EPOCH" ]]; then
      log "  prune: $key"
      aws "${AWS_ENDPOINT_ARGS[@]}" s3 rm \
        "s3://$(echo "${BACKUP_BUCKET}" | sed -E 's#^s3://([^/]+).*#\1#')/$key" \
        --only-show-errors || true
    fi
  done
set -e

log "done."
