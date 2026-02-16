"""Policy module — defines action classes and the default guardrails.

Action hierarchy (ascending risk):
    READ   → observe only (inbox scan, PR list, analytics fetch)
    DRAFT  → create artifacts that stay invisible until human approval
             (Gmail drafts, Beehiiv drafts, social-post drafts, PR comments)
    WRITE  → publish or mutate visible state (send email, merge PR, post)
    HIGH_RISK → destructive / hard-to-reverse (delete repo, mass-email, deploy)

The default policy is DRAFT-ONLY: workers may READ freely and DRAFT
artifacts, but WRITE and HIGH_RISK actions require explicit human approval.
"""

from __future__ import annotations

from enum import Enum, auto
from dataclasses import dataclass


class Action(Enum):
    READ = auto()
    DRAFT = auto()
    WRITE = auto()
    HIGH_RISK = auto()


@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    reason: str


class Policy:
    """Evaluates whether an action is permitted under the active policy."""

    def __init__(self, max_allowed: Action = Action.DRAFT) -> None:
        self.max_allowed = max_allowed

    def evaluate(self, action: Action) -> PolicyDecision:
        if action.value <= self.max_allowed.value:
            return PolicyDecision(allowed=True, reason=f"{action.name} permitted")
        return PolicyDecision(
            allowed=False,
            reason=(
                f"{action.name} blocked — exceeds policy ceiling "
                f"({self.max_allowed.name}). Human approval required."
            ),
        )

    def require(self, action: Action) -> None:
        """Raise if the action is not allowed."""
        decision = self.evaluate(action)
        if not decision.allowed:
            raise PermissionError(decision.reason)


# Singleton — importable everywhere as `from shared.policy import default_policy`
default_policy = Policy(max_allowed=Action.DRAFT)
