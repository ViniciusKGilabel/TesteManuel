import pytest
from models.fraud_response import FraudResponse, RiskLevel


def make_response(risk_score: int, risk_level: str, action: str) -> FraudResponse:
    return FraudResponse(
        risk_score=risk_score,
        risk_level=RiskLevel(risk_level),
        narrative="Test narrative.",
        recommended_action=action,
        signals_flagged=[],
        confidence=0.9,
    )


class TestRiskThresholds:
    def test_low_risk_is_approved(self):
        resp = make_response(15, "LOW", "APPROVE")
        assert not resp.is_rejected()

    def test_medium_risk_is_approved(self):
        resp = make_response(45, "MEDIUM", "APPROVE")
        assert not resp.is_rejected()

    def test_high_risk_is_rejected(self):
        resp = make_response(70, "HIGH", "REJECT")
        assert resp.is_rejected()

    def test_critical_risk_is_rejected(self):
        resp = make_response(95, "CRITICAL", "REJECT")
        assert resp.is_rejected()

    def test_boundary_60_is_approved(self):
        resp = make_response(60, "MEDIUM", "APPROVE")
        assert not resp.is_rejected()

    def test_boundary_61_is_rejected(self):
        resp = make_response(61, "HIGH", "REJECT")
        assert resp.is_rejected()

    def test_zero_score_is_low(self):
        resp = make_response(0, "LOW", "APPROVE")
        assert resp.risk_level == RiskLevel.LOW
        assert not resp.is_rejected()

    def test_perfect_score_is_critical(self):
        resp = make_response(100, "CRITICAL", "REJECT")
        assert resp.risk_level == RiskLevel.CRITICAL
        assert resp.is_rejected()

    def test_medium_risk_monitor_is_invalid(self):
        with pytest.raises(ValueError, match="recommended_action=APPROVE"):
            make_response(45, "MEDIUM", "MONITOR")
