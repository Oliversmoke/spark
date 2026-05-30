#!/usr/bin/env bash
# Deploy ComeBack.ai to Google Cloud Run.
# Uses `gcloud run deploy --source` so you don't need permission to create Artifact Registry repos.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="${GCP_PROJECT_ID:-gdg-lagos-bwai-hackathon-2026}"
if [[ "$PROJECT_ID" == "(unset)" ]]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null)"
fi
REGION="${GCP_REGION:-us-central1}"
SERVICE="${GCP_SERVICE:-comeback-ai}"
ENV_FILE="${ENV_FILE:-$ROOT/env.cloudrun.yaml}"

if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "(unset)" ]]; then
  echo "Error: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

if ! gcloud projects describe "$PROJECT_ID" --format='value(projectId)' &>/dev/null; then
  echo "Error: Project '$PROJECT_ID' not found."
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI not found."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: Missing $ENV_FILE — run: ./scripts/generate-env-cloudrun.sh"
  exit 1
fi

echo "==> Project: $PROJECT_ID | Region: $REGION | Service: $SERVICE"
echo "==> Deploying from source (uses existing cloud-run-source-deploy repo)..."

# NEXT_PUBLIC_* must be set at Docker build time
VAPID_PUB=$(grep '^NEXT_PUBLIC_VAPID_PUBLIC_KEY:' "$ENV_FILE" | sed 's/^NEXT_PUBLIC_VAPID_PUBLIC_KEY: *"\?\([^"]*\)"\?.*/\1/' || true)
STRIPE_PUB=$(grep '^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:' "$ENV_FILE" | sed 's/^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: *"\?\([^"]*\)"\?.*/\1/' || true)
PLAUSIBLE=$(grep '^NEXT_PUBLIC_PLAUSIBLE_DOMAIN:' "$ENV_FILE" | sed 's/^NEXT_PUBLIC_PLAUSIBLE_DOMAIN: *"\?\([^"]*\)"\?.*/\1/' || true)

BUILD_ENV="NEXT_PUBLIC_VAPID_PUBLIC_KEY=${VAPID_PUB},NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUB},NEXT_PUBLIC_PLAUSIBLE_DOMAIN=${PLAUSIBLE}"

gcloud run deploy "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --source=. \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300 \
  --env-vars-file="$ENV_FILE" \
  --set-build-env-vars="$BUILD_ENV"

URL=$(gcloud run services describe "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='value(status.url)')

echo ""
echo "Deployed: $URL"
echo ""
echo "Update env.cloudrun.yaml then redeploy once:"
echo "  AUTH_URL: \"$URL\""
echo ""
echo "Cron: ./scripts/setup-cloud-scheduler.sh"
