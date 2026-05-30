#!/usr/bin/env bash
# One-time: deploy service account + optional Secret Manager + GitHub Actions key.
# If IAM binding fails (hackathon projects), ask a project Owner to run:
#   ./scripts/grant-github-deploy-roles.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="${GCP_PROJECT_ID:-gdg-lagos-bwai-hackathon-2026}"
REGION="${GCP_REGION:-us-central1}"
SA_ID="${GCP_DEPLOY_SA_ID:-github-deploy-comeback}"
SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
SECRET_NAME="${GCP_ENV_SECRET:-comeback-ai-env-yaml}"
ENV_FILE="${ENV_FILE:-$ROOT/env.cloudrun.yaml}"
KEY_FILE="${KEY_FILE:-$ROOT/github-deploy-key.json}"

IAM_FAILED=0

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI required."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: Missing $ENV_FILE"
  exit 1
fi

echo "==> Project: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null

echo "==> Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project="$PROJECT_ID" \
  --quiet

echo "==> Service account: $SA_EMAIL"
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
  gcloud iam service-accounts create "$SA_ID" \
    --project="$PROJECT_ID" \
    --display-name="GitHub Actions — ComeBack.ai deploy"
fi

bind_role() {
  if gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$1" \
    --condition=None \
    --quiet >/dev/null 2>&1; then
    echo "    ✓ $1"
    return 0
  fi
  echo "    ✗ $1 (needs project Owner — see grant-github-deploy-roles.sh)"
  IAM_FAILED=1
  return 1
}

echo "==> Granting roles (skipped if you lack setIamPolicy)..."
for role in \
  roles/run.admin \
  roles/cloudbuild.builds.editor \
  roles/iam.serviceAccountUser \
  roles/storage.admin \
  roles/artifactregistry.writer \
  roles/secretmanager.secretAccessor; do
  bind_role "$role" || true
done

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
if ! gcloud iam service-accounts add-iam-policy-binding "$CB_SA" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --quiet >/dev/null 2>&1; then
  echo "    ✗ Cloud Build SA impersonation (Owner must grant — see grant script)"
  IAM_FAILED=1
fi

echo "==> Secret Manager: $SECRET_NAME (optional)"
if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
  gcloud secrets versions add "$SECRET_NAME" --project="$PROJECT_ID" --data-file="$ENV_FILE" --quiet \
    && echo "    ✓ secret version added" \
    || echo "    ✗ could not update secret"
else
  gcloud secrets create "$SECRET_NAME" \
    --project="$PROJECT_ID" \
    --replication-policy="automatic" \
    --data-file="$ENV_FILE" \
    --quiet \
    && echo "    ✓ secret created" \
    || echo "    ✗ could not create secret (Owner or Secret Manager Admin)"
fi

KEY_OK=0
echo "==> Service account key → $KEY_FILE"
if gcloud iam service-accounts keys create "$KEY_FILE" \
  --iam-account="$SA_EMAIL" \
  --project="$PROJECT_ID" 2>/dev/null; then
  KEY_OK=1
  echo "    ✓ key created"
else
  echo "    ✗ could not create key (Owner may need: roles/iam.serviceAccountKeyAdmin on the SA)"
fi

echo ""
if [[ "$IAM_FAILED" -eq 1 ]]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "IAM: Your account can deploy manually but cannot grant roles."
  echo ""
  echo "Option A — Ask a project Owner to run (one time):"
  echo "  ./scripts/grant-github-deploy-roles.sh"
  echo ""
  echo "Option B — Skip GitHub Actions; keep deploying like this (works today):"
  echo "  gcloud run deploy comeback-ai --project=$PROJECT_ID --region=$REGION \\"
  echo "    --source=. --allow-unauthenticated --port=8080 --memory=512Mi \\"
  echo "    --timeout=300 --env-vars-file=env.cloudrun.yaml \\"
  echo "    --set-build-env-vars=\"NEXT_PUBLIC_VAPID_PUBLIC_KEY=...,...\""
  echo ""
  echo "Option C — Cloud Build trigger in Console (no github-deploy SA):"
  echo "  https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID"
  echo "  Connect GitHub → spark → branch dev → cloudbuild.yaml"
  echo "  Owner must upload env to Secret Manager: comeback-ai-env-yaml"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
fi

if [[ "$KEY_OK" -eq 1 ]]; then
  echo "GitHub secrets: https://github.com/Oliversmoke/spark/settings/secrets/actions"
  echo "  GCP_SA_KEY     → contents of $KEY_FILE"
  echo "  ENV_CLOUDRUN_YAML → contents of $ENV_FILE"
  echo ""
  echo "If Actions deploy fails with PERMISSION_DENIED, Owner must run grant-github-deploy-roles.sh first."
  echo "Live URL: https://comeback-ai-${PROJECT_NUMBER}.${REGION}.run.app"
else
  echo "No key file yet. After Owner grants roles, re-run:"
  echo "  gcloud iam service-accounts keys create $KEY_FILE --iam-account=$SA_EMAIL"
  exit 1
fi
