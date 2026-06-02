from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import YouthInput
from schemas import YouthInputCreate, YouthInputResponse
from ai_service import process_youth_input
from typing import List

router = APIRouter(tags=["Youth Inputs"])


@router.post("/inputs", response_model=YouthInputResponse, status_code=201)
async def create_input(payload: YouthInputCreate, db: Session = Depends(get_db)):
    try:
        ai_result = await process_youth_input(payload.raw_text, payload.language)
    except Exception:
        ai_result = {"categories": [], "sentiment": "neutral", "summary": None}

    record = YouthInput(
        raw_text=payload.raw_text,
        location=payload.location,
        language=payload.language,
        ai_categories=ai_result.get("categories", []),
        ai_sentiment=ai_result.get("sentiment"),
        ai_summary=ai_result.get("summary"),
        processed=True,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/inputs", response_model=List[YouthInputResponse])
def list_inputs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(YouthInput).order_by(YouthInput.created_at.desc()).offset(skip).limit(limit).all()
