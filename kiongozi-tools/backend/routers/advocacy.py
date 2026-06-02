from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from schemas import PolicyBriefResponse
from ai_service import generate_policy_brief
from database import supabase
from datetime import datetime, timezone
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

router = APIRouter(tags=["Advocacy"])


@router.get("/advocacy/analytics")
def get_analytics():
    inputs = supabase.table("youth_inputs").select("ai_categories, ai_sentiment").eq("processed", True).execute()
    funds = supabase.table("welfare_funds").select("*").execute()

    sector_counts: dict = {}
    sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0, "mixed": 0}

    for inp in (inputs.data or []):
        for cat in (inp.get("ai_categories") or []):
            sector_counts[cat] = sector_counts.get(cat, 0) + 1
        s = inp.get("ai_sentiment")
        if s in sentiment_counts:
            sentiment_counts[s] += 1

    fund_list = funds.data or []
    total_allocated = sum(float(f["total_allocated"]) for f in fund_list)
    total_disbursed = sum(float(f["disbursed_amount"]) for f in fund_list)

    return {
        "total_inputs": len(inputs.data or []),
        "sector_distribution": [{"sector": k, "count": v} for k, v in sorted(sector_counts.items(), key=lambda x: -x[1])],
        "sentiment_distribution": [{"sentiment": k, "count": v} for k, v in sentiment_counts.items() if v > 0],
        "total_funds": len(fund_list),
        "total_allocated_kes": total_allocated,
        "total_disbursed_kes": total_disbursed,
        "disbursement_rate": round((total_disbursed / total_allocated * 100), 1) if total_allocated > 0 else 0,
        "fund_distribution": [
            {"name": f["fund_name"], "allocated": float(f["total_allocated"]), "disbursed": float(f["disbursed_amount"]), "status": f["status"]}
            for f in fund_list
        ],
    }


@router.post("/advocacy/generate-brief", response_model=PolicyBriefResponse)
async def generate_brief():
    inputs = supabase.table("youth_inputs").select("ai_categories, ai_summary, ai_sentiment, raw_text").eq("processed", True).order("created_at", desc=True).limit(20).execute()
    funds = supabase.table("welfare_funds").select("*").execute()

    inputs_summary = "\n".join([
        f"- [{', '.join(i.get('ai_categories') or ['Uncategorized'])}] {i.get('ai_summary') or i.get('raw_text', '')[:120]} (Sentiment: {i.get('ai_sentiment') or 'N/A'})"
        for i in (inputs.data or [])
    ]) or "No inputs recorded yet."

    funds_summary = "\n".join([
        f"- {f['fund_name']}: KES {float(f['total_allocated']):,.0f} allocated, KES {float(f['disbursed_amount']):,.0f} disbursed — {f['status']} (Score: {f['accountability_score']}/100)"
        for f in (funds.data or [])
    ]) or "No fund data available."

    brief = await generate_policy_brief(inputs_summary, funds_summary)
    return PolicyBriefResponse(brief=brief, generated_at=datetime.now(timezone.utc).isoformat())


@router.post("/advocacy/generate-brief/pdf")
async def generate_brief_pdf():
    inputs = supabase.table("youth_inputs").select("ai_categories, ai_summary, ai_sentiment, raw_text").eq("processed", True).order("created_at", desc=True).limit(20).execute()
    funds = supabase.table("welfare_funds").select("*").execute()

    inputs_summary = "\n".join([
        f"- [{', '.join(i.get('ai_categories') or ['Uncategorized'])}] {i.get('ai_summary') or i.get('raw_text', '')[:120]}"
        for i in (inputs.data or [])
    ]) or "No inputs recorded yet."

    funds_summary = "\n".join([
        f"- {f['fund_name']}: KES {float(f['total_allocated']):,.0f} allocated — {f['status']}"
        for f in (funds.data or [])
    ]) or "No fund data available."

    brief = await generate_policy_brief(inputs_summary, funds_summary)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Heading1"], fontSize=16, spaceAfter=12)
    body_style = ParagraphStyle("body", parent=styles["Normal"], fontSize=11, leading=16, spaceAfter=8)

    story = [
        Paragraph("KIONGOZI YOUTH PLATFORM", title_style),
        Paragraph("Policy Recommendation Memo", styles["Heading2"]),
        Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", styles["Normal"]),
        Spacer(1, 0.5*cm),
    ]
    for line in brief.split("\n"):
        if line.strip():
            story.append(Paragraph(line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), body_style))

    doc.build(story)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
                             headers={"Content-Disposition": "attachment; filename=kiongozi-policy-brief.pdf"})
