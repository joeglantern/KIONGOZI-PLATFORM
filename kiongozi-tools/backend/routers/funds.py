from fastapi import APIRouter, HTTPException
from schemas import WelfareFundResponse, FundAlertCreate, FundAlertResponse
from database import supabase
from typing import List

router = APIRouter(tags=["Welfare Funds"])


@router.get("/funds", response_model=List[WelfareFundResponse])
def list_funds():
    res = supabase.table("welfare_funds").select("*").order("created_at", desc=True).execute()
    return res.data or []


@router.post("/funds/report", response_model=FundAlertResponse, status_code=201)
def report_anomaly(payload: FundAlertCreate):
    fund = supabase.table("welfare_funds").select("id").eq("id", str(payload.fund_id)).execute()
    if not fund.data:
        raise HTTPException(status_code=404, detail="Fund not found")

    data = {
        "fund_id": str(payload.fund_id),
        "reporter_name": payload.reporter_name,
        "description": payload.description,
        "severity": payload.severity,
    }
    res = supabase.table("fund_alerts").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to save report")
    return res.data[0]
