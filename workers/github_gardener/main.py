"""GitHub-gardener worker — triages issues/PRs, drafts reviews. Runs weekly (Sundays).

Actions stay within DRAFT ceiling:
    - READ: list open issues, PRs, stale branches
    - DRAFT: create PR review comments (not submitted), draft issue responses
    - Never merges or closes without human approval (WRITE/HIGH_RISK)
"""

from __future__ import annotations

from shared.logging import get_logger
from shared.policy import Action, default_policy

log = get_logger(__name__)


def run() -> None:
    default_policy.require(Action.READ)
    log.info("scanning GitHub repos")
    # TODO: connect via Secret Manager GitHub token
    #       - list open PRs, issues, stale branches
    #       - classify urgency

    default_policy.require(Action.DRAFT)
    log.info("drafting PR reviews and issue responses")
    # TODO: generate review comments
    #       - create as pending reviews (not submitted)

    log.info("github gardener complete")


if __name__ == "__main__":
    run()
