"""
AeroFlow AI - FastAPI Backend

Endpoints:
    GET  /api/data            -> mocked time-series pollution data
    POST /api/generate-report -> Groq-generated "Mayor's Report"

Run:
    cd backend
    uvicorn main:app --reload --port 8000
"""

import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Groq is optional at import time so the API still boots without a key.
try:
    from groq import Groq
except ImportError:  # pragma: no cover
    Groq = None

# Replace with your key, or set the GROQ_API_KEY environment variable.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "<GROQ_API_KEY>")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-70b-8192")

DATA_PATH = Path(__file__).parent / "data" / "mock_data.json"

app = FastAPI(title="AeroFlow AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hackathon MVP: open CORS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReportRequest(BaseModel):
    city: str = "Warsaw"
    predicted_peak_standard: float
    predicted_peak_optimized: float
    reduction_pct: float
    cars_diverted: int = 4200
    hotspots: list[dict[str, Any]] = []  # optional detail: [{name, pm25, level}, ...]


class ReportResponse(BaseModel):
    report: str
    model: str
    source: str  # "groq" | "fallback"


@app.get("/")
def root():
    return {"service": "AeroFlow AI", "status": "ok"}


@app.get("/api/data")
def get_data():
    """Return the mocked time-series pollution data."""
    if not DATA_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="mock_data.json not found. Run `python generate_mock_data.py` first.",
        )
    return json.loads(DATA_PATH.read_text())


def _build_prompt(req: ReportRequest) -> str:
    top = sorted(req.hotspots, key=lambda h: h.get("pm25", 0), reverse=True)[:3]
    hotspot_lines = "\n".join(
        f"  - {h.get('name', 'Unknown')}: {h.get('pm25')} µg/m³ ({h.get('level')})"
        for h in top
    ) or "  - (no hotspot detail provided)"

    return f"""You are AeroFlow AI, the autonomous air-quality operations system for the city of {req.city}.
Write a short, formal alert briefing addressed to the City Mayor.

DATA:
- Predicted PM2.5 peak WITHOUT intervention (standard traffic): {req.predicted_peak_standard} µg/m³
- Predicted PM2.5 peak WITH AI traffic optimization: {req.predicted_peak_optimized} µg/m³
- Projected pollution reduction: {req.reduction_pct}%
- Vehicles proactively re-routed: {req.cars_diverted}
- Highest-risk monitoring zones:
{hotspot_lines}

Write the briefing with:
1. A one-line SUBJECT header.
2. A short paragraph describing the predicted smog threat.
3. A short paragraph describing the mitigation the AI performed (traffic re-routing) and its measured impact.
4. A one-line closing recommendation.

Keep it under 180 words, professional, confident, and non-technical."""


def _fallback_report(req: ReportRequest) -> str:
    return (
        f"SUBJECT: Air Quality Alert & Automated Mitigation — {req.city}\n\n"
        f"Mayor,\n\n"
        f"AeroFlow AI projected a PM2.5 spike reaching {req.predicted_peak_standard} µg/m³ "
        f"under standard traffic conditions — a level classified as hazardous for "
        f"sensitive groups. The threat was concentrated in the city's high-density "
        f"traffic corridors.\n\n"
        f"In response, the system proactively re-routed approximately {req.cars_diverted} "
        f"vehicles away from the affected zones and adjusted signal timing to reduce "
        f"idling. This lowered the projected peak to {req.predicted_peak_optimized} µg/m³, "
        f"a {req.reduction_pct}% reduction.\n\n"
        f"Recommendation: maintain the optimized traffic plan for the next 6 hours "
        f"and continue monitoring.\n\n"
        f"— AeroFlow AI"
    )


@app.post("/api/generate-report", response_model=ReportResponse)
def generate_report(req: ReportRequest):
    """Generate a Mayor's Report via Groq, with a graceful offline fallback."""
    if Groq is None or GROQ_API_KEY == "<GROQ_API_KEY>" or not GROQ_API_KEY:
        # No key / library configured -> deterministic fallback so the demo never breaks.
        return ReportResponse(
            report=_fallback_report(req),
            model="fallback",
            source="fallback",
        )

    try:
        client = Groq(api_key=GROQ_API_KEY)
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a formal municipal AI operations assistant.",
                },
                {"role": "user", "content": _build_prompt(req)},
            ],
            temperature=0.6,
            max_tokens=400,
        )
        text = completion.choices[0].message.content.strip()
        return ReportResponse(report=text, model=GROQ_MODEL, source="groq")
    except Exception as exc:  # noqa: BLE001 - never break the demo
        return ReportResponse(
            report=_fallback_report(req)
            + f"\n\n[Note: live AI unavailable — {exc}]",
            model="fallback",
            source="fallback",
        )
