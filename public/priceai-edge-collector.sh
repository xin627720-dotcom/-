#!/usr/bin/env bash
set -euo pipefail

PRIMARY_ENDPOINT="${PRICEAI_ENDPOINT:-https://priceai.cc}"
FALLBACK_ENDPOINTS="${PRICEAI_ENDPOINTS:-${PRICEAI_FALLBACK_ENDPOINTS:-${PRICEAI_RELAY_ENDPOINT:-}}}"
TMP_DIR="${TMPDIR:-/tmp}"
SCRIPT_PATH="$(mktemp "$TMP_DIR/priceai-edge-collector.XXXXXX.mjs")"
cleanup() {
  rm -f "$SCRIPT_PATH"
}
trap cleanup EXIT

ENDPOINTS=()
add_endpoint() {
  local endpoint="${1:-}"
  endpoint="${endpoint#"${endpoint%%[![:space:]]*}"}"
  endpoint="${endpoint%"${endpoint##*[![:space:]]}"}"
  endpoint="${endpoint%/}"
  [ -z "$endpoint" ] && return
  local existing
  for existing in "${ENDPOINTS[@]}"; do
    [ "$existing" = "$endpoint" ] && return
  done
  ENDPOINTS+=("$endpoint")
}

join_endpoints() {
  local output=""
  local endpoint
  for endpoint in "${ENDPOINTS[@]}"; do
    if [ -z "$output" ]; then
      output="$endpoint"
    else
      output="$output,$endpoint"
    fi
  done
  printf '%s' "$output"
}

add_endpoint "$PRIMARY_ENDPOINT"
IFS=',' read -r -a EXTRA_ENDPOINTS <<< "$FALLBACK_ENDPOINTS"
for endpoint in "${EXTRA_ENDPOINTS[@]}"; do
  add_endpoint "$endpoint"
done

if ! command -v node >/dev/null 2>&1; then
  echo "PriceAI edge collector requires Node.js 18+." >&2
  echo "Install Node.js first, then rerun this command." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "PriceAI edge collector requires Node.js 18+. Current: $(node -v)" >&2
  exit 1
fi

DOWNLOADED_ENDPOINT=""
if [ -n "${PRICEAI_EDGE_COLLECTOR_SCRIPT_URL:-}" ]; then
  curl -fsSL \
    --connect-timeout "${PRICEAI_EDGE_CONNECT_TIMEOUT_SECONDS:-8}" \
    --max-time "${PRICEAI_EDGE_DOWNLOAD_TIMEOUT_SECONDS:-45}" \
    "$PRICEAI_EDGE_COLLECTOR_SCRIPT_URL" -o "$SCRIPT_PATH"
  DOWNLOADED_ENDPOINT="${ENDPOINTS[0]}"
else
  for endpoint in "${ENDPOINTS[@]}"; do
    if curl -fsSL \
      --connect-timeout "${PRICEAI_EDGE_CONNECT_TIMEOUT_SECONDS:-8}" \
      --max-time "${PRICEAI_EDGE_DOWNLOAD_TIMEOUT_SECONDS:-45}" \
      "$endpoint/priceai-edge-collector.mjs" -o "$SCRIPT_PATH"; then
      DOWNLOADED_ENDPOINT="$endpoint"
      break
    fi
  done
fi

if [ -z "$DOWNLOADED_ENDPOINT" ]; then
  echo "Failed to download PriceAI edge collector from all configured endpoints." >&2
  exit 1
fi

export PRICEAI_ENDPOINT="$DOWNLOADED_ENDPOINT"
export PRICEAI_ENDPOINTS="$(join_endpoints)"
node "$SCRIPT_PATH" "$@"
