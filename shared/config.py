"""Centralised configuration — reads from env vars with sensible defaults.

Secrets are expected to come from GCP Secret Manager at runtime.
This module only references placeholder names, never actual values.
"""

from __future__ import annotations

import os


# ── GCP ──────────────────────────────────────────────────────────────
GCP_PROJECT = os.getenv("GCP_PROJECT", "claw-teammate")
GCP_REGION = os.getenv("GCP_REGION", "us-central1")

# ── Secret Manager placeholder names ────────────────────────────────
SECRET_GMAIL_CREDENTIALS = os.getenv(
    "SECRET_GMAIL_CREDENTIALS", "projects/${GCP_PROJECT}/secrets/gmail-credentials/versions/latest"
)
SECRET_GITHUB_TOKEN = os.getenv(
    "SECRET_GITHUB_TOKEN", "projects/${GCP_PROJECT}/secrets/github-token/versions/latest"
)
SECRET_BEEHIIV_API_KEY = os.getenv(
    "SECRET_BEEHIIV_API_KEY", "projects/${GCP_PROJECT}/secrets/beehiiv-api-key/versions/latest"
)
SECRET_SOCIAL_CREDENTIALS = os.getenv(
    "SECRET_SOCIAL_CREDENTIALS", "projects/${GCP_PROJECT}/secrets/social-credentials/versions/latest"
)

# ── Pub/Sub topics ──────────────────────────────────────────────────
TOPIC_INBOX_EVENTS = os.getenv("TOPIC_INBOX_EVENTS", "inbox-events")
TOPIC_CONTENT_EVENTS = os.getenv("TOPIC_CONTENT_EVENTS", "content-events")
TOPIC_GITHUB_EVENTS = os.getenv("TOPIC_GITHUB_EVENTS", "github-events")

# ── Control plane ───────────────────────────────────────────────────
CONTROL_PLANE_PORT = int(os.getenv("CONTROL_PLANE_PORT", "8080"))
