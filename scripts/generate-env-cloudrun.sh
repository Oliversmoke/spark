#!/usr/bin/env bash
# Generate env.cloudrun.yaml from .env.local (gitignored output)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/.env.local}"
OUT="${2:-$ROOT/env.cloudrun.yaml}"

if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC — copy env.cloudrun.yaml.example to env.cloudrun.yaml instead."
  exit 1
fi

{
  echo "# Auto-generated from $SRC — edit AUTH_URL after first deploy"
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    val="${val%\"}"
    val="${val#\"}"
    # YAML-safe quoting
    val="${val//\\/\\\\}"
    val="${val//\"/\\\"}"
    echo "${key}: \"${val}\""
  done < "$SRC"
  grep -q '^CRON_SECRET:' "$SRC" 2>/dev/null || echo "CRON_SECRET: \"$(openssl rand -base64 24)\""
} > "$OUT"

echo "Wrote $OUT"
echo "Set AUTH_URL to your Cloud Run URL before deploying."
