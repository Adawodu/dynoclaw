#!/usr/bin/env bash
#
# deploy.sh — provision and deploy all claw-teammate resources on GCP.
#
# Prerequisites:
#   - gcloud CLI authenticated with appropriate permissions
#   - Docker / Cloud Build enabled
#   - Secrets already created in Secret Manager (see placeholders below)
#
# Usage:
#   GCP_PROJECT=my-project bash infra/gcp/deploy.sh
set -euo pipefail

PROJECT="${GCP_PROJECT:?Set GCP_PROJECT}"
REGION="${GCP_REGION:-us-central1}"
REPO="claw-teammate"
WORKFLOW_NAME="claw-daily-workflow"
SCHEDULER_JOB="claw-daily-trigger"
SA_NAME="claw-teammate-sa"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"

echo "==> Project: ${PROJECT}  Region: ${REGION}"

# ── Enable APIs ─────────────────────────────────────────────────────
gcloud services enable \
  run.googleapis.com \
  workflows.googleapis.com \
  cloudscheduler.googleapis.com \
  pubsub.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  --project="${PROJECT}"

# ── Artifact Registry repo ──────────────────────────────────────────
gcloud artifacts repositories describe "${REPO}" \
  --location="${REGION}" --project="${PROJECT}" 2>/dev/null \
|| gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --project="${PROJECT}"

IMAGE_PREFIX="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}"

# ── Service account ─────────────────────────────────────────────────
gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT}" 2>/dev/null \
|| gcloud iam service-accounts create "${SA_NAME}" \
  --display-name="Claw Teammate SA" \
  --project="${PROJECT}"

for ROLE in roles/run.invoker roles/workflows.invoker roles/secretmanager.secretAccessor roles/pubsub.publisher; do
  gcloud projects add-iam-policy-binding "${PROJECT}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet
done

# ── Build & push images (from repo root) ───────────────────────────
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "==> Building control-plane"
gcloud builds submit "${REPO_ROOT}" \
  --tag="${IMAGE_PREFIX}/control-plane:latest" \
  --project="${PROJECT}" \
  --dockerfile=services/control_plane/Dockerfile

echo "==> Building inbox-triage"
gcloud builds submit "${REPO_ROOT}" \
  --tag="${IMAGE_PREFIX}/inbox-triage:latest" \
  --project="${PROJECT}" \
  --dockerfile=workers/inbox_triage/Dockerfile

echo "==> Building content-drafter"
gcloud builds submit "${REPO_ROOT}" \
  --tag="${IMAGE_PREFIX}/content-drafter:latest" \
  --project="${PROJECT}" \
  --dockerfile=workers/content_drafter/Dockerfile

echo "==> Building github-gardener"
gcloud builds submit "${REPO_ROOT}" \
  --tag="${IMAGE_PREFIX}/github-gardener:latest" \
  --project="${PROJECT}" \
  --dockerfile=workers/github_gardener/Dockerfile

# ── Secret Manager references (placeholders — secrets must exist) ──
SECRET_FLAGS=(
  "--set-secrets=GMAIL_CREDENTIALS=gmail-credentials:latest"
  "--set-secrets=GITHUB_TOKEN=github-token:latest"
  "--set-secrets=BEEHIIV_API_KEY=beehiiv-api-key:latest"
  "--set-secrets=SOCIAL_CREDENTIALS=social-credentials:latest"
)

# ── Deploy Cloud Run service: control-plane ─────────────────────────
echo "==> Deploying control-plane service"
gcloud run deploy control-plane \
  --image="${IMAGE_PREFIX}/control-plane:latest" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --service-account="${SA_EMAIL}" \
  --port=8080 \
  --no-allow-unauthenticated \
  "${SECRET_FLAGS[@]}"

# ── Deploy Cloud Run Jobs ──────────────────────────────────────────
for JOB in inbox-triage content-drafter github-gardener; do
  echo "==> Deploying job: ${JOB}"
  gcloud run jobs deploy "${JOB}" \
    --image="${IMAGE_PREFIX}/${JOB}:latest" \
    --region="${REGION}" \
    --project="${PROJECT}" \
    --service-account="${SA_EMAIL}" \
    --task-timeout=15m \
    --max-retries=1 \
    "${SECRET_FLAGS[@]}"
done

# ── Pub/Sub topics ──────────────────────────────────────────────────
for TOPIC in inbox-events content-events github-events; do
  gcloud pubsub topics describe "${TOPIC}" --project="${PROJECT}" 2>/dev/null \
  || gcloud pubsub topics create "${TOPIC}" --project="${PROJECT}"
done

# ── Cloud Workflow ──────────────────────────────────────────────────
echo "==> Deploying workflow"
gcloud workflows deploy "${WORKFLOW_NAME}" \
  --source=infra/gcp/workflow.yaml \
  --location="${REGION}" \
  --project="${PROJECT}" \
  --service-account="${SA_EMAIL}"

# ── Cloud Scheduler (daily at 07:00 UTC) ───────────────────────────
echo "==> Creating/updating scheduler job"
gcloud scheduler jobs describe "${SCHEDULER_JOB}" \
  --location="${REGION}" --project="${PROJECT}" 2>/dev/null \
&& gcloud scheduler jobs update http "${SCHEDULER_JOB}" \
  --location="${REGION}" \
  --project="${PROJECT}" \
  --schedule="0 7 * * *" \
  --uri="https://workflowexecutions.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/workflows/${WORKFLOW_NAME}/executions" \
  --http-method=POST \
  --oauth-service-account-email="${SA_EMAIL}" \
  --message-body='{}' \
|| gcloud scheduler jobs create http "${SCHEDULER_JOB}" \
  --location="${REGION}" \
  --project="${PROJECT}" \
  --schedule="0 7 * * *" \
  --uri="https://workflowexecutions.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/workflows/${WORKFLOW_NAME}/executions" \
  --http-method=POST \
  --oauth-service-account-email="${SA_EMAIL}" \
  --message-body='{}'

echo "==> Deploy complete"
