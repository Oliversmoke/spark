# Git push → Cloud Run (when setup script fails on IAM)

## What works for you today

Manual deploy (your terminal 34) uses **your user account**, which has Cloud Run deploy rights:

```bash
gcloud run deploy comeback-ai \
  --project=gdg-lagos-bwai-hackathon-2026 \
  --region=us-central1 \
  --source=. \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --timeout=300 \
  --env-vars-file=env.cloudrun.yaml \
  --set-build-env-vars="NEXT_PUBLIC_VAPID_PUBLIC_KEY=...,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=,NEXT_PUBLIC_PLAUSIBLE_DOMAIN="
```

**Service URL (keep this in `AUTH_URL`):**  
`https://comeback-ai-1009210138227.us-central1.run.app`

`git push` alone does **not** deploy until GitHub Actions secrets are set up.

---

## Why `setup-github-deploy.sh` failed

The script creates service account `github-deploy-comeback`, then tries to **grant IAM roles** on the project. That needs `setIamPolicy` (typically **Owner** or **Security Admin**).

Hackathon members often can **deploy** but **cannot** change project IAM — same error you saw:

`Policy update access denied`

The service account was created, but it has **no deploy permissions** until an Owner grants them.

---

## Finish GitHub Actions (needs Owner once)

### Step 1 — You (already done)

Service account exists: `github-deploy-comeback@gdg-lagos-bwai-hackathon-2026.iam.gserviceaccount.com`

### Step 2 — Project Owner runs

Send them this repo and ask them to run:

```bash
cd callback
chmod +x scripts/grant-github-deploy-roles.sh
./scripts/grant-github-deploy-roles.sh
```

### Step 3 — You create the key

```bash
gcloud iam service-accounts keys create github-deploy-key.json \
  --iam-account=github-deploy-comeback@gdg-lagos-bwai-hackathon-2026.iam.gserviceaccount.com \
  --project=gdg-lagos-bwai-hackathon-2026
```

### Step 4 — GitHub secrets

[spark → Settings → Secrets → Actions](https://github.com/Oliversmoke/spark/settings/secrets/actions)

| Secret | Value |
|--------|--------|
| `GCP_SA_KEY` | Full `github-deploy-key.json` |
| `ENV_CLOUDRUN_YAML` | Full `env.cloudrun.yaml` (set `AUTH_URL` to the URL above) |

Push to `dev` → Actions deploys → **same URL**, new revision.

---

## No Owner? Use manual deploy only

Keep using the `gcloud run deploy` command after each change. That is valid for the hackathon; CI is optional.

---

## Alternative: Cloud Build trigger (Console)

Uses the project’s **Cloud Build** service account (same as `--source` deploy), not `github-deploy-comeback`:

1. Owner uploads env:  
   `gcloud secrets create comeback-ai-env-yaml --data-file=env.cloudrun.yaml`  
   (or add a new version if it exists)
2. [Cloud Build → Triggers](https://console.cloud.google.com/cloud-build/triggers?project=gdg-lagos-bwai-hackathon-2026) → Connect GitHub → `Oliversmoke/spark` → branch `dev` → `cloudbuild.yaml`
3. Push to `dev` builds in GCP (not GitHub Actions)
