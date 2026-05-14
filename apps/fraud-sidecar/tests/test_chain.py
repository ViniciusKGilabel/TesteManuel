import json
import pytest
from unittest.mock import AsyncMock, MagicMock
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from models.fraud_request import FraudRequest, OrderItem
from models.fraud_response import FraudResponse, RiskLevel
from chains.fraud_chain import _format_context, _to_fraud_response, build_chain


def make_request(**kwargs) -> FraudRequest:
    defaults = {
        "order_id": "ord-test-1",
        "user_id": "user-test-1",
        "amount": 150.00,
        "currency": "BRL",
        "items": [OrderItem(product_id="prod-1", quantity=2, unit_price=75.00)],
        "user_account_age_days": 365,
        "orders_last_24h": 1,
        "orders_last_hour": 0,
        "cart_to_order_seconds": 300,
        "is_new_address": False,
        "order_time_utc": "2026-05-11T14:00:00Z",
    }
    defaults.update(kwargs)
    return FraudRequest(**defaults)


class TestFormatContext:
    def test_formats_all_fields(self):
        req = make_request()
        ctx = _format_context(req)
        assert ctx["order_id"] == "ord-test-1"
        assert ctx["amount"] == 150.00
        assert "prod-1" in ctx["items_summary"]
        assert ctx["is_new_address"] == "no"

    def test_new_address_flag(self):
        req = make_request(is_new_address=True)
        ctx = _format_context(req)
        assert ctx["is_new_address"] == "yes"

    def test_multiple_items_in_summary(self):
        req = make_request(items=[
            OrderItem(product_id="p1", quantity=1, unit_price=50.00),
            OrderItem(product_id="p2", quantity=3, unit_price=20.00),
        ])
        ctx = _format_context(req)
        assert "p1" in ctx["items_summary"]
        assert "p2" in ctx["items_summary"]


class TestToFraudResponse:
    def test_converts_low_risk(self):
        data = {
            "risk_score": 10,
            "risk_level": "LOW",
            "narrative": "Normal transaction.",
            "recommended_action": "APPROVE",
            "signals_flagged": [],
            "confidence": 0.95,
        }
        resp = _to_fraud_response(data)
        assert isinstance(resp, FraudResponse)
        assert resp.risk_score == 10
        assert resp.risk_level == RiskLevel.LOW
        assert not resp.is_rejected()

    def test_converts_critical_risk(self):
        data = {
            "risk_score": 90,
            "risk_level": "CRITICAL",
            "narrative": "Multiple fraud signals detected.",
            "recommended_action": "REJECT",
            "signals_flagged": ["high_frequency", "new_address"],
            "confidence": 0.98,
        }
        resp = _to_fraud_response(data)
        assert resp.risk_level == RiskLevel.CRITICAL
        assert resp.is_rejected()
        assert len(resp.signals_flagged) == 2

    def test_raises_on_missing_required_fields(self):
        with pytest.raises(ValueError, match="missing required fields"):
            _to_fraud_response({})


class TestFraudResponseModel:
    def test_low_risk_not_rejected(self):
        resp = _to_fraud_response({"risk_score": 30, "risk_level": "LOW",
                                   "narrative": "ok", "recommended_action": "APPROVE",
                                   "confidence": 0.9})
        assert not resp.is_rejected()

    def test_high_risk_rejected(self):
        resp = _to_fraud_response({"risk_score": 65, "risk_level": "HIGH",
                                   "narrative": "suspicious", "recommended_action": "REJECT",
                                   "confidence": 0.88})
        assert resp.is_rejected()

    def test_signals_preserved(self):
        data = {
            "risk_score": 50,
            "risk_level": "MEDIUM",
            "narrative": "Monitor.",
            "recommended_action": "APPROVE",
            "signals_flagged": ["new_address", "fast_checkout"],
            "confidence": 0.85,
        }
        resp = _to_fraud_response(data)
        assert "new_address" in resp.signals_flagged
        assert "fast_checkout" in resp.signals_flagged


class TestBuildChainWithFakeLLM:
    """Integration tests for the full chain using FakeListChatModel instead of the real Anthropic API."""

    def _fake_chain(self, response_data: dict):
        llm = FakeListChatModel(responses=[json.dumps(response_data)])
        return build_chain(llm=llm)

    @pytest.mark.asyncio
    async def test_low_risk_order_is_approved(self):
        chain = self._fake_chain({
            "risk_score": 15,
            "risk_level": "LOW",
            "narrative": "Normal transaction.",
            "recommended_action": "APPROVE",
            "signals_flagged": [],
            "confidence": 0.95,
        })
        result = await chain.ainvoke(make_request())
        assert isinstance(result, FraudResponse)
        assert result.risk_level == RiskLevel.LOW
        assert not result.is_rejected()

    @pytest.mark.asyncio
    async def test_high_risk_order_is_rejected(self):
        chain = self._fake_chain({
            "risk_score": 75,
            "risk_level": "HIGH",
            "narrative": "Multiple fraud signals.",
            "recommended_action": "REJECT",
            "signals_flagged": ["high_velocity"],
            "confidence": 0.93,
        })
        result = await chain.ainvoke(make_request())
        assert result.is_rejected()
        assert result.risk_level == RiskLevel.HIGH

    @pytest.mark.asyncio
    async def test_critical_risk_order_is_rejected(self):
        chain = self._fake_chain({
            "risk_score": 92,
            "risk_level": "CRITICAL",
            "narrative": "Confirmed fraud pattern.",
            "recommended_action": "REJECT",
            "signals_flagged": ["known_fraud_device", "high_velocity"],
            "confidence": 0.99,
        })
        result = await chain.ainvoke(make_request())
        assert result.is_rejected()
        assert result.risk_level == RiskLevel.CRITICAL
        assert len(result.signals_flagged) == 2

    @pytest.mark.asyncio
    async def test_chain_exposes_signals_flagged(self):
        chain = self._fake_chain({
            "risk_score": 45,
            "risk_level": "MEDIUM",
            "narrative": "Monitor this user.",
            "recommended_action": "APPROVE",
            "signals_flagged": ["new_address", "fast_checkout"],
            "confidence": 0.80,
        })
        result = await chain.ainvoke(make_request())
        assert "new_address" in result.signals_flagged
        assert not result.is_rejected()
