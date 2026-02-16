"""Inbox-triage worker — scans Gmail, labels/drafts replies. Runs daily."""

from __future__ import annotations

from shared.logging import get_logger
from shared.policy import Action, default_policy

log = get_logger(__name__)


def run() -> None:
    default_policy.require(Action.READ)
    log.info("scanning inbox")
    # TODO: connect to Gmail via Secret Manager credentials
    #       - fetch unread threads
    #       - classify priority
    #       - apply labels (READ)
    #       - draft replies for high-priority (DRAFT)

    default_policy.require(Action.DRAFT)
    log.info("drafting replies for flagged threads")

    log.info("inbox triage complete")


if __name__ == "__main__":
    run()
