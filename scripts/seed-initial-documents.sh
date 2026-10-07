#!/bin/sh
# =============================================================================
# Initial document seeding for the Personal Library stack.
#
# WHAT: After `docker compose up --build` brings the application container to a
# healthy state, this script ingests two starter documents through the public
# REST API so a freshly provisioned stack is never empty:
#   1. Every PDF found in ./initial_data (mounted read-only at /seed/initial_data)
#   2. "The Wonderful Wizard of Oz", downloaded from a public CDN
#
# WHY the REST API rather than a direct Mongo/Qdrant insert: uploading through
# POST /api/v1/documents runs the real ingestion pipeline (Tika text extraction,
# BibTeX metadata extraction, chunking, 768-D embeddings into Qdrant, and the
# dual Llama/Mistral summaries). Writing straight to the databases would create
# records that look correct in the list report but are invisible to RAG chat.
#
# The script is deliberately idempotent and non-fatal: re-running `up` will not
# duplicate documents, and a failed CDN download leaves the stack healthy.
# =============================================================================
set -u

API_BASE="${SEED_API_BASE:-http://personal-library-app:18080/api/v1}"
LOCAL_DIR="${SEED_LOCAL_DIR:-/seed/initial_data}"
REMOTE_URL="${SEED_REMOTE_PDF_URL:-https://cdn.bookey.app/files/pdf/book/en/the-wonderful-wizard-of-oz.pdf}"
REMOTE_NAME="${SEED_REMOTE_PDF_NAME:-the-wonderful-wizard-of-oz.pdf}"
# Ingestion is synchronous and LLM-bound: metadata extraction plus two full
# summaries can legitimately take several minutes on CPU-only inference.
MAX_TIME="${SEED_MAX_TIME:-900}"
CERTS_DIR="${SEED_CERTS_DIR:-/seed/certs}"
WORK_DIR="$(mktemp -d)"

log() { echo "[seed] $*"; }

cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT

if [ "${SEED_ENABLED:-true}" != "true" ]; then
  log "SEED_ENABLED is not 'true' — skipping initial document seeding."
  exit 0
fi

# -----------------------------------------------------------------------------
# Enterprise TLS trust.
#
# The remote PDF is fetched over HTTPS, so on a corporate network with a
# TLS-intercepting proxy the download fails with "unable to get local issuer
# certificate" unless the proxy's root CA is trusted. The Dockerfile already
# solves this for the application image by bundling ./certs; this mirrors that
# convention for the seeder without needing a custom image — any .crt/.pem
# dropped into ./certs is appended to the stock CA bundle at runtime.
# -----------------------------------------------------------------------------
if [ -d "$CERTS_DIR" ]; then
  bundle="${WORK_DIR}/ca-bundle.pem"
  for base in /etc/ssl/certs/ca-certificates.crt /etc/ssl/cert.pem; do
    [ -f "$base" ] && cat "$base" > "$bundle" && break
  done
  [ -f "$bundle" ] || : > "$bundle"

  added=0
  for cert in "$CERTS_DIR"/*.crt "$CERTS_DIR"/*.pem; do
    [ -f "$cert" ] || continue
    [ -s "$cert" ] || continue
    printf '\n' >> "$bundle"
    cat "$cert" >> "$bundle"
    added=$((added + 1))
  done

  if [ "$added" -gt 0 ]; then
    export CURL_CA_BUNDLE="$bundle"
    log "Trusting ${added} enterprise certificate(s) from ${CERTS_DIR}."
  fi
fi

# -----------------------------------------------------------------------------
# Wait for the API itself, not just the container health check. The compose
# dependency guarantees the process is up; this guarantees the documents
# endpoint is actually answering before the first multipart POST.
# -----------------------------------------------------------------------------
log "Waiting for the documents API at ${API_BASE}/documents ..."
attempt=0
until curl -fsS -o /dev/null --max-time 10 "${API_BASE}/documents?pageSize=1"; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    log "ERROR: API did not become reachable after $attempt attempts. Skipping seeding."
    exit 0
  fi
  sleep 5
done
log "API is reachable."

# -----------------------------------------------------------------------------
# already_present <fileName>
# Queries the list report with a fileName filter and reports whether the backend
# already holds a matching record, so repeated `up` runs stay idempotent.
# -----------------------------------------------------------------------------
already_present() {
  name="$1"
  body=$(curl -fsS --max-time 30 -G \
    --data-urlencode "fileName=${name}" \
    --data-urlencode "pageSize=1" \
    "${API_BASE}/documents" 2>/dev/null) || return 1

  count=$(printf '%s' "$body" \
    | grep -o '"totalCount"[[:space:]]*:[[:space:]]*[0-9][0-9]*' \
    | grep -o '[0-9][0-9]*$' \
    | head -n 1)

  [ -n "$count" ] && [ "$count" -gt 0 ]
}

# -----------------------------------------------------------------------------
# upload <path> <fileName>
# Posts one file through the real ingestion pipeline. Never returns non-zero:
# a single failed document must not fail the whole stack.
# -----------------------------------------------------------------------------
upload() {
  path="$1"
  name="$2"

  if already_present "$name"; then
    log "SKIP  '${name}' — already present in the library."
    return 0
  fi

  log "UPLOAD '${name}' — running extraction, embedding, and dual summarization (may take minutes) ..."
  status=$(curl -sS -o "${WORK_DIR}/response.json" -w '%{http_code}' \
    --max-time "$MAX_TIME" \
    -F "file=@${path};filename=${name}" \
    "${API_BASE}/documents" 2>"${WORK_DIR}/error.log")

  case "$status" in
    201|200)
      guid=$(grep -o '"guid"[[:space:]]*:[[:space:]]*"[^"]*"' "${WORK_DIR}/response.json" \
        | head -n 1 | sed 's/.*"\([^"]*\)"$/\1/')
      log "OK    '${name}' ingested${guid:+ (guid ${guid})}."
      ;;
    *)
      log "WARN  '${name}' failed with HTTP ${status:-000}. The stack stays up; retry with 'docker compose up seeder'."
      [ -s "${WORK_DIR}/error.log" ] && log "      $(head -c 300 "${WORK_DIR}/error.log")"
      ;;
  esac
}

# -----------------------------------------------------------------------------
# 1. Local documents shipped with the repository
# -----------------------------------------------------------------------------
if [ -d "$LOCAL_DIR" ]; then
  found=0
  # A for-glob (rather than find | while) keeps the loop in the parent shell and
  # tolerates the spaces present in the bundled file names.
  for file in "$LOCAL_DIR"/*; do
    [ -f "$file" ] || continue
    case "$file" in
      *.pdf|*.PDF|*.docx|*.doc|*.txt|*.md) ;;
      *) continue ;;
    esac
    found=$((found + 1))
    upload "$file" "$(basename "$file")"
  done
  [ "$found" -eq 0 ] && log "No seedable files found in ${LOCAL_DIR}."
else
  log "Local seed directory ${LOCAL_DIR} is not mounted — skipping local documents."
fi

# -----------------------------------------------------------------------------
# 2. Remote public-domain document
# -----------------------------------------------------------------------------
if already_present "$REMOTE_NAME"; then
  log "SKIP  '${REMOTE_NAME}' — already present in the library."
else
  log "DOWNLOAD '${REMOTE_NAME}' from ${REMOTE_URL} ..."
  if curl -fsSL --max-time 180 -o "${WORK_DIR}/${REMOTE_NAME}" "$REMOTE_URL" 2>"${WORK_DIR}/download.log"; then
    # A captive portal or proxy error page would also be written to disk, so
    # confirm the payload really is a PDF before pushing it into the pipeline.
    if [ -s "${WORK_DIR}/${REMOTE_NAME}" ] && head -c 4 "${WORK_DIR}/${REMOTE_NAME}" | grep -q '%PDF'; then
      upload "${WORK_DIR}/${REMOTE_NAME}" "$REMOTE_NAME"
    else
      log "WARN  Downloaded file is not a PDF — skipping '${REMOTE_NAME}'."
    fi
  else
    log "WARN  Could not download '${REMOTE_NAME}' (offline or CDN unavailable). Skipping."
    [ -s "${WORK_DIR}/download.log" ] && log "      $(head -c 200 "${WORK_DIR}/download.log")"
  fi
fi

log "Initial document seeding finished."
exit 0
