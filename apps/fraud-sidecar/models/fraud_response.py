from pydantic import BaseModel, Field
from typing import List
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


_REJECTED_LEVELS = {RiskLevel.HIGH, RiskLevel.CRITICAL}


class FraudResponse(BaseModel):
    risk_score: int = Field(ge=0, le=100)
    risk_level: RiskLevel
    narrative: str
    recommended_action: str
    signals_flagged: List[str] = []
    confidence: float = Field(ge=0.0, le=1.0)

    def is_rejected(self) -> bool:
        return self.risk_level in _REJECTED_LEVELS
