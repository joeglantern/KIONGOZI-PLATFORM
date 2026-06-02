import anthropic
import json
import os
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SECTORS = [
    "Green Transition", "Digital Economy", "Social Inclusion",
    "Governance", "Education", "Health", "Infrastructure"
]


async def process_youth_input(raw_text: str, language: str = "en") -> Dict[str, Any]:
    prompt = f"""Analyze this youth input and return ONLY valid JSON — no extra text.

Input: "{raw_text}"
Language hint: {language}

Return exactly this JSON structure:
{{
    "categories": ["sector1"],
    "sentiment": "positive|negative|neutral|mixed",
    "summary": "Two-sentence summary of the key points raised."
}}

Available sectors (pick 1-3 most relevant): {', '.join(SECTORS)}"""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )

    return json.loads(message.content[0].text.strip())


async def generate_policy_brief(inputs_summary: str, funds_summary: str) -> str:
    prompt = f"""You are a senior policy analyst for AFOSI, a Kenyan nonprofit focused on youth civic education.
Write a structured Policy Recommendation Memo based on the data below.

YOUTH INPUT INSIGHTS:
{inputs_summary}

WELFARE FUND STATUS:
{funds_summary}

Format the memo with these exact sections:
1. EXECUTIVE SUMMARY
2. KEY ISSUES IDENTIFIED
3. FUND ACCOUNTABILITY FINDINGS
4. RECOMMENDED ACTIONS
5. CONCLUSION

Be concise, evidence-based, and actionable. Use formal English. Maximum 600 words."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )

    return message.content[0].text
