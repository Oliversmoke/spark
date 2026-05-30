#!/usr/bin/env bash
# Cloud Scheduler jobs (replaces Vercel crons on Cloud Run)
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="${GCP_SERVICE:-comeback-ai}"
ENV_FILE="${ENV_FILE:-$(cd "$(dirname "$0")/.." && pwd)/env.cloudrun.yaml}"

CRON_SECRET=$(grep '^CRON_SECRET:' "$ENV_FILE" | sed 's/^CRON_SECRET: *"\?\([^"]*\)"\?.*/\1/' || true)
if [[ -z "$CRON_SECRET" ]]; then
  echo "Error: CRON_SECRET missing in env.cloudrun.yaml"
  exit 1
fi

URL=$(gcloud run services describe "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='value(status.url)')

gcloud services enable cloudscheduler.googleapis.com --project="$PROJECT_ID"

create_job() {
  local name=$1 schedule=$2 job=$3
  if gcloud scheduler jobs describe "$name" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    gcloud scheduler jobs update http "$name" \
      --project="$PROJECT_ID" \
      --location="$REGION" \
      --schedule="$schedule" \
      --uri="${URL}/api/cron?job=${job}" \
      --http-method=GET \
      --headers="Authorization=Bearer ${CRON_SECRET}" \
      --attempt-deadline=300s
  else
    gcloud scheduler jobs create http "$name" \
      --project="$PROJECT_ID" \
      --location="$REGION" \
      --schedule="$schedule" \
      --uri="${URL}/api/cron?job=${job}" \
      --http-method=GET \
      --headers="Authorization=Bearer ${CRON_SECRET}" \
      --attempt-deadline=300s
  fi
  echo "Scheduler: $name -> ${job}"
}

create_job "comeback-recovery" "0 10 * * *" "recovery"
create_job "comeback-reminders" "0 * * * *" "reminders"
create_job "comeback-weekly-review" "0 18 * * 0" "weekly-review"

echo "Done. Cron target: $URL/api/cron"
