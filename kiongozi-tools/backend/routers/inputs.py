from fastapi import APIRouter, HTTPException
from schemas import YouthInputCreate, YouthInputResponse
from ai_service import process_youth_input
from database import supabase
from typing import List

router = APIRouter(tags=["Youth Inputs"])


@router.post("/inputs", response_model=YouthInputResponse, status_code=201)
async def create_input(payload: YouthInputCreate):
    try:
        ai_result = await process_youth_input(payload.raw_text, payload.language)
    except Exception:
        ai_result = {"categories": [], "sentiment": "neutral", "summary": None}

    data = {
        "raw_text": payload.raw_text,
        "location": payload.location,
        "language": payload.language,
        "ai_categories": ai_result.get("categories", []),
        "ai_sentiment": ai_result.get("sentiment"),
        "ai_summary": ai_result.get("summary"),
        "processed": True,
    }

    res = supabase.table("youth_inputs").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to save input")
    return res.data[0]


@router.get("/inputs", response_model=List[YouthInputResponse])
def list_inputs(limit: int = 100):
    res = supabase.table("youth_inputs").select("*").order("created_at", desc=True).limit(limit).execute()
    return res.data or []
