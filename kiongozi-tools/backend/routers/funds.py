from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import WelfareFund, FundAlert
from schemas import WelfareFundResponse, FundAlertCreate, FundAlertResponse
from typing import List

router = APIRouter(tags=["Welfare Funds"])


@router.get("/funds", response_model=List[WelfareFundResponse])
def list_funds(db: Session = Depends(get_db)):
    return db.query(WelfareFund).order_by(WelfareFund.created_at.desc()).all()


@router.post("/funds/report", response_model=FundAlertResponse, status_code=201)
def report_anomaly(payload: FundAlertCreate, db: Session = Depends(get_db)):
    fund = db.query(WelfareFund).filter(WelfareFund.id == payload.fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    alert = FundAlert(**payload.model_dump())
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert
