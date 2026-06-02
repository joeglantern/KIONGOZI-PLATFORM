from sqlalchemy import Column, String, Text, Boolean, Numeric, Integer, DateTime, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base


class YouthInput(Base):
    __tablename__ = "youth_inputs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raw_text = Column(Text, nullable=False)
    location = Column(String(100), default="Nairobi")
    language = Column(String(10), default="en")
    ai_categories = Column(ARRAY(String), default=list)
    ai_sentiment = Column(String(50))
    ai_summary = Column(Text)
    processed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WelfareFund(Base):
    __tablename__ = "welfare_funds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fund_name = Column(String(255), nullable=False)
    total_allocated = Column(Numeric(15, 2), nullable=False)
    disbursed_amount = Column(Numeric(15, 2), default=0)
    beneficiary_ylo = Column(String(255))
    status = Column(String(20), default="Pending")
    accountability_score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    alerts = relationship("FundAlert", back_populates="fund", cascade="all, delete-orphan")


class FundAlert(Base):
    __tablename__ = "fund_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fund_id = Column(UUID(as_uuid=True), ForeignKey("welfare_funds.id", ondelete="CASCADE"), nullable=False)
    reporter_name = Column(String(255))
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="Medium")
    status = Column(String(20), default="Open")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    fund = relationship("WelfareFund", back_populates="alerts")
