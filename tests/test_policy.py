"""Tests for the policy module."""

import pytest

from shared.policy import Action, Policy, default_policy


def test_default_policy_allows_read():
    assert default_policy.evaluate(Action.READ).allowed is True


def test_default_policy_allows_draft():
    assert default_policy.evaluate(Action.DRAFT).allowed is True


def test_default_policy_blocks_write():
    decision = default_policy.evaluate(Action.WRITE)
    assert decision.allowed is False
    assert "blocked" in decision.reason


def test_default_policy_blocks_high_risk():
    assert default_policy.evaluate(Action.HIGH_RISK).allowed is False


def test_require_raises_on_blocked_action():
    with pytest.raises(PermissionError, match="blocked"):
        default_policy.require(Action.WRITE)


def test_custom_policy_write_ceiling():
    policy = Policy(max_allowed=Action.WRITE)
    assert policy.evaluate(Action.READ).allowed is True
    assert policy.evaluate(Action.DRAFT).allowed is True
    assert policy.evaluate(Action.WRITE).allowed is True
    assert policy.evaluate(Action.HIGH_RISK).allowed is False
