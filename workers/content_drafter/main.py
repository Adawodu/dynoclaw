"""Content-drafter worker — creates social posts daily, newsletter weekly.

Schedule:
    - Daily: draft social posts (Twitter/LinkedIn/etc.)
    - Monday: draft Beehiiv newsletter edition

All outputs are DRAFT-only; nothing publishes without human approval.
"""

from __future__ import annotations

import datetime

from shared.logging import get_logger
from shared.policy import Action, default_policy

log = get_logger(__name__)


def run() -> None:
    today = datetime.date.today()
    is_monday = today.weekday() == 0

    default_policy.require(Action.DRAFT)

    log.info("drafting social posts")
    # TODO: generate social post drafts via LLM
    #       - save as drafts on each platform

    if is_monday:
        log.info("drafting weekly newsletter (Beehiiv)")
        # TODO: compile newsletter content
        #       - create Beehiiv draft via API

    log.info("content drafter complete")


if __name__ == "__main__":
    run()
