from pydantic import BaseModel, Field, model_validator
from typing import List, Self
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


_REJECTED_LEVELS = {RiskLevel.HIGH, RiskLevel.CRITICAL}

# Maps each risk level to its expected score range [min, max] per CLAUDE.md thresholds.
_SCORE_RANGES: dict[RiskLevel, tuple[int, int]] = {
    RiskLevel.LOW: (0, 30),
    RiskLevel.MEDIUM: (31, 60),
    RiskLevel.HIGH: (61, 85),
    RiskLevel.CRITICAL: (86, 100),
}


class FraudResponse(BaseModel):
    risk_score: int = Field(ge=0, le=100)
    risk_level: RiskLevel
    narrative: str
    recommended_action: str
    signals_flagged: List[str] = []
    confidence: float = Field(ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_consistency(self) -> Self:
        is_rejected = self.risk_level in _REJECTED_LEVELS
        action = self.recommended_action.upper()

        if is_rejected and action != "REJECT":
            raise ValueError(
                f"risk_level {self.risk_level} requires recommended_action=REJECT, got {self.recommended_action!r}"
            )
        if not is_rejected and action != "APPROVE":
            raise ValueError(
                f"risk_level {self.risk_level} requires recommended_action=APPROVE, got {self.recommended_action!r}"
            )

        lo, hi = _SCORE_RANGES[self.risk_level]
        if not (lo <= self.risk_score <= hi):
            raise ValueError(
                f"risk_score {self.risk_score} out of range [{lo}, {hi}] for risk_level {self.risk_level}"
            )

        return self

    def is_rejected(self) -> bool:
        return self.risk_level in _REJECTED_LEVELS
