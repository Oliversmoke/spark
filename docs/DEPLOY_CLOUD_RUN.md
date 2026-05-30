# Deploy ComeBack.ai to Google Cloud Run

## Prerequisites

1. [Google Cloud account](https://console.cloud.google.com/) with billing enabled
2. A **GCP project that actually exists** in your account (check with `gcloud projects list`)
3. [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and logged in:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

### Project ID `callback` not found?

If deploy says `Project 'callback' not found`, the ID is set in gcloud but the project was never created (or lives under another Google account).

1. Open [Create project](https://console.cloud.google.com/projectcreate)
2. Name: **ComeBack.ai**, Project ID: **callback** (if taken, use e.g. `comeback-ai-agara`)
3. Link a billing account
4. Run: `gcloud config set project callback` (or your chosen ID)

Or reuse an existing project from `gcloud projects list`.
3. MongoDB Atlas (or other) reachable from the internet — add `0.0.0.0/0` in Network Access for testing, or use [Atlas + VPC](https://www.mongodb.com/docs/atlas/security-private-endpoint/) for production

## One-time setup

```bash
# From repo root
cp env.cloudrun.yaml.example env.cloudrun.yaml
# Edit env.cloudrun.yaml — set MONGODB_URI, AUTH_SECRET, GEMINI_API_KEY, etc.

chmod +x scripts/deploy-cloud-run.sh scripts/setup-cloud-scheduler.sh
```

## Deploy

```bash
gcloud config set project gdg-lagos-bwai-hackathon-2026
cd /Users/emekaagara/callback
./scripts/deploy-cloud-run.sh
```

The script uses **`gcloud run deploy --source .`** (same flow as other hackathon apps). It does **not** create a new Artifact Registry repo — it uses the project’s existing `cloud-run-source-deploy` repository.

**APIs enabled but still errors?** That usually means **IAM**, not APIs. You need roles such as **Cloud Run Developer** + **Cloud Build Editor** (or **Editor** on the project). You do **not** need `artifactregistry.repositories.create` with this script.

If deploy fails with permission errors, ask a project Owner to grant you:
- `roles/run.developer`
- `roles/cloudbuild.builds.editor`
- `roles/iam.serviceAccountUser` on the Cloud Build service account

After the first deploy, copy the service URL and update **`AUTH_URL`** in `env.cloudrun.yaml`, then run the deploy script again.

## Cron jobs (recovery, reminders, weekly review)

Vercel crons do not run on Cloud Run. After deploy:

```bash
./scripts/setup-cloud-scheduler.sh
```

Requires `CRON_SECRET` in `env.cloudrun.yaml`.

## Manual deploy (Cloud Build config)

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_NEXT_PUBLIC_VAPID_PUBLIC_KEY=...,_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

Ensure `env.cloudrun.yaml` exists in the repo root for the deploy step.

## Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGODB_URI` | Yes | Atlas connection string |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `AUTH_URL` | Yes | Cloud Run HTTPS URL (no trailing slash) |
| `GEMINI_API_KEY` | Yes | For AI chat / plans |
| `GEMINI_MODEL` | No | Default `gemini-2.5-flash` |
| `CRON_SECRET` | Yes | Protects `/api/cron` |
| `VAPID_*` | For push | Web push notifications |
| `ADMIN_EMAILS` | Optional | Comma-separated for `/admin` |

## Same GCP project as other apps?

**Safe to deploy alongside other Cloud Run apps.** Each deployment is a separate **service** with its own URL:

| Resource | This app uses | Won't conflict if others use |
|----------|---------------|------------------------------|
| Cloud Run service | `comeback-ai` | Different service names |
| Docker image repo | `comeback-ai` (Artifact Registry) | Other repository names |
| Scheduler jobs | `comeback-recovery`, etc. | Other job names |

Shared project only means **shared billing** and IAM — not shared memory, ports, or databases. Your MongoDB Atlas connection is still your own cluster/database name.

Default project for scripts: `gdg-lagos-bwai-hackathon-2026`.

## Troubleshooting

- **502 / container failed to start** — Check logs: `gcloud run services logs read comeback-ai --region=us-central1`
- **DB connection failed** — Atlas IP allowlist; verify `MONGODB_URI`
- **AI 404** — Use `GEMINI_MODEL=gemini-2.5-flash`
- **Auth cookies** — `AUTH_URL` must exactly match the browser URL (https)
