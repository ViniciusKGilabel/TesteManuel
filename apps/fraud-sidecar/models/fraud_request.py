from pydantic import BaseModel, Field
from typing import List


class OrderItem(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)


class FraudRequest(BaseModel):
    order_id: str
    user_id: str
    amount: float = Field(ge=0)
    currency: str = "BRL"
    items: List[OrderItem]
    user_account_age_days: int = Field(default=0, ge=0)
    orders_last_24h: int = Field(default=0, ge=0)
    orders_last_hour: int = Field(default=0, ge=0)
    cart_to_order_seconds: int = Field(default=0, ge=0)
    is_new_address: bool = Field(default=False)
    order_time_utc: str = Field(default="")
