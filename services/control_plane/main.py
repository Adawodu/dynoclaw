"""Control-plane API — orchestrates workers and exposes status/approvals."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from shared import config
from shared.logging import get_logger
from shared.policy import Action, default_policy

log = get_logger(__name__)

app = FastAPI(title="Claw Teammate – Control Plane")


# ── Health ──────────────────────────────────────────────────────────
@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# ── Policy check ────────────────────────────────────────────────────
class PolicyCheckRequest(BaseModel):
    action: str  # READ | DRAFT | WRITE | HIGH_RISK


class PolicyCheckResponse(BaseModel):
    allowed: bool
    reason: str


@app.post("/policy/check", response_model=PolicyCheckResponse)
def policy_check(req: PolicyCheckRequest) -> PolicyCheckResponse:
    try:
        action = Action[req.action.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")
    decision = default_policy.evaluate(action)
    log.info(f"policy check action={action.name} allowed={decision.allowed}")
    return PolicyCheckResponse(allowed=decision.allowed, reason=decision.reason)


# ── Worker status (stub) ───────────────────────────────────────────
@app.get("/workers/status")
def workers_status() -> dict:
    return {
        "inbox_triage": "idle",
        "content_drafter": "idle",
        "github_gardener": "idle",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=config.CONTROL_PLANE_PORT)
