from __future__ import annotations

import json
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas


OUT_DIR = Path("output/pdf")
VERSION = "v1"
PAGE_W, PAGE_H = A4
MARGIN = 42
NAVY = colors.HexColor("#122033")
INK = colors.HexColor("#17202A")
MUTED = colors.HexColor("#64748B")
CREAM = colors.HexColor("#FBF7EF")
PAPER = colors.white
BLUE = colors.HexColor("#3B82F6")
GREEN = colors.HexColor("#10B981")
PURPLE = colors.HexColor("#8B5CF6")
AMBER = colors.HexColor("#F59E0B")
CORAL = colors.HexColor("#F97364")


def clean(text: object) -> str:
    value = "" if text is None else str(text)
    for old, new in {
        ", ": "-",
        ", ": "-",
        "→": "->",
        "×": "x",
        "“": '"',
        "”": '"',
        "’": "'",
    }.items():
        value = value.replace(old, new)
    return value.encode("latin-1", "ignore").decode("latin-1")


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", clean(text).lower()).strip("-")[:72]


def color(value: str, fallback=BLUE):
    try:
        return colors.HexColor(value)
    except Exception:
        return fallback


def lighten(col, amount=0.82):
    return colors.Color(
        col.red + (1 - col.red) * amount,
        col.green + (1 - col.green) * amount,
        col.blue + (1 - col.blue) * amount,
    )


def wrap(text: str, width: float, font="Helvetica", size=10):
    lines = []
    for paragraph in clean(text).splitlines() or [""]:
        current = ""
        for word in paragraph.split():
            candidate = f"{current} {word}".strip()
            if pdfmetrics.stringWidth(candidate, font, size) <= width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def text(c, value, x, y, width, *, font="Helvetica", size=10, leading=13, fill=INK, max_lines=None):
    c.setFont(font, size)
    c.setFillColor(fill)
    lines = wrap(value, width, font, size)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1] + "..."
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def shell(c, course, title, page, accent):
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(PAPER)
    c.roundRect(24, 24, PAGE_W - 48, PAGE_H - 48, 16, fill=1, stroke=0)
    c.setFillColor(accent)
    c.rect(24, PAGE_H - 86, PAGE_W - 48, 5, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN, PAGE_H - 62, clean(course["category"]).upper())
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 62, f"{VERSION.upper()} QUICK REFERENCE")
    text(c, title, MARGIN, PAGE_H - 108, PAGE_W - 2 * MARGIN, font="Helvetica-Bold", size=16, leading=18, fill=NAVY, max_lines=2)
    c.setFont("Helvetica", 8)
    c.setFillColor(MUTED)
    c.drawRightString(PAGE_W - MARGIN, 34, f"{clean(course['title'])} / {page}")


def cover(c, course, accent):
    c.setFillColor(accent)
    c.rect(0, PAGE_H - 308, PAGE_W, 308, fill=1, stroke=0)
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H - 308, fill=1, stroke=0)
    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN, PAGE_H - 74, "KIONGOZI LMS / COURSE QUICK REFERENCE")
    y = PAGE_H - 135
    c.setFont("Helvetica-Bold", 34)
    for line in wrap(course["title"], PAGE_W - 2 * MARGIN - 120, "Helvetica-Bold", 34)[:3]:
        c.drawString(MARGIN, y, line)
        y -= 39
    c.setFillColor(NAVY)
    c.setFont("Helvetica", 14)
    c.drawString(MARGIN, PAGE_H - 342, "Visual companion for the learner journey")
    c.setFillColor(PAPER)
    c.circle(PAGE_W - 118, PAGE_H - 150, 60, fill=1, stroke=0)
    c.setFillColor(accent)
    c.circle(PAGE_W - 118, PAGE_H - 150, 42, fill=1, stroke=0)
    c.setStrokeColor(NAVY)
    c.setLineWidth(5)
    c.line(PAGE_W - 145, PAGE_H - 150, PAGE_W - 118, PAGE_H - 124)
    c.line(PAGE_W - 118, PAGE_H - 124, PAGE_W - 88, PAGE_H - 178)
    c.setFillColor(PAPER)
    c.roundRect(MARGIN, 108, PAGE_W - 2 * MARGIN, 136, 14, fill=1, stroke=0)
    text(c, course["description"], MARGIN + 20, 210, PAGE_W - 2 * MARGIN - 40, size=10.2, leading=14, fill=INK, max_lines=5)
    x = MARGIN + 20
    for label, fill in [(course["category"], lighten(accent, .7)), ("Quick reference", lighten(BLUE, .78)), (f"{len(course['modules'])} modules", lighten(AMBER, .74))]:
        c.setFillColor(fill)
        c.roundRect(x, 132, max(90, pdfmetrics.stringWidth(clean(label), "Helvetica-Bold", 8) + 18), 24, 9, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(x + max(90, pdfmetrics.stringWidth(clean(label), "Helvetica-Bold", 8) + 18) / 2, 140, clean(label))
        x += max(90, pdfmetrics.stringWidth(clean(label), "Helvetica-Bold", 8) + 18) + 8


def route(c, course, page, accent):
    shell(c, course, "Module Route", page, accent)
    y = PAGE_H - 148
    for idx, module in enumerate(course["modules"], start=1):
        c.setFillColor(lighten([accent, BLUE, GREEN, AMBER, CORAL][idx % 5], .82))
        c.roundRect(MARGIN, y - 58, PAGE_W - 2 * MARGIN, 48, 10, fill=1, stroke=0)
        c.setFillColor(accent)
        c.circle(MARGIN + 22, y - 34, 14, fill=1, stroke=0)
        c.setFillColor(PAPER)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(MARGIN + 22, y - 37, str(idx))
        text(c, module, MARGIN + 50, y - 25, PAGE_W - 2 * MARGIN - 68, font="Helvetica-Bold", size=10.5, leading=12, fill=NAVY, max_lines=2)
        y -= 66
    c.setFillColor(lighten(accent, .86))
    c.roundRect(MARGIN, 82, PAGE_W - 2 * MARGIN, 78, 12, fill=1, stroke=0)
    text(c, "Use this page as the learner's map. It replaces the confusing effect of unrelated sample videos with a clear visual route through the actual course.", MARGIN + 18, 128, PAGE_W - 2 * MARGIN - 36, size=9.5, leading=12, fill=NAVY, max_lines=4)


def concept(c, course, page, accent):
    shell(c, course, "Core Concept Map", page, accent)
    c.setFillColor(lighten(accent, .85))
    c.roundRect(MARGIN, PAGE_H - 215, PAGE_W - 2 * MARGIN, 90, 14, fill=1, stroke=0)
    text(c, course["concept"], MARGIN + 20, PAGE_H - 156, PAGE_W - 2 * MARGIN - 40, font="Helvetica-Bold", size=15, leading=19, fill=NAVY, max_lines=3)
    y = PAGE_H - 280
    card_w = (PAGE_W - 2 * MARGIN - 24) / 2
    for idx, item in enumerate(course["moves"], start=1):
        x = MARGIN + ((idx - 1) % 2) * (card_w + 24)
        if idx % 2 == 1 and idx > 1:
            y -= 102
        c.setFillColor(PAPER)
        c.setStrokeColor(lighten(accent, .42))
        c.roundRect(x, y - 78, card_w, 70, 10, fill=1, stroke=1)
        c.setFillColor(accent)
        c.roundRect(x + 12, y - 36, 28, 26, 8, fill=1, stroke=0)
        c.setFillColor(PAPER)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + 26, y - 29, str(idx))
        text(c, item, x + 52, y - 22, card_w - 64, size=9.2, leading=11, fill=NAVY, max_lines=4)


def action(c, course, page, accent):
    shell(c, course, "Action Checklist", page, accent)
    y = PAGE_H - 150
    for item in course["checklist"]:
        c.setFillColor(PAPER)
        c.setStrokeColor(lighten(accent, .5))
        c.roundRect(MARGIN, y - 54, PAGE_W - 2 * MARGIN, 46, 9, fill=1, stroke=1)
        c.setStrokeColor(accent)
        c.setLineWidth(2)
        c.roundRect(MARGIN + 16, y - 38, 18, 18, 5, fill=0, stroke=1)
        text(c, item, MARGIN + 48, y - 24, PAGE_W - 2 * MARGIN - 64, size=9.4, leading=11, fill=INK, max_lines=2)
        y -= 62
    c.setFillColor(NAVY)
    c.roundRect(MARGIN, 78, PAGE_W - 2 * MARGIN, 76, 12, fill=1, stroke=0)
    text(c, "Learner finish line: name one concept, one action, and one question to bring back to the platform discussion.", MARGIN + 18, 121, PAGE_W - 2 * MARGIN - 36, font="Helvetica-Bold", size=11, leading=14, fill=PAPER, max_lines=3)


COURSES = [
    {"id": "77920307-0e8d-4f34-8261-1b93489d2f2d", "title": "AI-Powered Civic Tech", "category": "Civic Participation", "color": "#3B82F6", "description": "A practical map for using AI in civic technology without losing accountability, inclusion, or public trust.", "modules": ["Introduction to Civic Tech", "Smart Cities and Infrastructure", "AI Chatbots in Public Services", "Algorithmic Bias in Government", "Participatory Budgeting Tech"], "concept": "Use AI to improve civic access, then audit it for fairness, transparency, and real public value.", "moves": ["Name the public problem before choosing the tool", "Map users who may be excluded by the system", "Test the AI output against human judgment", "Publish a feedback pathway for citizens"], "checklist": ["Define the civic service or participation gap", "Identify one risk of bias or exclusion", "Choose one low-stakes prototype to test", "Name the human accountable for the AI workflow", "Collect citizen feedback before scaling"]},
    {"id": "a851c191-6482-48d7-bbef-0c6f3662ac90", "title": "Climate Policy & International Law", "category": "Climate Advocacy", "color": "#10B981", "description": "A visual policy guide from global climate agreements to the national commitments that shape local action.", "modules": ["The Paris Agreement", "Carbon Pricing and Cap-and-Trade", "Nationally Determined Contributions", "Loss and Damage Funding", "The Role of the IPCC"], "concept": "Global climate policy becomes useful when learners can connect treaties, finance, evidence, and national commitments.", "moves": ["Separate agreement, target, finance, and evidence", "Connect NDC promises to local accountability", "Watch who pays and who benefits", "Use IPCC evidence without overwhelming people"], "checklist": ["Name the policy instrument in play", "Connect it to one Kenyan or county-level implication", "Identify who is accountable for delivery", "Translate one technical term into plain language", "Ask what evidence would prove movement"]},
    {"id": "962ceb66-af41-43a2-874f-d88814dea89c", "title": "Community Organizing 101", "category": "Civic Participation", "color": "#3B82F6", "description": "A route map for turning community frustration into relationships, power analysis, and disciplined action.", "modules": ["The Foundations of Organizing", "Building Coalitions", "Power Mapping", "One-on-One Relational Meetings", "Escalating Tactics"], "concept": "Organizing is relationship plus strategy: build trust, map power, then escalate with discipline.", "moves": ["Start with listening, not slogans", "Build a coalition around a specific ask", "Map who has power and who has influence", "Escalate only when the base is ready"], "checklist": ["Write the issue in one sentence", "Identify five people directly affected", "Map allies, blockers, and decision-makers", "Run two relational meetings this week", "Choose the next tactic and success signal"]},
    {"id": "b837a95a-3ddf-4b71-947b-d3cc6c6be070", "title": "Digital Government & Open Data", "category": "Civic Participation", "color": "#3B82F6", "description": "A visual guide to using public data, information requests, visualization, security, and civic hacking responsibly.", "modules": ["Understanding Open Data", "Freedom of Information Requests", "Data Visualization for Advocacy", "Digital Security for Activists", "Civic Hackathons"], "concept": "Open data only matters when people can request it, understand it, protect themselves, and use it for action.", "moves": ["Ask a public-interest question first", "Find or request the data", "Turn the data into a clear visual claim", "Protect people before publishing"], "checklist": ["Write the question your data should answer", "Identify the public body holding the data", "Choose one chart that makes the claim obvious", "Check privacy and safety risks", "Invite feedback from affected users"]},
    {"id": "f8dace8c-58b4-49f0-94eb-5d6863c1ce19", "title": "Funding & Pitching Masters", "category": "Digital Entrepreneurship", "color": "#8B5CF6", "description": "A founder-facing reference for funding choices, pitch clarity, investors, term sheets, and valuation discipline.", "modules": ["The Bootstrapping Phase", "The Perfect Pitch Deck", "Angel Investors vs. VCs", "Understanding Term Sheets", "Negotiating Valuation"], "concept": "Funding should match the venture's stage, evidence, ambition, and control needs.", "moves": ["Bootstrap until evidence improves the ask", "Pitch problem, proof, model, and traction", "Choose investor type by fit", "Read control terms before celebrating valuation"], "checklist": ["Name the milestone funding should unlock", "State the customer proof you already have", "Cut the pitch deck to the core story", "List the terms you need to understand", "Decide your walk-away point before negotiating"]},
    {"id": "1ae63390-1126-4a7f-82f2-8c4e19902c50", "title": "Grassroots Environmental Activism", "category": "Climate Advocacy", "color": "#10B981", "description": "A campaign companion for grassroots climate action, communication, divestment, just transition, and civil discipline.", "modules": ["Structuring a Campaign", "Fossil Fuel Divestment", "Climate Communication", "The Just Transition", "Non-Violent Civil Disobedience"], "concept": "Effective environmental activism combines evidence, moral clarity, coalition discipline, and safety.", "moves": ["Choose a concrete target", "Make the climate story local", "Protect workers in transition language", "Escalate non-violently with preparation"], "checklist": ["Write the campaign target and demand", "Name the affected community", "Prepare one local story and one evidence point", "Define the non-violent discipline rules", "Plan care, safety, and debrief after action"]},
    {"id": "7752b3c9-9ebf-404c-bdf3-b7b1eb466dfb", "title": "Introduction to Climate Science", "category": "Climate Advocacy", "color": "#10B981", "description": "A plain-language science guide from greenhouse gases to feedback loops and extreme weather attribution.", "modules": ["The Greenhouse Effect", "Anthropogenic CO2 Emissions", "Ocean Acidification", "Extreme Weather Attribution", "Feedback Loops"], "concept": "Climate science becomes usable when learners can connect cause, evidence, impact, and uncertainty clearly.", "moves": ["Explain the greenhouse effect simply", "Separate natural variation from human forcing", "Connect ocean chemistry to livelihoods", "Use attribution carefully, not casually"], "checklist": ["Explain one climate concept without jargon", "Name one local impact pathway", "Identify what evidence supports the claim", "Flag what is certain and uncertain", "Turn the science into one practical action"]},
    {"id": "70987bbe-a945-4b03-9034-9b2b78fcd7a7", "title": "Product Development Essentials", "category": "Business", "color": "#10B981", "description": "A three-module product guide for moving from problem definition to a minimum-viable loop and a disciplined launch.", "modules": ["Define the Problem - User-Centred From Day One", "Design the Minimum-Viable Loop", "Ship, Measure, Iterate - Without Losing Your Sanity"], "concept": "Great products are built by narrowing the problem, testing the smallest loop, then iterating from real user behavior.", "moves": ["Interview before designing", "Sketch the minimum useful loop", "Ship in 14 days if possible", "Measure behavior, not compliments"], "checklist": ["Write the user's painful moment", "Name the riskiest assumption", "Draw the smallest interaction loop", "Choose one success metric", "Schedule the first user review"]},
    {"id": "4f19ce95-5ff0-4910-8840-e61da52b214b", "title": "Renewable Energy Transition", "category": "Climate Advocacy", "color": "#10B981", "description": "A visual primer on solar, wind, storage, geothermal, hydro, and the smart grid choices behind energy transition.", "modules": ["Solar Photovoltaics", "Wind Energy Dynamics", "Battery Storage Solutions", "Geothermal and Hydroelectric Power", "The Smart Grid"], "concept": "Energy transition works when generation, storage, grid intelligence, and local economics move together.", "moves": ["Match resource to location", "Compare intermittency and storage needs", "Look at grid readiness", "Ask who pays, owns, and maintains"], "checklist": ["Name the energy source and use case", "Identify the storage or reliability challenge", "Map the grid or mini-grid dependency", "Estimate one local cost barrier", "Name one policy or financing lever"]},
    {"id": "4743dcf1-8dbf-4d8c-81a7-e7db38b64105", "title": "Sustainable Business Practices", "category": "Digital Entrepreneurship", "color": "#8B5CF6", "description": "A business sustainability reference for people, planet, profit, circularity, supply chains, carbon, and certification.", "modules": ["Triple Bottom Line", "Circular Economy Principles", "Ethical Supply Chains", "Carbon Footprint Accounting", "B-Corp Certification"], "concept": "A sustainable business makes responsibility operational: supply, waste, carbon, people, and proof all have owners.", "moves": ["Track people, planet, and profit together", "Design waste out of the model", "Audit suppliers before crises", "Measure carbon before claiming progress"], "checklist": ["Pick one sustainability metric to track", "Identify one waste loop to close", "Ask one supplier ethics question", "Estimate one carbon source", "Decide whether certification fits the stage"]},
    {"id": "437c9a22-658a-4fef-985d-da219513aec8", "title": "Venture Creation: From Idea to Launch", "category": "Digital Entrepreneurship", "color": "#8B5CF6", "description": "A launch companion for research, business model design, MVPs, go-to-market strategy, and financial metrics.", "modules": ["Ideation & Market Research", "Business Model Canvas", "Minimum Viable Product", "Go-To-Market Strategy", "Financial Modeling & Metrics"], "concept": "A venture gets stronger as assumptions become evidence across customer, model, product, market, and money.", "moves": ["Research before committing", "Map the business model clearly", "Build an MVP around the riskiest assumption", "Choose a narrow first market"], "checklist": ["Write the target customer", "Name the value proposition", "List the riskiest business assumption", "Choose a launch channel", "Track one revenue and one cost metric"]},
]


def build(course):
    accent = color(course["color"])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{slugify(course['title'])}-{VERSION}-quick-reference.pdf"
    path = OUT_DIR / filename
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle(clean(f"{course['title']} - Quick Reference"))
    c.setAuthor("Kiongozi LMS")
    cover(c, course, accent)
    c.showPage()
    route(c, course, 2, accent)
    c.showPage()
    concept(c, course, 3, accent)
    c.showPage()
    action(c, course, 4, accent)
    c.save()
    return {
        "course_id": course["id"],
        "title": course["title"],
        "file_type": "pdf",
        "purpose": "quick_reference",
        "version": VERSION,
        "local_path": str(path).replace("\\", "/"),
        "filename": filename,
        "storage_path": f"course-assets/{course['id']}/{VERSION}/{filename}",
        "page_count": 4,
    }


def main():
    manifest = [build(course) for course in COURSES]
    (OUT_DIR / "course-quick-references-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
