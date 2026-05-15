FRAUD_ANALYSIS_PROMPT = """You are an expert e-commerce fraud analyst. Analyze the following transaction and return a structured risk assessment.

Transaction details:
- Order ID: {order_id}
- Amount: {currency} {amount:.2f}
- Items: {items_summary}
- User account age: {user_account_age_days} days
- Orders in last 24h: {orders_last_24h}
- Orders in last hour: {orders_last_hour}
- Time from cart to order: {cart_to_order_seconds} seconds
- New shipping address: {is_new_address}
- Order time (UTC): {order_time_utc}

Respond ONLY with a valid JSON object matching this exact schema:
{{
  "risk_score": <integer 0-100>,
  "risk_level": <"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">,
  "narrative": "<human-readable explanation of the risk assessment>",
  "recommended_action": <"APPROVE" | "REJECT">,
  "signals_flagged": ["<signal1>", "<signal2>"],
  "confidence": <float 0.0-1.0>,
  "manual_review_required": <boolean — true when risk_level is CRITICAL>
}}

Risk thresholds:
- 0-30: LOW → APPROVE
- 31-60: MEDIUM → APPROVE (monitor)
- 61-85: HIGH → REJECT
- 86-100: CRITICAL → REJECT + manual review

Consider these fraud signals: unusually high order frequency, very fast cart-to-order time, new address combined with high amount, order at unusual hours, multiple items with high unit price."""
