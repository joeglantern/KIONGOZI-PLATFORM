from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas


OUT_DIR = Path("output/pdf")
VERSION = "v2"
PAGE_W, PAGE_H = A4
MARGIN = 42

NAVY = colors.HexColor("#122033")
INK = colors.HexColor("#17202A")
MUTED = colors.HexColor("#607080")
CREAM = colors.HexColor("#FBF7EF")
PAPER = colors.HexColor("#FFFFFF")
SOFT = colors.HexColor("#F1F5F9")
GREEN = colors.HexColor("#10B981")
PURPLE = colors.HexColor("#8B5CF6")
BLUE = colors.HexColor("#3B82F6")
AMBER = colors.HexColor("#F59E0B")
CORAL = colors.HexColor("#F97364")
CYAN = colors.HexColor("#06B6D4")


def clean(text: object) -> str:
    if text is None:
        return ""
    value = str(text)
    replacements = {
        ", ": "-",
        ", ": "-",
        "→": "->",
        "×": "x",
        "≥": ">=",
        "≤": "<=",
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
        "…": "...",
    }
    for old, new in replacements.items():
        value = value.replace(old, new)
    value = unicodedata.normalize("NFKD", value)
    return value.encode("latin-1", "ignore").decode("latin-1")


def slugify(text: str) -> str:
    value = clean(text).lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:72]


def hex_color(value: str | None, fallback=GREEN):
    if not value:
        return fallback
    try:
        return colors.HexColor(value)
    except Exception:
        return fallback


def lighten(color, amount=0.82):
    return colors.Color(
        color.red + (1 - color.red) * amount,
        color.green + (1 - color.green) * amount,
        color.blue + (1 - color.blue) * amount,
    )


def wrap_lines(text: str, max_width: float, font="Helvetica", size=10) -> list[str]:
    text = clean(text).strip()
    if not text:
        return []
    lines: list[str] = []
    for paragraph in re.split(r"\n+", text):
        words = paragraph.split()
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip()
            if pdfmetrics.stringWidth(candidate, font, size) <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def draw_text(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    *,
    font="Helvetica",
    size=10,
    leading=13,
    color=INK,
    max_lines: int | None = None,
) -> float:
    c.setFillColor(color)
    c.setFont(font, size)
    lines = wrap_lines(text, width, font, size)
    if max_lines is not None and len(lines) > max_lines:
        lines = lines[:max_lines]
        if lines:
            lines[-1] = lines[-1].rstrip(".") + "..."
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_heading(c, text, x, y, width, *, size=22, color=NAVY):
    return draw_text(c, text, x, y, width, font="Helvetica-Bold", size=size, leading=size + 5, color=color)


def draw_page_shell(c, course, page_title: str, page_no: int, accent):
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(PAPER)
    c.roundRect(22, 22, PAGE_W - 44, PAGE_H - 44, 16, fill=1, stroke=0)
    c.setFillColor(accent)
    c.rect(22, PAGE_H - 82, PAGE_W - 44, 4, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(MUTED)
    c.drawString(MARGIN, PAGE_H - 62, clean(course["category_name"]).upper())
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 62, f"{VERSION.upper()} VISUAL LEARNER GUIDE")
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(NAVY)
    c.drawString(MARGIN, PAGE_H - 96, clean(page_title))
    c.setFont("Helvetica", 8)
    c.setFillColor(MUTED)
    c.drawRightString(PAGE_W - MARGIN, 32, f"{clean(course['title'])}  /  {page_no}")


def draw_badge(c, x, y, text, fill, width=None):
    text = clean(text)
    c.setFont("Helvetica-Bold", 8.5)
    w = width or max(62, pdfmetrics.stringWidth(text, "Helvetica-Bold", 8.5) + 18)
    c.setFillColor(fill)
    c.roundRect(x, y - 18, w, 24, 9, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.drawCentredString(x + w / 2, y - 10, text)
    return x + w + 7


def draw_icon_badge(c, x, y, label, accent, index):
    c.setFillColor(lighten(accent, 0.78))
    c.circle(x + 18, y - 18, 18, fill=1, stroke=0)
    c.setStrokeColor(accent)
    c.setLineWidth(2)
    c.circle(x + 18, y - 18, 18, fill=0, stroke=1)
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(NAVY)
    c.drawCentredString(x + 18, y - 22, str(index))
    return draw_text(c, label, x + 46, y - 8, 160, font="Helvetica-Bold", size=10, leading=12, color=NAVY, max_lines=2)


def draw_cover(c, course, accent):
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(accent)
    c.roundRect(-80, PAGE_H - 230, PAGE_W + 160, 280, 60, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.circle(PAGE_W - 122, PAGE_H - 118, 64, fill=1, stroke=0)
    c.setStrokeColor(PAPER)
    c.setLineWidth(6)
    for i, radius in enumerate([21, 36, 51]):
        c.circle(PAGE_W - 122, PAGE_H - 118, radius, fill=0, stroke=1)
        if i == 1:
            c.line(PAGE_W - 122, PAGE_H - 118, PAGE_W - 83, PAGE_H - 88)

    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN, PAGE_H - 78, f"KIONGOZI LMS  /  {VERSION.upper()} COURSE MEDIA UPGRADE")
    c.setFont("Helvetica-Bold", 36)
    title_y = PAGE_H - 145
    for line in wrap_lines(course["title"], PAGE_W - 210, "Helvetica-Bold", 36)[:3]:
        c.drawString(MARGIN, title_y, line)
        title_y -= 42
    c.setFont("Helvetica", 14)
    c.setFillColor(NAVY)
    c.drawString(MARGIN, title_y - 8, "Visual learner guide")

    c.setFillColor(PAPER)
    c.roundRect(MARGIN, 110, PAGE_W - 2 * MARGIN, 155, 16, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(MARGIN + 22, 232, "What this guide helps you do")
    y = 207
    for line in wrap_lines(course.get("description") or course.get("overview") or "", PAGE_W - 140, "Helvetica", 10.5)[:5]:
        c.setFont("Helvetica", 10.5)
        c.drawString(MARGIN + 22, y, line)
        y -= 14

    x = MARGIN + 22
    x = draw_badge(c, x, 147, clean(course["difficulty_level"]).title(), lighten(accent, 0.65))
    x = draw_badge(c, x, 147, f"{course['estimated_duration_hours']} hours", lighten(BLUE, 0.78))
    draw_badge(c, x, 147, clean(course["category_name"]), lighten(AMBER, 0.72))

    c.setFillColor(lighten(accent, 0.76))
    for x0, y0, w, h in [(376, 286, 54, 112), (441, 316, 42, 82), (492, 248, 36, 150)]:
        c.roundRect(x0, y0, w, h, 12, fill=1, stroke=0)
    c.setStrokeColor(NAVY)
    c.setLineWidth(2)
    c.line(360, 248, 536, 248)
    c.line(376, 286, 528, 398)
    c.line(376, 286, 441, 316)
    c.line(441, 316, 492, 248)


def draw_application_strip(c, title: str, items: list[str], accent, y=246):
    c.setFillColor(lighten(accent, 0.86))
    c.roundRect(MARGIN, y - 136, PAGE_W - 2 * MARGIN, 118, 14, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(MARGIN + 18, y - 44, clean(title))
    card_w = (PAGE_W - 2 * MARGIN - 54) / 3
    for idx, item in enumerate(items[:3], start=1):
        x = MARGIN + 18 + (idx - 1) * (card_w + 18)
        c.setFillColor(PAPER)
        c.roundRect(x, y - 118, card_w, 58, 10, fill=1, stroke=0)
        c.setFillColor(accent)
        c.circle(x + 17, y - 82, 10, fill=1, stroke=0)
        c.setFillColor(PAPER)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(x + 17, y - 85, str(idx))
        draw_text(c, item, x + 34, y - 74, card_w - 44, size=8.4, leading=10, color=NAVY, max_lines=3)


def draw_journey(c, course, page_no, accent):
    draw_page_shell(c, course, "Course Journey", page_no, accent)
    x0, y0 = MARGIN, PAGE_H - 135
    draw_text(c, course.get("overview") or course.get("description") or "", x0, y0, PAGE_W - 2 * MARGIN, size=10.5, leading=14, color=INK, max_lines=5)

    c.setFillColor(lighten(accent, 0.86))
    c.roundRect(MARGIN, PAGE_H - 265, PAGE_W - 2 * MARGIN, 86, 14, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(MARGIN + 18, PAGE_H - 205, "Learner outcomes")
    outcome_y = PAGE_H - 226
    outcomes = course.get("learning_outcomes") or course.get("derived_outcomes") or []
    for idx, item in enumerate(outcomes[:4], start=1):
        c.setFillColor(accent)
        c.circle(MARGIN + 22, outcome_y + 3, 5, fill=1, stroke=0)
        outcome_y = draw_text(c, f"{idx}. {item}", MARGIN + 36, outcome_y + 7, PAGE_W - 126, size=9.4, leading=12, color=NAVY, max_lines=2)
        outcome_y -= 1

    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(MARGIN, PAGE_H - 303, "Module route")
    modules = course["modules"]
    start_x = MARGIN
    start_y = PAGE_H - 340
    card_w = (PAGE_W - 2 * MARGIN - 18) / 2
    card_h = 66
    for i, module in enumerate(modules[:6]):
        col = i % 2
        row = i // 2
        x = start_x + col * (card_w + 18)
        y = start_y - row * (card_h + 16)
        c.setFillColor(PAPER)
        c.setStrokeColor(lighten(accent, 0.45))
        c.setLineWidth(1)
        c.roundRect(x, y - card_h, card_w, card_h, 10, fill=1, stroke=1)
        c.setFillColor(accent)
        c.circle(x + 22, y - 24, 15, fill=1, stroke=0)
        c.setFillColor(PAPER)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + 22, y - 28, str(i + 1))
        draw_text(c, module["title"], x + 46, y - 16, card_w - 58, font="Helvetica-Bold", size=9.6, leading=11, color=NAVY, max_lines=2)
        draw_text(c, module.get("description", ""), x + 46, y - 40, card_w - 58, size=8.2, leading=9.8, color=MUTED, max_lines=2)

    c.setFillColor(lighten(AMBER, 0.78))
    c.roundRect(MARGIN, 86, PAGE_W - 2 * MARGIN, 66, 12, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 18, 126, "How to use it")
    draw_text(c, "Skim the route before you start, then return to the worksheets after each module. Treat this guide as a working notebook, not a textbook.", MARGIN + 18, 109, PAGE_W - 120, size=9.5, leading=12, color=NAVY, max_lines=3)


def draw_core_model(c, course, guide, page_no, accent):
    draw_page_shell(c, course, guide["model_title"], page_no, accent)
    draw_text(c, guide["model_intro"], MARGIN, PAGE_H - 133, PAGE_W - 2 * MARGIN, size=10.2, leading=14, color=INK, max_lines=4)
    steps = guide["model_steps"]
    top = PAGE_H - 210
    if guide.get("model_style") == "matrix":
        left = MARGIN + 25
        size = 188
        c.setFillColor(SOFT)
        c.roundRect(left, top - size, size, size, 14, fill=1, stroke=0)
        c.setStrokeColor(NAVY)
        c.setLineWidth(2)
        c.line(left + size / 2, top - size, left + size / 2, top)
        c.line(left, top - size / 2, left + size, top - size / 2)
        labels = steps[:4]
        positions = [
            (left + 14, top - 35),
            (left + size / 2 + 14, top - 35),
            (left + 14, top - size / 2 - 35),
            (left + size / 2 + 14, top - size / 2 - 35),
        ]
        for pos, label in zip(positions, labels):
            draw_text(c, label, pos[0], pos[1], size / 2 - 25, font="Helvetica-Bold", size=10.5, leading=13, color=NAVY, max_lines=3)
        c.setFillColor(accent)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(left + size / 2, top + 17, guide.get("axis_x", "Clarity ->"))
        c.saveState()
        c.translate(left - 18, top - size / 2)
        c.rotate(90)
        c.drawCentredString(0, 0, guide.get("axis_y", "Empathy ->"))
        c.restoreState()
        draw_text(c, guide["model_takeaway"], left + size + 42, top - 14, PAGE_W - left - size - 82, size=12, leading=17, color=NAVY)
        draw_application_strip(c, "Use this model in one real conversation", guide["toolkit_items"], accent, y=296)
    elif guide.get("model_style") == "iceberg":
        cx = PAGE_W / 2
        c.setFillColor(lighten(CYAN, 0.68))
        c.rect(MARGIN, top - 28, PAGE_W - 2 * MARGIN, 18, fill=1, stroke=0)
        c.setFillColor(lighten(accent, 0.72))
        points = [(cx - 40, top + 84), (cx - 190, top - 230), (cx + 190, top - 230)]
        c.setStrokeColor(accent)
        c.setLineWidth(2)
        c.setFillColor(lighten(accent, 0.82))
        c.line(*points[0], *points[1])
        c.line(*points[0], *points[2])
        c.line(*points[1], *points[2])
        y = top + 46
        for idx, label in enumerate(steps[:5], start=1):
            draw_icon_badge(c, MARGIN + 45, y, label, accent if idx % 2 else BLUE, idx)
            y -= 62
        draw_text(c, guide["model_takeaway"], PAGE_W - 250, top - 20, 194, size=11.5, leading=16, color=NAVY)
        draw_application_strip(c, "Convert evidence into a decision", guide["toolkit_items"], accent, y=216)
    else:
        x = MARGIN + 14
        y = top
        gap = 18
        box_w = (PAGE_W - 2 * MARGIN - gap * 2) / 3
        for idx, label in enumerate(steps):
            col = idx % 3
            row = idx // 3
            bx = x + col * (box_w + gap)
            by = y - row * 118
            c.setFillColor(lighten([accent, BLUE, AMBER, CORAL, GREEN, PURPLE][idx % 6], 0.78))
            c.roundRect(bx, by - 88, box_w, 88, 14, fill=1, stroke=0)
            c.setFillColor(NAVY)
            c.setFont("Helvetica-Bold", 18)
            c.drawString(bx + 15, by - 28, f"{idx + 1:02d}")
            draw_text(c, label, bx + 15, by - 44, box_w - 30, font="Helvetica-Bold", size=10.5, leading=13, color=NAVY, max_lines=3)
            if col < 2 and idx < len(steps) - 1:
                c.setStrokeColor(NAVY)
                c.setLineWidth(1.4)
                c.line(bx + box_w + 4, by - 43, bx + box_w + gap - 4, by - 43)
                c.line(bx + box_w + gap - 10, by - 49, bx + box_w + gap - 4, by - 43)
                c.line(bx + box_w + gap - 10, by - 37, bx + box_w + gap - 4, by - 43)
        c.setFillColor(PAPER)
        c.roundRect(MARGIN, 86, PAGE_W - 2 * MARGIN, 76, 12, fill=1, stroke=0)
        c.setStrokeColor(lighten(accent, 0.45))
        c.roundRect(MARGIN, 86, PAGE_W - 2 * MARGIN, 76, 12, fill=0, stroke=1)
        c.setFillColor(accent)
        c.circle(MARGIN + 24, 123, 12, fill=1, stroke=0)
        draw_text(c, guide["model_takeaway"], MARGIN + 48, 135, PAGE_W - 2 * MARGIN - 70, size=10.2, leading=13, color=NAVY, max_lines=4)


def draw_module_deep_dive(c, course, page_no, accent):
    draw_page_shell(c, course, "Module Companion Cards", page_no, accent)
    modules = course["modules"]
    y = PAGE_H - 128
    for idx, module in enumerate(modules):
        if y < 170:
            c.showPage()
            page_no += 1
            draw_page_shell(c, course, "Module Companion Cards", page_no, accent)
            y = PAGE_H - 128
        c.setFillColor(PAPER)
        c.setStrokeColor(lighten(accent, 0.55))
        c.roundRect(MARGIN, y - 92, PAGE_W - 2 * MARGIN, 84, 12, fill=1, stroke=1)
        c.setFillColor(accent)
        c.roundRect(MARGIN, y - 92, 52, 84, 12, fill=1, stroke=0)
        c.setFillColor(PAPER)
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(MARGIN + 26, y - 43, str(idx + 1))
        draw_text(c, module["title"], MARGIN + 68, y - 24, PAGE_W - 2 * MARGIN - 86, font="Helvetica-Bold", size=11.5, leading=14, color=NAVY, max_lines=2)
        draw_text(c, module.get("description") or "", MARGIN + 68, y - 51, PAGE_W - 2 * MARGIN - 86, size=8.8, leading=11, color=MUTED, max_lines=2)
        objective = (module.get("objectives") or ["Leave with one clear action from this module"])[0]
        draw_text(c, f"Try this: {objective}", MARGIN + 68, y - 75, PAGE_W - 2 * MARGIN - 86, size=8.7, leading=10, color=INK, max_lines=2)
        y -= 104
    return page_no


def draw_toolkit(c, course, guide, page_no, accent):
    draw_page_shell(c, course, "Practice Toolkit", page_no, accent)
    c.setFillColor(lighten(accent, 0.83))
    c.roundRect(MARGIN, PAGE_H - 245, PAGE_W - 2 * MARGIN, 120, 14, fill=1, stroke=0)
    draw_heading(c, guide["toolkit_title"], MARGIN + 20, PAGE_H - 155, PAGE_W - 2 * MARGIN - 40, size=17)
    draw_text(c, guide["toolkit_intro"], MARGIN + 20, PAGE_H - 184, PAGE_W - 2 * MARGIN - 40, size=10, leading=13, color=NAVY, max_lines=4)

    left = MARGIN
    y = PAGE_H - 294
    for idx, item in enumerate(guide["toolkit_items"][:6], start=1):
        c.setFillColor(PAPER)
        c.setStrokeColor(lighten(accent, 0.42))
        c.roundRect(left, y - 54, PAGE_W - 2 * MARGIN, 48, 10, fill=1, stroke=1)
        c.setFillColor(accent)
        c.roundRect(left + 12, y - 39, 28, 26, 8, fill=1, stroke=0)
        c.setFillColor(PAPER)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(left + 26, y - 31, str(idx))
        draw_text(c, item, left + 52, y - 20, PAGE_W - 2 * MARGIN - 68, font="Helvetica-Bold", size=10, leading=12, color=NAVY, max_lines=2)
        y -= 62

    c.setFillColor(lighten(BLUE, 0.84))
    c.roundRect(MARGIN, 72, PAGE_W - 2 * MARGIN, 64, 12, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 18, 111, "Learner promise")
    draw_text(c, guide["promise"], MARGIN + 18, 94, PAGE_W - 2 * MARGIN - 36, size=9.3, leading=12, color=NAVY, max_lines=3)


def draw_worksheet(c, course, guide, page_no, accent):
    draw_page_shell(c, course, "30-Day Action Sheet", page_no, accent)
    draw_text(c, guide["worksheet_intro"], MARGIN, PAGE_H - 130, PAGE_W - 2 * MARGIN, size=10.5, leading=14, color=INK, max_lines=4)
    y = PAGE_H - 190
    for idx, prompt in enumerate(guide["worksheet_prompts"], start=1):
        c.setFillColor(PAPER)
        c.setStrokeColor(lighten(accent, 0.38))
        c.roundRect(MARGIN, y - 78, PAGE_W - 2 * MARGIN, 66, 10, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(MARGIN + 16, y - 30, f"{idx}. {clean(prompt)}")
        c.setStrokeColor(colors.HexColor("#CBD5E1"))
        for line_y in [y - 48, y - 63]:
            c.line(MARGIN + 16, line_y, PAGE_W - MARGIN - 16, line_y)
        y -= 86
    c.setFillColor(accent)
    c.roundRect(MARGIN, 76, PAGE_W - 2 * MARGIN, 72, 16, fill=1, stroke=0)
    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(MARGIN + 20, 118, "Finish line")
    draw_text(c, guide["finish_line"], MARGIN + 20, 99, PAGE_W - 2 * MARGIN - 40, size=9.8, leading=12, color=PAPER, max_lines=3)


COURSES = [
    {
        "course_id": "fbc457f4-0802-419d-9664-385d059ff066",
        "title": "Business Advocacy Strategy in Practice",
        "description": "For the founder who wants their venture to shape policy, not just survive it.",
        "overview": "Three focused modules for founders who want to shape the rules while still protecting operational capacity.",
        "difficulty_level": "intermediate",
        "estimated_duration_hours": 7,
        "category_name": "Business",
        "category_color": "#10B981",
        "slides_url": "https://jdncfyagppohtksogzkx.supabase.co/storage/v1/object/public/courses/course-slides/fbc457f4-0802-419d-9664-385d059ff066/1779432908914-q9cad4uh4nl.pdf",
        "learning_outcomes": [
            "Distinguish business advocacy from civic advocacy",
            "Build a coalition that protects business interests without compromising the venture",
            "Design advocacy moves that double as marketing for the venture",
            "Sustain advocacy work over multi-year horizons without burning operational capacity",
        ],
        "modules": [
            {"title": "Why a Business Should Advocate - and Where to Draw the Line", "description": "Smart founders shape policy without becoming politicians.", "objectives": ["Articulate the business case for advocacy"]},
            {"title": "Coalitions That Move, Advocacy That Markets", "description": "Build alliances that add force without bureaucracy.", "objectives": ["Choose the right coalition structure for your campaign"]},
            {"title": "Sustaining the Effort - Multi-Year Advocacy Without Operational Burnout", "description": "Design a cadence that survives year two.", "objectives": ["Build a sustainable cadence for multi-year advocacy"]},
        ],
    },
    {
        "course_id": "78c3575a-0d5c-4da5-98f8-e345f4b06239",
        "title": "Diagnosing Impact - Proving the Cure",
        "description": "Evidence-based project design that turns messy field realities into defensible data.",
        "overview": "A visual M&E pathway for youth changemakers: Iceberg, 5 Whys, Fishbone, Results Chain, KPIs, and feedback loops.",
        "difficulty_level": "advanced",
        "estimated_duration_hours": 15,
        "category_name": "Climate Advocacy",
        "category_color": "#10B981",
        "slides_url": None,
        "learning_outcomes": [
            "Use the Iceberg of Visibility to distinguish events from underlying structures",
            "Run a 5 Whys descent to find the Core Intervention Point",
            "Sort failure vectors using the Fishbone diagram",
            "Build a Results Chain from Inputs to Impact",
        ],
        "modules": [
            {"title": "The Iceberg of Visibility", "description": "Most of what shapes outcomes lives below the waterline.", "objectives": ["Sort observed phenomena into Events, Patterns, and Structures"]},
            {"title": "The 5 Whys Descent - Finding the Core Intervention Point", "description": "A disciplined root-cause descent.", "objectives": ["Run a disciplined 5 Whys descent"]},
            {"title": "Fishbone Categorization - Sorting Failure Vectors", "description": "Sort parallel causes with the Ishikawa diagram.", "objectives": ["Apply the Fishbone diagram to complex failure"]},
            {"title": "The Results Chain - Inputs to Impact", "description": "The spine of any serious M&E framework.", "objectives": ["Build a Results Chain for an intervention"]},
            {"title": "KPI Selection + The Feedback Loop", "description": "Pick the 3-5 metrics that matter.", "objectives": ["Select signal-over-noise KPIs"]},
        ],
    },
    {
        "course_id": "0f5c4001-5830-439f-8133-cfa4cf2870ce",
        "title": "Entrepreneurship Education Training (EET)",
        "description": "A practical entrepreneurship course from ideation to marketing, money, bookkeeping, and compliance.",
        "overview": "A beginner-friendly business-builder guide that turns long lesson notes into a visual founder operating path.",
        "difficulty_level": "beginner",
        "estimated_duration_hours": 35,
        "category_name": "Digital Entrepreneurship",
        "category_color": "#8B5CF6",
        "slides_url": None,
        "derived_outcomes": [
            "Turn a business idea into a clearer product and plan",
            "Understand money, budgets, records, and debt decisions",
            "Build a marketing path using Product, Price, Place, and Promotion",
            "Recognize the compliance steps that keep a business sustainable",
        ],
        "modules": [
            {"title": "Introduction to Entrepreneurship", "description": "Key terms, qualities, and the entrepreneurial mindset.", "objectives": ["Recognize entrepreneurial potential"]},
            {"title": "Business Ideation and Product Development", "description": "Product innovation, process innovation, and eco-design.", "objectives": ["Develop and test a business idea"]},
            {"title": "Development of a Business Plan", "description": "Executive summary, marketing plan, and financial plan.", "objectives": ["Create a practical business plan"]},
            {"title": "Financial Literacy", "description": "Personal funds, business finances, budgets, and debt.", "objectives": ["Separate personal and business money"]},
            {"title": "Understanding Marketing", "description": "Product, Price, Distribution, Promotion, and digital marketing.", "objectives": ["Build a simple marketing plan"]},
            {"title": "Business Accounting and Bookkeeping", "description": "Transactions, records, and reports.", "objectives": ["Keep basic business records"]},
            {"title": "Business Compliance", "description": "Policy, legal compliance, and sustainable processes.", "objectives": ["Map compliance requirements"]},
        ],
    },
    {
        "course_id": "f27d6801-58b8-48a2-a40f-f69b898d7625",
        "title": "Sheria ya Vijana - Entrepreneurship Edition",
        "description": "The legal scaffolding every youth founder should know: Article 55, AGPO, Youth Enterprise Fund, and county licensing.",
        "overview": "Practical legal literacy for youth-led ventures in Kenya, written as a working guide rather than a law textbook.",
        "difficulty_level": "intermediate",
        "estimated_duration_hours": 6,
        "category_name": "Digital Entrepreneurship",
        "category_color": "#8B5CF6",
        "slides_url": "https://jdncfyagppohtksogzkx.supabase.co/storage/v1/object/public/courses/course-slides/f27d6801-58b8-48a2-a40f-f69b898d7625/1779955043439-h3w9lzgbn3l.pdf",
        "learning_outcomes": [
            "Cite the constitutional provisions that protect youth entrepreneurship",
            "Navigate AGPO 30% public procurement reservations",
            "Access the Youth Enterprise Development Fund pathway",
            "Identify and challenge county trade licensing chokepoints",
        ],
        "modules": [
            {"title": "The Constitutional Floor - Article 55 and What It Means in Practice", "description": "Use the constitutional baseline in funding and advocacy conversations.", "objectives": ["Quote Article 55 and explain its practical force"]},
            {"title": "AGPO 30% - Public Procurement's Best-Kept Secret", "description": "Understand eligibility, registration, and public opportunities.", "objectives": ["Explain the AGPO reservation mechanism"]},
            {"title": "Youth Enterprise Fund + County Trade Licensing", "description": "Dedicated financing plus the licensing layer where friction often lives.", "objectives": ["Map your county licensing pathway"]},
        ],
    },
    {
        "course_id": "4900fb28-5c1c-46ff-8ef6-a3b8ad11bfba",
        "title": "The Advocacy Impact Engine",
        "description": "A master framework that bridges business innovation with systemic policy influence.",
        "overview": "Four phases for serious advocacy: diagnose hidden policy failure, build the human engine, map stakeholders, and execute through a pipeline.",
        "difficulty_level": "advanced",
        "estimated_duration_hours": 16,
        "category_name": "Civic Participation",
        "category_color": "#3B82F6",
        "slides_url": None,
        "learning_outcomes": [
            "Map a market symptom to its underground policy failure",
            "Build an internal human engine using the EET operational matrix",
            "Move Kapanga stakeholders, not just principals",
            "Use a live product or service as empirical proof to policymakers",
        ],
        "modules": [
            {"title": "Phase 1 - Diagnosis & Ideation", "description": "Trace market friction down to the policy mechanism.", "objectives": ["Distinguish symptoms from policy mechanisms"]},
            {"title": "Phase 2 - The Human Engine", "description": "Run EET as an operational team matrix.", "objectives": ["Assemble the roles every advocacy team needs"]},
            {"title": "Phase 3 - The Playbook", "description": "Map lawmakers, Sheria ya Vijana levers, and Kapanga stakeholders.", "objectives": ["Build a Power x Interest stakeholder matrix"]},
            {"title": "Phase 4 - Execution & Evolution", "description": "Use your venture as empirical proof.", "objectives": ["Translate operational metrics into policy-grade arguments"]},
            {"title": "The Chronological Pipeline", "description": "Run issue identification, mapping, messaging, tactics, and review.", "objectives": ["Build a one-page campaign canvas"]},
        ],
    },
    {
        "course_id": "c8e7dac3-fc4a-4154-a3cd-3cc88ffad233",
        "title": "The Youth Builder Blueprint",
        "description": "A reset from founder myths to collaborative, iterative problem-solving.",
        "overview": "The builder operating system: mindset reset, EET, root-versus-fruit diagnosis, DFV stress testing, MVP loops, and pitching.",
        "difficulty_level": "beginner",
        "estimated_duration_hours": 12,
        "category_name": "Digital Entrepreneurship",
        "category_color": "#8B5CF6",
        "slides_url": None,
        "learning_outcomes": [
            "Diagnose surface symptoms versus systemic roots",
            "Apply the EET Engine to your own build",
            "Run a DFV stress test on an idea in 60 minutes",
            "Ship an MVP using Build-Measure-Learn loops",
        ],
        "modules": [
            {"title": "Mindset Reset - Myths vs. Reality of Building", "description": "Replace founder fairy tales with evidence-based building.", "objectives": ["List the common entrepreneurial myths"]},
            {"title": "The EET Engine - Education, Training, Empowerment", "description": "Balance the three fuels every young builder needs.", "objectives": ["Audit your EET fuel mix"]},
            {"title": "Root vs. Fruit - Surface Symptoms vs. Systemic Drivers", "description": "Trace community problems down to the roots.", "objectives": ["Map any local issue into Root-Trunk-Fruit"]},
            {"title": "Zone of Execution + The DFV Stress-Test", "description": "Find the sweet spot and pass desirability, feasibility, viability gates.", "objectives": ["Run a DFV stress test"]},
            {"title": "The MVP Loop + The Pitch Pillar", "description": "Ship the smallest useful thing and tell its story.", "objectives": ["Run a Build-Measure-Learn cycle"]},
        ],
    },
    {
        "course_id": "19dd7706-d89b-44ea-93f4-1b866d102f83",
        "title": "The Youth Leadership Blueprint",
        "description": "Lead Self, then Lead Others, then Lead Systems without skipping a step.",
        "overview": "A five-module leadership stack from internal operating system to feedback loops, conflict, diagnostics, and systems advocacy.",
        "difficulty_level": "intermediate",
        "estimated_duration_hours": 14,
        "category_name": "Leadership",
        "category_color": "#10B981",
        "slides_url": None,
        "learning_outcomes": [
            "Run Personal Root-Cause Analysis on your own patterns",
            "Operate the Continuous Growth Loop instead of waiting for annual reviews",
            "Place every conflict on the Empathy x Clarity matrix",
            "Convert local friction into targeted advocacy strategy",
        ],
        "modules": [
            {"title": "Leading Self - Internal Operating System + Personal RCA", "description": "Audit the defaults, triggers, and recovery patterns you lead from.", "objectives": ["Map your internal operating system"]},
            {"title": "The Continuous Growth Loop", "description": "Action, Reception, Calibration, Adaptation.", "objectives": ["Operate a weekly feedback loop"]},
            {"title": "Leading Others - Empathy x Clarity Matrix", "description": "Intervene on conflict early, before it peaks.", "objectives": ["Shift toward high empathy and high clarity"]},
            {"title": "The 3 Whys Diagnostic", "description": "Capacity, Clarity, or Motivation.", "objectives": ["Diagnose team friction accurately"]},
            {"title": "Leading Systems - The Advocacy Funnel", "description": "Move from local friction to policy diagnosis and action.", "objectives": ["Build a one-page advocacy plan"]},
        ],
    },
]


GUIDES = {
    "Business Advocacy Strategy in Practice": {
        "model_title": "The 10% Advocacy Operating Model",
        "model_intro": "Founders should shape the rules that shape their margins, but advocacy must not swallow the business. This model keeps effort strategic and bounded.",
        "model_steps": ["Policy friction", "Sector-wide ask", "Coalition signal", "Credible evidence", "10% weekly cap", "Quarterly reset"],
        "model_takeaway": "A good advocacy move helps the sector, strengthens your venture's credibility, and still leaves the business enough oxygen to operate.",
        "toolkit_title": "Founder advocacy checklist",
        "toolkit_intro": "Use this before you spend time on any policy effort.",
        "toolkit_items": ["Name the exact rule, fee, clause, or process causing friction", "Check that the ask benefits a class of ventures, not only you", "Collect one operational proof point from your business", "Invite 3-5 aligned ventures before going public", "Set a weekly time cap and a decision-window sprint", "Turn every output into a credibility artifact"],
        "promise": "By the end, learners should leave with one bounded campaign that protects both impact and operations.",
        "worksheet_intro": "Turn the course into a 30-day founder advocacy sprint.",
        "worksheet_prompts": ["The policy friction I will focus on is", "The whole-sector benefit is", "The evidence I can provide from operations is", "The first three allies I will contact are", "My weekly time cap is"],
        "finish_line": "You are done when the ask is specific, the coalition is real, and the founder calendar still has room for the business.",
    },
    "Diagnosing Impact - Proving the Cure": {
        "model_title": "Evidence Ladder",
        "model_intro": "Impact claims become believable when learners move from visible events to structural causes, then measure only the signals that matter.",
        "model_style": "iceberg",
        "model_steps": ["Events", "Patterns", "Structures", "Core intervention point", "Signal KPIs"],
        "model_takeaway": "Do not measure everything. Measure the few signals that prove your intervention actually changed behavior, access, or systems.",
        "toolkit_title": "M&E design checklist",
        "toolkit_intro": "Use this to make a project funder-ready without drowning the team in metrics.",
        "toolkit_items": ["Write the visible event in one sentence", "Ask 5 Whys until action becomes possible", "Sort parallel causes into People, Policy, Environment, and Procedures", "Build one Results Chain before choosing KPIs", "Keep only 3-5 KPIs the team can remember", "Schedule the feedback loop before fieldwork begins"],
        "promise": "The guide should help learners defend impact claims with clarity, evidence, and humility.",
        "worksheet_intro": "Use this sheet to turn a messy project into an evaluation-ready design.",
        "worksheet_prompts": ["The visible event is", "The recurring pattern is", "The root structure is", "The core intervention point is", "The 3-5 KPIs are"],
        "finish_line": "You are done when a skeptical outsider can follow the chain from problem to evidence to decision.",
    },
    "Entrepreneurship Education Training (EET)": {
        "model_title": "Founder Operating Path",
        "model_intro": "This course is long, so the guide turns it into a visual path from idea to market discipline, money discipline, records, and compliance.",
        "model_steps": ["Entrepreneur mindset", "Idea and product", "Business plan", "Money discipline", "Marketing path", "Records", "Compliance"],
        "model_takeaway": "A business becomes real when the idea, customer, money, records, and compliance all line up.",
        "toolkit_title": "Business-builder checklist",
        "toolkit_intro": "Use this as a simple operating review for a young venture.",
        "toolkit_items": ["Describe the customer problem in plain language", "Name the smallest product version you can test", "Write the one-page business plan before the long plan", "Separate personal and business money", "Choose one clear marketing channel to test", "Keep weekly records before they become monthly stress"],
        "promise": "Learners should move from content consumption to a practical business rhythm.",
        "worksheet_intro": "Use this sheet to convert the course into a practical first business review.",
        "worksheet_prompts": ["The customer problem is", "The smallest useful offer is", "The first marketing channel is", "The weekly money habit is", "The compliance step I need next is"],
        "finish_line": "You are done when the learner can explain the business, price it, promote it, record it, and keep it legal.",
    },
    "Sheria ya Vijana - Entrepreneurship Edition": {
        "model_title": "Youth Founder Legal Stack",
        "model_intro": "The goal is practical legal confidence: know which protections, funding routes, procurement openings, and county rules matter for your venture.",
        "model_steps": ["Article 55", "AGPO 30%", "Youth Enterprise Fund", "County licensing", "Evidence of friction", "Targeted advocacy"],
        "model_takeaway": "Legal literacy is not memorizing acts. It is knowing what to invoke, where to apply, and which chokepoint to challenge.",
        "toolkit_title": "Legal readiness checklist",
        "toolkit_intro": "Use this before registering, bidding, fundraising, or challenging a county process.",
        "toolkit_items": ["Name the law or policy that supports your ask", "Check AGPO eligibility and missing documents", "Map the Youth Enterprise Fund route you can realistically use", "List county permits that affect your daily operations", "Collect proof of licensing delays, costs, or inconsistent treatment", "Turn the legal anchor into a clear advocacy ask"],
        "promise": "Learners should feel less intimidated by legal language and more ready to use it responsibly.",
        "worksheet_intro": "Use this sheet to map the legal scaffolding around one youth-led venture.",
        "worksheet_prompts": ["The legal anchor I can cite is", "My AGPO readiness gap is", "The county licensing chokepoint is", "The evidence I need to collect is", "The first office I should approach is"],
        "finish_line": "You are done when the learner can connect one venture need to one legal anchor and one practical next step.",
    },
    "The Advocacy Impact Engine": {
        "model_title": "Advocacy Campaign Pipeline",
        "model_intro": "Serious advocacy is a campaign system: diagnosis, team, stakeholder playbook, execution, and review.",
        "model_steps": ["Issue diagnosis", "Human engine", "Stakeholder map", "Message proof", "Tactic deployment", "Review and adapt"],
        "model_takeaway": "Awareness is not the output. Movement is the output: a decision, clause, budget line, procedure, or enforcement shift.",
        "toolkit_title": "Campaign design checklist",
        "toolkit_intro": "Use this to turn outrage into an organized campaign.",
        "toolkit_items": ["Write the market symptom and policy mechanism separately", "Assign owner roles before tactics begin", "Map Power x Interest for every target", "Find the Kapanga who can move the memo", "Use venture data as evidence, not decoration", "Review after each tactic and adapt the next move"],
        "promise": "Learners should leave with a campaign canvas that can survive real stakeholder pressure.",
        "worksheet_intro": "Use this sheet to create the first version of a deployable campaign.",
        "worksheet_prompts": ["The symptom is", "The policy mechanism is", "The primary target is", "The Kapanga relationship I need is", "The first tactic is"],
        "finish_line": "You are done when each tactic has an owner, target, evidence source, and review date.",
    },
    "The Youth Builder Blueprint": {
        "model_title": "Builder Loop",
        "model_intro": "Young builders need fewer myths and more disciplined loops: diagnose, fuel the engine, test the idea, ship, measure, and pitch.",
        "model_steps": ["Mindset reset", "EET fuel mix", "Root vs Fruit", "DFV stress-test", "MVP loop", "Pitch narrative"],
        "model_takeaway": "The strongest builder is not the one with the biggest idea. It is the one who learns fastest from a real user.",
        "toolkit_title": "Idea-to-MVP checklist",
        "toolkit_intro": "Use this before turning an observed problem into a venture.",
        "toolkit_items": ["Write the problem as a visible fruit, trunk, and root", "Audit Education, Training, and Empowerment gaps", "Score desirability, feasibility, and viability separately", "Choose the riskiest assumption to test first", "Ship the smallest useful version in 14 days", "Pitch with context, conflict, change, and close"],
        "promise": "Learners should build with humility, evidence, speed, and a clean story.",
        "worksheet_intro": "Use this sheet to decide what to build first.",
        "worksheet_prompts": ["The root problem is", "My weakest EET fuel is", "The riskiest assumption is", "The 14-day MVP is", "The pitch close is"],
        "finish_line": "You are done when the idea has met a user, produced evidence, and changed at least once.",
    },
    "The Youth Leadership Blueprint": {
        "model_title": "Empathy x Clarity Leadership Matrix",
        "model_intro": "Leadership works when people feel seen and expectations are unambiguous. This matrix turns conflict and performance issues into clearer choices.",
        "model_style": "matrix",
        "axis_x": "Clarity ->",
        "axis_y": "Empathy ->",
        "model_steps": ["Friend: kind, vague", "Youth Advocate: kind, clear", "Ghost: absent", "Tyrant: clear, harsh"],
        "model_takeaway": "The target is high empathy and high clarity: name what is hard, then state what must happen next.",
        "toolkit_title": "Leadership calibration checklist",
        "toolkit_intro": "Use this for weekly self-review and team interventions.",
        "toolkit_items": ["Name your default under stress", "Ask for one piece of specific feedback each week", "Plot the last hard conversation on Empathy x Clarity", "Diagnose team friction as Capacity, Clarity, or Motivation", "Intervene early when conflict is still rising", "Turn one structural frustration into an advocacy funnel"],
        "promise": "Learners should leave with a leadership rhythm they can practice every week.",
        "worksheet_intro": "Use this sheet to convert leadership ideas into one week of action.",
        "worksheet_prompts": ["My current leadership trigger is", "The feedback question I will ask is", "The conversation needing more clarity is", "The team friction root is", "The system-level issue is"],
        "finish_line": "You are done when the learner has one self move, one team move, and one system move.",
    },
}


def build_pdf(course: dict) -> dict:
    accent = hex_color(course.get("category_color"), GREEN)
    guide = GUIDES[course["title"]]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{slugify(course['title'])}-{VERSION}-visual-learner-guide.pdf"
    path = OUT_DIR / filename
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle(clean(f"{course['title']} - Visual Learner Guide"))
    c.setAuthor("Kiongozi LMS")
    c.setSubject("Generated course multimedia upgrade")

    page = 1
    draw_cover(c, course, accent)
    c.showPage()
    page += 1
    draw_journey(c, course, page, accent)
    c.showPage()
    page += 1
    draw_core_model(c, course, guide, page, accent)
    c.showPage()
    page += 1
    page = draw_module_deep_dive(c, course, page, accent)
    c.showPage()
    page += 1
    draw_toolkit(c, course, guide, page, accent)
    c.showPage()
    page += 1
    draw_worksheet(c, course, guide, page, accent)
    c.save()
    return {
        "course_id": course["course_id"],
        "title": course["title"],
        "file_type": "pdf",
        "purpose": "learner_guide",
        "version": VERSION,
        "local_path": str(path).replace("\\", "/"),
        "filename": filename,
        "replaces_url": course.get("slides_url"),
        "page_count": page,
        "storage_path": f"course-assets/{course['course_id']}/{VERSION}/{filename}",
    }


def main() -> None:
    manifest = [build_pdf(course) for course in COURSES]
    manifest_path = OUT_DIR / "course-visual-guides-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
