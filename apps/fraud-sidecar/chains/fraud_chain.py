from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_core.output_parsers import JsonOutputParser

from models.fraud_request import FraudRequest
from models.fraud_response import FraudResponse, RiskLevel
from chains.prompts import FRAUD_ANALYSIS_PROMPT


def _format_context(request: FraudRequest) -> dict:
    items_summary = ", ".join(
        f"{item.quantity}x {item.product_id} @ {request.currency} {item.unit_price:.2f}"
        for item in request.items
    )
    return {
        "order_id": request.order_id,
        "amount": request.amount,
        "currency": request.currency,
        "items_summary": items_summary,
        "user_account_age_days": request.user_account_age_days,
        "orders_last_24h": request.orders_last_24h,
        "orders_last_hour": request.orders_last_hour,
        "cart_to_order_seconds": request.cart_to_order_seconds,
        "is_new_address": "yes" if request.is_new_address else "no",
        "order_time_utc": request.order_time_utc or "unknown",
    }


def _to_fraud_response(data: dict) -> FraudResponse:
    required = {"risk_score", "risk_level", "recommended_action", "confidence"}
    missing = required - data.keys()
    if missing:
        raise ValueError(f"LLM response missing required fields: {missing}")
    return FraudResponse(
        risk_score=int(data["risk_score"]),
        risk_level=RiskLevel(data["risk_level"]),
        narrative=data.get("narrative", ""),
        recommended_action=data["recommended_action"],
        signals_flagged=data.get("signals_flagged", []),
        confidence=float(data["confidence"]),
    )


def build_chain(llm=None):
    if llm is None:
        llm = ChatAnthropic(model="claude-sonnet-4-6")

    prompt = ChatPromptTemplate.from_template(FRAUD_ANALYSIS_PROMPT)
    parser = JsonOutputParser()

    chain = (
        RunnableLambda(_format_context)
        | prompt
        | llm
        | parser
        | RunnableLambda(_to_fraud_response)
    )
    return chain


async def analyze(request: FraudRequest, chain=None) -> FraudResponse:
    if chain is None:
        chain = build_chain()
    result = await chain.ainvoke(request)
    return result
