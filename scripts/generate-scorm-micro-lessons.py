from __future__ import annotations

import html
import json
import uuid
from pathlib import Path


OUT_DIR = Path("output/scorm")
NAMESPACE = uuid.NAMESPACE_URL

PACKAGES = [
    {
        "course_id": "c8e7dac3-fc4a-4154-a3cd-3cc88ffad233",
        "slug": "youth-builder-mvp-sprint",
        "title": "Youth Builder MVP Sprint Lab",
        "course_title": "The Youth Builder Blueprint",
        "accent": "#8B5CF6",
        "intro": "Build a 14-day MVP plan from one real community problem, then commit to the smallest useful test.",
        "steps": [
            {
                "title": "Problem focus",
                "prompt": "Which problem is specific enough to test with one user group this month?",
                "choices": ["A clear root problem", "A broad social issue", "A trend that sounds exciting"],
                "correct": 0,
                "feedback": "Start with the root problem. Broad issues make weak MVPs.",
            },
            {
                "title": "DFV gate",
                "prompt": "Before building, which three gates must the idea pass?",
                "choices": ["Desirability, Feasibility, Viability", "Funding, Fame, Followers", "Brand, Logo, Pitch deck"],
                "correct": 0,
                "feedback": "Good. DFV keeps the idea grounded in demand, capability, and sustainability.",
            },
            {
                "title": "MVP commitment",
                "prompt": "What is the healthiest first build?",
                "choices": ["The smallest version that teaches you something", "A polished product after six months", "A private prototype no learner sees"],
                "correct": 0,
                "feedback": "Exactly. Ship the smallest useful thing and learn fast.",
            },
        ],
    },
    {
        "course_id": "f27d6801-58b8-48a2-a40f-f69b898d7625",
        "slug": "sheria-founder-readiness",
        "title": "Sheria Founder Readiness Check",
        "course_title": "Sheria ya Vijana - Entrepreneurship Edition",
        "accent": "#8B5CF6",
        "intro": "Check whether a youth-led venture can name the legal anchor, procurement route, and licensing chokepoint that matter most.",
        "steps": [
            {
                "title": "Legal anchor",
                "prompt": "Which legal anchor gives youth entrepreneurship its constitutional floor?",
                "choices": ["Article 55", "A county flyer", "A private grant advert"],
                "correct": 0,
                "feedback": "Correct. Article 55 is the constitutional starting point.",
            },
            {
                "title": "Procurement route",
                "prompt": "What does AGPO help eligible youth-led ventures access?",
                "choices": ["Reserved public procurement opportunities", "Automatic tax exemption", "Free office space"],
                "correct": 0,
                "feedback": "Yes. AGPO is about procurement access, not a shortcut around compliance.",
            },
            {
                "title": "County friction",
                "prompt": "What should a founder document before challenging a licensing chokepoint?",
                "choices": ["Costs, delays, inconsistent treatment, and office pathway", "Only social media complaints", "A logo and slogan"],
                "correct": 0,
                "feedback": "Right. Evidence turns frustration into a usable advocacy ask.",
            },
        ],
    },
    {
        "course_id": "4900fb28-5c1c-46ff-8ef6-a3b8ad11bfba",
        "slug": "advocacy-campaign-canvas",
        "title": "Advocacy Campaign Canvas Lab",
        "course_title": "The Advocacy Impact Engine",
        "accent": "#3B82F6",
        "intro": "Turn one policy-rooted friction into a campaign canvas with target, proof, tactic, and review rhythm.",
        "steps": [
            {
                "title": "Diagnosis",
                "prompt": "What should come before choosing tactics?",
                "choices": ["A clear policy mechanism behind the symptom", "A poster design", "A public hashtag"],
                "correct": 0,
                "feedback": "Yes. Tactics without diagnosis waste energy.",
            },
            {
                "title": "Stakeholder map",
                "prompt": "Who should be mapped besides the public principal?",
                "choices": ["The quiet operator who controls access and memo flow", "Only celebrity endorsers", "Only your friends"],
                "correct": 0,
                "feedback": "Correct. The Kapanga relationship often determines whether the ask reaches the room.",
            },
            {
                "title": "Proof",
                "prompt": "What makes a youth venture powerful in policy conversations?",
                "choices": ["Operational evidence from a real product or service", "A vague claim that youth need help", "A long manifesto with no data"],
                "correct": 0,
                "feedback": "Exactly. Business-as-proof converts lived operations into policy-grade evidence.",
            },
        ],
    },
]


def package_id(slug: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"kiongozi-scorm-micro-lesson-v1:{slug}"))


def manifest_xml(pkg: dict, pkg_id: str) -> str:
    title = html.escape(pkg["title"])
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="{pkg_id}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>{title}</title>
      <item identifier="ITEM-1" identifierref="RES-1">
        <title>{title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html" />
    </resource>
  </resources>
</manifest>
'''


def index_html(pkg: dict, pkg_id: str) -> str:
    data = json.dumps(
        {
            "id": pkg_id,
            "title": pkg["title"],
            "courseTitle": pkg["course_title"],
            "intro": pkg["intro"],
            "accent": pkg["accent"],
            "steps": pkg["steps"],
        }
    )
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(pkg["title"])}</title>
  <style>
    :root {{
      --accent: {pkg["accent"]};
      --ink: #122033;
      --muted: #64748b;
      --paper: #ffffff;
      --soft: #f8fafc;
      --line: #dbe3ee;
      --good: #10b981;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(135deg, #fbf7ef 0%, #eef7ff 100%);
      color: var(--ink);
      min-height: 100vh;
    }}
    main {{
      max-width: 1080px;
      margin: 0 auto;
      padding: 34px 22px 44px;
    }}
    .hero {{
      display: grid;
      grid-template-columns: 1.25fr .75fr;
      gap: 22px;
      align-items: stretch;
      margin-bottom: 22px;
    }}
    .panel {{
      background: rgba(255,255,255,.92);
      border: 1px solid var(--line);
      border-radius: 18px;
      box-shadow: 0 18px 48px rgba(15, 23, 42, .08);
    }}
    .intro {{ padding: 30px; }}
    .eyebrow {{
      color: var(--accent);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }}
    h1 {{ margin: 0 0 14px; font-size: clamp(30px, 5vw, 54px); line-height: 1; letter-spacing: 0; }}
    p {{ margin: 0; color: var(--muted); line-height: 1.55; }}
    .status {{
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 250px;
    }}
    .score {{
      width: 138px;
      height: 138px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      border: 14px solid color-mix(in srgb, var(--accent), white 72%);
      color: var(--ink);
      font-size: 30px;
      font-weight: 900;
      margin-left: auto;
      margin-right: auto;
      background: var(--paper);
    }}
    .progress {{
      height: 12px;
      border-radius: 99px;
      background: #e2e8f0;
      overflow: hidden;
      margin-top: 20px;
    }}
    .bar {{ height: 100%; width: 0%; background: var(--accent); transition: width .35s ease; }}
    .steps {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin: 18px 0;
    }}
    .step {{ padding: 20px; }}
    .step h2 {{ margin: 0 0 8px; font-size: 20px; }}
    .choices {{ display: grid; gap: 10px; margin-top: 18px; }}
    button.choice, button.complete {{
      border: 1px solid var(--line);
      background: var(--paper);
      color: var(--ink);
      border-radius: 12px;
      padding: 12px 14px;
      text-align: left;
      font-weight: 800;
      cursor: pointer;
      transition: transform .15s ease, border-color .15s ease, background .15s ease;
    }}
    button.choice:hover, button.complete:hover {{ transform: translateY(-1px); border-color: var(--accent); }}
    button.choice.selected {{ background: color-mix(in srgb, var(--accent), white 86%); border-color: var(--accent); }}
    button.choice.correct {{ background: #dcfce7; border-color: var(--good); }}
    .feedback {{
      min-height: 58px;
      margin-top: 18px;
      padding: 14px;
      border-radius: 12px;
      background: var(--soft);
      color: var(--ink);
      font-weight: 700;
      line-height: 1.4;
    }}
    .action {{
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: center;
      padding: 22px;
      border-left: 8px solid var(--accent);
    }}
    .complete {{
      color: white;
      background: var(--ink);
      border-color: var(--ink);
      text-align: center;
      padding: 14px 18px;
      min-width: 190px;
    }}
    .complete:disabled {{ opacity: .45; cursor: not-allowed; transform: none; }}
    @media (max-width: 760px) {{
      .hero, .steps, .action {{ grid-template-columns: 1fr; }}
      .intro {{ padding: 24px; }}
    }}
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="panel intro">
        <div class="eyebrow" id="course"></div>
        <h1 id="title"></h1>
        <p id="intro"></p>
      </div>
      <aside class="panel status" aria-label="Progress">
        <div class="score"><span id="score">0%</span></div>
        <div>
          <p id="statusText">Answer each checkpoint to unlock completion</p>
          <div class="progress"><div class="bar" id="bar"></div></div>
        </div>
      </aside>
    </section>
    <section class="steps" id="steps"></section>
    <section class="panel action">
      <div>
        <h2 style="margin:0 0 8px">Finish this lab</h2>
        <p>Completion saves to the LMS as SCORM progress and updates the course progress calculation.</p>
      </div>
      <button class="complete" id="complete" disabled>Complete SCORM lab</button>
    </section>
  </main>
  <script>
    const LESSON = {data};
    let api = null;
    let answers = Array(LESSON.steps.length).fill(null);

    function findAPI(win) {{
      let current = win;
      for (let i = 0; i < 8; i += 1) {{
        if (current.API) return current.API;
        if (!current.parent || current.parent === current) break;
        current = current.parent;
      }}
      return null;
    }}

    function setValue(key, value) {{
      if (api && api.LMSSetValue) api.LMSSetValue(key, String(value));
    }}

    function commit() {{
      if (api && api.LMSCommit) api.LMSCommit("");
    }}

    function score() {{
      const correct = answers.filter((answer, index) => answer === LESSON.steps[index].correct).length;
      return Math.round((correct / LESSON.steps.length) * 100);
    }}

    function answeredCount() {{
      return answers.filter(answer => answer !== null).length;
    }}

    function updateProgress() {{
      const pct = Math.round((answeredCount() / LESSON.steps.length) * 100);
      document.getElementById("bar").style.width = pct + "%";
      document.getElementById("score").textContent = score() + "%";
      document.getElementById("complete").disabled = answeredCount() !== LESSON.steps.length;
      document.getElementById("statusText").textContent =
        answeredCount() === LESSON.steps.length
          ? "Ready to complete and save progress"
          : `${{answeredCount()}} of ${{LESSON.steps.length}} checkpoints answered`;
      setValue("cmi.core.lesson_location", String(answeredCount()));
      setValue("cmi.core.score.raw", score());
      setValue("cmi.core.score.min", 0);
      setValue("cmi.core.score.max", 100);
      setValue("cmi.suspend_data", JSON.stringify({{ answers }}));
      setValue("cmi.core.lesson_status", answeredCount() === LESSON.steps.length ? "completed" : "incomplete");
      commit();
    }}

    function render() {{
      document.documentElement.style.setProperty("--accent", LESSON.accent);
      document.getElementById("course").textContent = LESSON.courseTitle;
      document.getElementById("title").textContent = LESSON.title;
      document.getElementById("intro").textContent = LESSON.intro;
      const root = document.getElementById("steps");
      root.innerHTML = "";
      LESSON.steps.forEach((step, stepIndex) => {{
        const card = document.createElement("article");
        card.className = "panel step";
        card.innerHTML = `
          <h2>${{stepIndex + 1}}. ${{step.title}}</h2>
          <p>${{step.prompt}}</p>
          <div class="choices"></div>
          <div class="feedback" aria-live="polite">Choose the best answer</div>
        `;
        const choices = card.querySelector(".choices");
        const feedback = card.querySelector(".feedback");
        step.choices.forEach((choice, choiceIndex) => {{
          const button = document.createElement("button");
          button.type = "button";
          button.className = "choice";
          button.textContent = choice;
          button.addEventListener("click", () => {{
            answers[stepIndex] = choiceIndex;
            [...choices.children].forEach(child => child.className = "choice");
            button.className = choiceIndex === step.correct ? "choice correct" : "choice selected";
            feedback.textContent = choiceIndex === step.correct ? step.feedback : "Close, but revisit the course idea and try again";
            updateProgress();
          }});
          choices.appendChild(button);
        }});
        root.appendChild(card);
      }});
    }}

    window.addEventListener("load", () => {{
      api = findAPI(window);
      if (api && api.LMSInitialize) api.LMSInitialize("");
      setValue("cmi.core.lesson_status", "incomplete");
      render();
      updateProgress();
    }});

    document.getElementById("complete").addEventListener("click", () => {{
      setValue("cmi.core.lesson_status", "completed");
      setValue("cmi.core.score.raw", score());
      commit();
      if (api && api.LMSFinish) api.LMSFinish("");
      document.getElementById("statusText").textContent = "Completed and saved";
      document.getElementById("complete").textContent = "Completed";
      document.getElementById("complete").disabled = true;
    }});
  </script>
</body>
</html>
'''


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    for pkg in PACKAGES:
        pkg_id = package_id(pkg["slug"])
        folder = OUT_DIR / pkg_id
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "imsmanifest.xml").write_text(manifest_xml(pkg, pkg_id), encoding="utf-8")
        (folder / "index.html").write_text(index_html(pkg, pkg_id), encoding="utf-8")
        storage_path = f"scorm/{pkg_id}"
        manifest.append(
            {
                "id": pkg_id,
                "course_id": pkg["course_id"],
                "title": pkg["title"],
                "version": "1.2",
                "entry_point": "index.html",
                "storage_path": storage_path,
                "local_dir": str(folder).replace("\\", "/"),
                "manifest_data": {
                    "title": pkg["title"],
                    "version": "1.2",
                    "entryPoint": "index.html",
                    "identifier": pkg_id,
                    "organizations": [
                        {
                            "identifier": "ORG-1",
                            "title": pkg["title"],
                            "items": [{"identifier": "ITEM-1", "identifierref": "RES-1", "title": pkg["title"]}],
                        }
                    ],
                    "resources": [
                        {
                            "identifier": "RES-1",
                            "type": "webcontent",
                            "scormType": "sco",
                            "href": "index.html",
                            "files": ["index.html"],
                        }
                    ],
                },
            }
        )
    (OUT_DIR / "scorm-micro-lessons-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
