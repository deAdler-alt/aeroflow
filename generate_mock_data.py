"""
AeroFlow AI - Mock Data Generator (Random Forest powered)

Generates a JSON file with a PM2.5 forecast for a city over a short horizon
(Now, +2h, +4h, +6h). For each hotspot and hour we build a feature vector
(traffic density, wind, temperature, road topology, time-of-day) and let the
trained Random Forest predict PM2.5 — so the "standard" forecast the dashboard
shows is a genuine ML prediction, not a hand-written formula.

The "optimized" scenario is a first-paint estimate; the live one is recomputed
on demand by the backend traffic model at POST /api/optimize.

Run (train the model first):
    python backend/ml/train_model.py
    python generate_mock_data.py

Output:
    backend/data/mock_data.json
"""

import json
import math
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)  # deterministic output for a reliable demo

ROOT = Path(__file__).parent
ML_DIR = ROOT / "backend" / "ml"
sys.path.insert(0, str(ML_DIR))

# Load the trained Random Forest (graceful fallback to an analytic model if absent).
try:
    import joblib
    from simulator import feature_vector, true_pm25

    _MODEL = joblib.load(ML_DIR / "pm25_model.pkl")
    MODEL_SOURCE = "random_forest"
except Exception:  # noqa: BLE001 - keep the generator runnable without the model
    _MODEL = None
    MODEL_SOURCE = "analytic_fallback"
    feature_vector = None
    true_pm25 = None

CITY = "Warsaw"
CITY_CENTER = (52.2297, 21.0122)  # lat, lng
START_HOUR = 16  # forecast starts at 16:00 (into the evening rush)

# Fixed monitoring hotspots, each with a traffic + topology profile.
#   base_traffic  : typical road-capacity usage (0..1)
#   road_topology : street-canyon / pollutant-trapping factor (0..1)
HOTSPOTS = [
    {"id": "hs-1", "name": "City Center Junction", "lat": 52.2319, "lng": 21.0067, "base_traffic": 0.58, "road_topology": 0.85},
    {"id": "hs-2", "name": "Northern Ring Road",   "lat": 52.2530, "lng": 21.0180, "base_traffic": 0.50, "road_topology": 0.50},
    {"id": "hs-3", "name": "Industrial District",  "lat": 52.2100, "lng": 20.9800, "base_traffic": 0.70, "road_topology": 0.95},
    {"id": "hs-4", "name": "Eastern Bridge",       "lat": 52.2450, "lng": 21.0450, "base_traffic": 0.52, "road_topology": 0.60},
    {"id": "hs-5", "name": "Old Town Square",       "lat": 52.2500, "lng": 21.0120, "base_traffic": 0.35, "road_topology": 0.70},
    {"id": "hs-6", "name": "Southern Highway Hub",  "lat": 52.1950, "lng": 21.0300, "base_traffic": 0.72, "road_topology": 0.80},
    {"id": "hs-7", "name": "Western Rail Yard",     "lat": 52.2280, "lng": 20.9600, "base_traffic": 0.55, "road_topology": 0.65},
    {"id": "hs-8", "name": "Airport Approach",      "lat": 52.1720, "lng": 20.9670, "base_traffic": 0.35, "road_topology": 0.40},
]

TIME_OFFSETS = [0, 2, 4, 6]  # hours from "now"


def classify(pm25: float) -> str:
    """AQI-style buckets used for map colour-coding."""
    if pm25 <= 45:
        return "good"
    if pm25 <= 90:
        return "moderate"
    return "critical"


def conditions(spot: dict, hours: int) -> dict:
    """Traffic + weather conditions for a hotspot at a given forecast offset."""
    # Traffic climbs into the evening rush; wind and temperature drop (calm, cool night).
    traffic = min(spot["base_traffic"] * (1.0 + 0.10 * hours), 1.0)
    wind = max(4.0 - 0.40 * hours, 1.2) + random.uniform(-0.2, 0.2)
    temp = 12.0 - 1.2 * hours + random.uniform(-0.5, 0.5)
    return {
        "traffic_density": round(traffic, 3),
        "wind_speed": round(wind, 2),
        "temperature": round(temp, 1),
        "road_topology": spot["road_topology"],
        "hour": (START_HOUR + hours) % 24,
    }


def predict_pm25(cond: dict) -> float:
    """RF prediction (or analytic twin if the model isn't available)."""
    if _MODEL is not None:
        vec = feature_vector(
            cond["traffic_density"],
            cond["wind_speed"],
            cond["temperature"],
            cond["road_topology"],
            cond["hour"],
        )
        return float(_MODEL.predict([vec])[0])
    if true_pm25 is not None:  # pragma: no cover
        return true_pm25(
            cond["traffic_density"], cond["wind_speed"],
            cond["temperature"], cond["road_topology"], cond["hour"],
        )
    # Absolute fallback if the ml package can't be imported at all.
    return 18.0 + 165.0 * cond["traffic_density"] * cond["road_topology"] - 5.5 * cond["wind_speed"]


def make_reading(spot: dict, pm25: float, cond: dict) -> dict:
    pm25 = round(max(pm25, 5.0), 1)
    return {
        "id": spot["id"],
        "name": spot["name"],
        "lat": spot["lat"],
        "lng": spot["lng"],
        "pm25": pm25,
        "level": classify(pm25),
        "features": {
            "traffic_density": cond["traffic_density"],
            "wind_speed": cond["wind_speed"],
            "temperature": cond["temperature"],
            "road_topology": cond["road_topology"],
        },
    }


def optimized_value(base: float, hours: int) -> float:
    """First-paint optimized estimate: peaks early then decays toward ~70% baseline."""
    target = base * 0.7
    decay = math.exp(-0.45 * hours)
    return target + (base - target) * decay + random.uniform(-2, 2)


def build():
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    timestamps = []
    now_pm25: dict[str, float] = {}

    for hours in TIME_OFFSETS:
        ts = now + timedelta(hours=hours)
        label = "Now" if hours == 0 else f"+{hours}h"

        standard, optimized = [], []
        for spot in HOTSPOTS:
            cond = conditions(spot, hours)
            pm25 = predict_pm25(cond)
            reading = make_reading(spot, pm25, cond)
            standard.append(reading)

            if hours == 0:
                now_pm25[spot["id"]] = reading["pm25"]
                optimized.append(dict(reading))
            else:
                opt = optimized_value(now_pm25[spot["id"]], hours)
                optimized.append(make_reading(spot, opt, cond))

        timestamps.append({
            "label": label,
            "offset_hours": hours,
            "iso_time": ts.isoformat(),
            "scenarios": {"standard": standard, "optimized": optimized},
        })

    peak_standard = max(r["pm25"] for t in timestamps for r in t["scenarios"]["standard"])
    peak_optimized = max(r["pm25"] for t in timestamps for r in t["scenarios"]["optimized"])

    return {
        "city": CITY,
        "generated_at": now.isoformat(),
        "center": {"lat": CITY_CENTER[0], "lng": CITY_CENTER[1]},
        "forecast_source": MODEL_SOURCE,
        "timestamps": timestamps,
        "stats": {
            "predicted_peak_standard": round(peak_standard, 1),
            "predicted_peak_optimized": round(peak_optimized, 1),
            "reduction_pct": round((peak_standard - peak_optimized) / peak_standard * 100, 1),
            "cars_diverted": 4200,
            "sensors_online": len(HOTSPOTS),
        },
    }


def main():
    out_dir = ROOT / "backend" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "mock_data.json"

    data = build()
    out_path.write_text(json.dumps(data, indent=2))
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")
    print(f"  Forecast source: {MODEL_SOURCE}")
    print(f"  Peak (standard):  {data['stats']['predicted_peak_standard']} µg/m³")
    print(f"  Peak (optimized): {data['stats']['predicted_peak_optimized']} µg/m³")
    print(f"  Reduction:        {data['stats']['reduction_pct']}%")


if __name__ == "__main__":
    main()
