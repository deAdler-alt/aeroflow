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
import math
import os
import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- Random Forest prediction engine -------------------------------------
# Loaded once at startup. If the model file is missing the API degrades to an
# analytic dispersion model so it still runs.
ML_DIR = Path(__file__).parent / "ml"
sys.path.insert(0, str(ML_DIR))
try:
    import joblib
    from simulator import feature_vector  # noqa: E402

    _PM_MODEL = joblib.load(ML_DIR / "pm25_model.pkl")
    _MODEL_META = json.loads((ML_DIR / "model_meta.json").read_text())
except Exception:  # noqa: BLE001
    _PM_MODEL = None
    _MODEL_META = None
    feature_vector = None

# Load variables from backend/.env (if present) so GROQ_API_KEY doesn't have
# to be exported manually every time.
try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).parent / ".env")
except ImportError:  # dotenv optional; env vars still work without it
    pass

# Groq is optional at import time so the API still boots without a key.
try:
    from groq import Groq
except ImportError:  # pragma: no cover
    Groq = None

# Replace with your key, or set the GROQ_API_KEY environment variable.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "<GROQ_API_KEY>")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

DATA_PATH = Path(__file__).parent / "data" / "mock_data.json"

# --- Traffic-dispersion model parameters ---------------------------------
# Notional number of vehicles moving through the modeled traffic corridors.
# A diversion of X% re-routes this fraction of them.
FLEET_SIZE = 7000
GROWTH_RATE = 0.14      # emission buildup per hour under full traffic
DISPERSION_RATE = 0.45  # how fast air clears once congestion is relieved
DISPERSION_GAIN = 0.6   # coupling between diversion and pollutant clearing
IDLE_FACTOR = 0.15      # immediate emission cut from reduced idling (signal retiming)
CRITICAL_THRESHOLD = 90.0

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
    diversion_pct: float = 60.0  # traffic-model diversion level driving this scenario
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


def classify(pm25: float) -> str:
    """Same WHO-inspired buckets used by the data generator / map colours."""
    if pm25 <= 45:
        return "good"
    if pm25 <= CRITICAL_THRESHOLD:
        return "moderate"
    return "critical"


def project_optimized(base: float, hours: int, diversion: float) -> float:
    """
    Physical-ish traffic-dispersion model.

    diversion is a fraction in [0, 1] of vehicles re-routed out of the corridor.

      - Remaining traffic keeps emitting, so pollution still grows, but only by
        the fraction of traffic that was NOT diverted: growth * (1 - diversion).
      - Relieving congestion lets the air clear: an exponential dispersion term
        that scales with how much traffic was removed.

    At diversion = 0 this reproduces the "standard" trajectory; at high diversion
    the pollutant peak is pushed back down below baseline.
    """
    growth = base * GROWTH_RATE * hours * (1.0 - diversion)
    # Immediate benefit (less idling) + time-building dispersion once air clears.
    dispersion = base * diversion * (
        IDLE_FACTOR + (1.0 - math.exp(-DISPERSION_RATE * hours)) * DISPERSION_GAIN
    )
    return max(base + growth - dispersion, 5.0)


class OptimizeRequest(BaseModel):
    # 0 = do nothing, 0.8 = divert 80% of corridor traffic
    diversion_pct: float = 60.0


def _frame_hour(iso_time: str, offset_hours: int) -> int:
    """Hour-of-day for a frame (from its timestamp, falling back to the offset)."""
    try:
        from datetime import datetime

        return datetime.fromisoformat(iso_time).hour
    except Exception:  # noqa: BLE001
        return (16 + offset_hours) % 24


@app.post("/api/optimize")
def optimize(req: OptimizeRequest):
    """
    Recompute the 'optimized' pollution trajectory ON DEMAND for a given traffic
    diversion level — this is what the "Optimize Traffic" control actually drives.

    When the Random Forest is loaded, diverting traffic lowers each sector's
    `traffic_density` feature and the model RE-PREDICTS PM2.5 — so the same ML
    engine powers both the forecast and the optimisation. Without the model it
    falls back to an analytic dispersion formula.
    """
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="mock_data.json not found.")

    data = json.loads(DATA_PATH.read_text())
    diversion = max(0.0, min(req.diversion_pct, 100.0)) / 100.0
    use_rf = _PM_MODEL is not None and feature_vector is not None

    # Baseline (for the analytic fallback) = current "Now" standard readings.
    now_frame = next(t for t in data["timestamps"] if t["offset_hours"] == 0)
    baseline = {h["id"]: h["pm25"] for h in now_frame["scenarios"]["standard"]}

    frames = []
    peak_optimized = 0.0
    for t in data["timestamps"]:
        hours = t["offset_hours"]
        hour_of_day = _frame_hour(t.get("iso_time", ""), hours)
        hotspots = []
        for spot in t["scenarios"]["standard"]:
            feats = spot.get("features")
            if use_rf and feats:
                # Divert a fraction of cars -> lower traffic density -> RF re-predicts.
                new_traffic = feats["traffic_density"] * (1.0 - diversion)
                vec = feature_vector(
                    new_traffic,
                    feats["wind_speed"],
                    feats["temperature"],
                    feats["road_topology"],
                    hour_of_day,
                )
                pm25 = float(_PM_MODEL.predict([vec])[0])
            else:
                pm25 = project_optimized(baseline[spot["id"]], hours, diversion)

            pm25 = round(max(pm25, 5.0), 1)
            peak_optimized = max(peak_optimized, pm25)
            hotspots.append({
                "id": spot["id"],
                "name": spot["name"],
                "lat": spot["lat"],
                "lng": spot["lng"],
                "pm25": pm25,
                "level": classify(pm25),
            })
        frames.append({"offset_hours": hours, "hotspots": hotspots})

    peak_standard = data["stats"]["predicted_peak_standard"]
    reduction = (
        round((peak_standard - peak_optimized) / peak_standard * 100, 1)
        if peak_standard
        else 0.0
    )

    return {
        "diversion_pct": round(req.diversion_pct, 1),
        "cars_diverted": round(FLEET_SIZE * diversion),
        "predicted_peak_optimized": round(peak_optimized, 1),
        "predicted_peak_standard": peak_standard,
        "reduction_pct": reduction,
        "engine": "random_forest" if use_rf else "analytic",
        "frames": frames,
    }


@app.get("/api/model-info")
def model_info():
    """Metrics for the trained prediction model (proves a real model is deployed)."""
    if _MODEL_META is None:
        return {"loaded": False, "algorithm": "analytic_fallback"}
    return {"loaded": True, **_MODEL_META}


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
- Traffic diversion level applied by the system: {req.diversion_pct:.0f}% of corridor traffic re-routed
- Vehicles proactively re-routed: {req.cars_diverted}
- Highest-risk monitoring zones:
{hotspot_lines}

When describing the mitigation, explicitly reference the {req.diversion_pct:.0f}% traffic diversion level that produced this result.

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
        f"In response, the system applied a {req.diversion_pct:.0f}% traffic-diversion "
        f"plan — proactively re-routing approximately {req.cars_diverted} vehicles away "
        f"from the affected zones and adjusting signal timing to reduce idling. This "
        f"lowered the projected peak to {req.predicted_peak_optimized} µg/m³, "
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
