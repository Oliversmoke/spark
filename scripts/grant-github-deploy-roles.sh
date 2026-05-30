#!/usr/bin/env bash
# Run as a GCP project Owner (not a regular hackathon member).
# Grants github-deploy-comeback the roles needed for GitHub Actions deploy.
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-gdg-lagos-bwai-hackathon-2026}"
SA_ID="${GCP_DEPLOY_SA_ID:-github-deploy-comeback}"
SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Project: $PROJECT_ID"
echo "Service account: $SA_EMAIL"
gcloud config set project "$PROJECT_ID" >/dev/null

if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
  echo "Error: SA does not exist. Member should run ./scripts/setup-github-deploy.sh first."
  exit 1
fi

for role in \
  roles/run.admin \
  roles/cloudbuild.builds.editor \
  roles/iam.serviceAccountUser \
  roles/storage.admin \
  roles/artifactregistry.writer \
  roles/secretmanager.secretAccessor; do
  echo "+ $role"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$role" \
    --condition=None \
    --quiet
done

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
echo "+ roles/iam.serviceAccountUser on $CB_SA"
gcloud iam service-accounts add-iam-policy-binding "$CB_SA" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --quiet

echo ""
echo "Done. Member can run:"
echo "  gcloud iam service-accounts keys create github-deploy-key.json --iam-account=$SA_EMAIL"
echo "Then add GCP_SA_KEY + ENV_CLOUDRUN_YAML to GitHub Actions secrets."
