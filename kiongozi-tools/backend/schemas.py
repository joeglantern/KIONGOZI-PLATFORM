from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class YouthInputCreate(BaseModel):
    raw_text: str = Field(..., min_length=10, max_length=5000)
    location: str = Field(default="Nairobi")
    language: str = Field(default="en")


class YouthInputResponse(BaseModel):
    id: UUID
    raw_text: str
    location: str
    language: str
    ai_categories: List[str]
    ai_sentiment: Optional[str]
    ai_summary: Optional[str]
    processed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class WelfareFundResponse(BaseModel):
    id: UUID
    fund_name: str
    total_allocated: Decimal
    disbursed_amount: Decimal
    beneficiary_ylo: Optional[str]
    status: str
    accountability_score: int
    created_at: datetime

    model_config = {"from_attributes": True}


class FundAlertCreate(BaseModel):
    fund_id: UUID
    reporter_name: Optional[str] = None
    description: str = Field(..., min_length=10, max_length=1000)
    severity: str = Field(default="Medium")


class FundAlertResponse(BaseModel):
    id: UUID
    fund_id: UUID
    reporter_name: Optional[str]
    description: str
    severity: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PolicyBriefResponse(BaseModel):
    brief: str
    generated_at: str
