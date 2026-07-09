"""
AeroFlow AI - Mock Data Generator

Generates a JSON file with simulated PM2.5 pollution data for a city over a
short time horizon (Now, +2h, +4h, +6h). For each timestamp we provide two
scenarios:

  - "standard"  : business-as-usual traffic -> pollution accumulates over time
  - "optimized" : AI re-routes traffic       -> pollution stabilizes / drops

Run:
    python generate_mock_data.py

Output:
    backend/data/mock_data.json
"""

import json
import math
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)  # deterministic output for a reliable demo

CITY = "Warsaw"
CITY_CENTER = (52.2297, 21.0122)  # lat, lng

# Fixed set of monitoring hotspots scattered around the city center.
# Coordinates are placeholders clustered around CITY_CENTER.
HOTSPOTS = [
    {"id": "hs-1", "name": "City Center Junction", "lat": 52.2319, "lng": 21.0067},
    {"id": "hs-2", "name": "Northern Ring Road",   "lat": 52.2530, "lng": 21.0180},
    {"id": "hs-3", "name": "Industrial District",  "lat": 52.2100, "lng": 20.9800},
    {"id": "hs-4", "name": "Eastern Bridge",       "lat": 52.2450, "lng": 21.0450},
    {"id": "hs-5", "name": "Old Town Square",       "lat": 52.2500, "lng": 21.0120},
    {"id": "hs-6", "name": "Southern Highway Hub",  "lat": 52.1950, "lng": 21.0300},
    {"id": "hs-7", "name": "Western Rail Yard",     "lat": 52.2280, "lng": 20.9600},
    {"id": "hs-8", "name": "Airport Approach",      "lat": 52.1720, "lng": 20.9670},
]

# Baseline PM2.5 (µg/m^3) "right now" per hotspot. Some spots start hot.
BASELINE = {
    "hs-1": 68,
    "hs-2": 42,
    "hs-3": 95,
    "hs-4": 55,
    "hs-5": 38,
    "hs-6": 88,
    "hs-7": 60,
    "hs-8": 30,
}

TIME_OFFSETS = [0, 2, 4, 6]  # hours from "now"


def classify(pm25: float) -> str:
    """WHO-inspired buckets used for map colour-coding."""
    if pm25 <= 45:
        return "good"
    if pm25 <= 90:
        return "moderate"
    return "critical"


def make_reading(spot: dict, pm25: float) -> dict:
    pm25 = round(max(pm25, 5.0), 1)
    return {
        "id": spot["id"],
        "name": spot["name"],
        "lat": spot["lat"],
        "lng": spot["lng"],
        "pm25": pm25,
        "level": classify(pm25),
    }


def standard_value(base: float, hours: int) -> float:
    """Business-as-usual: pollution accumulates roughly linearly + noise."""
    growth = base * (0.14 * hours)          # ~14% of baseline per hour
    noise = random.uniform(-3, 6)
    return base + growth + noise


def optimized_value(base: float, hours: int) -> float:
    """AI-optimized traffic: peaks early then decays back below baseline."""
    # Small initial bump (system reacts), then exponential decay toward ~70% base.
    target = base * 0.7
    decay = math.exp(-0.45 * hours)
    value = target + (base - target) * decay
    noise = random.uniform(-2, 2)
    return value + noise


def build():
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    timestamps = []

    for hours in TIME_OFFSETS:
        ts = now + timedelta(hours=hours)
        label = "Now" if hours == 0 else f"+{hours}h"

        standard, optimized = [], []
        for spot in HOTSPOTS:
            base = BASELINE[spot["id"]]
            if hours == 0:
                # both scenarios identical at t=0
                reading = make_reading(spot, base)
                standard.append(reading)
                optimized.append(dict(reading))
            else:
                standard.append(make_reading(spot, standard_value(base, hours)))
                optimized.append(make_reading(spot, optimized_value(base, hours)))

        timestamps.append({
            "label": label,
            "offset_hours": hours,
            "iso_time": ts.isoformat(),
            "scenarios": {
                "standard": standard,
                "optimized": optimized,
            },
        })

    # Derived headline stats for the analytics panel.
    peak_standard = max(
        r["pm25"] for t in timestamps for r in t["scenarios"]["standard"]
    )
    peak_optimized = max(
        r["pm25"] for t in timestamps for r in t["scenarios"]["optimized"]
    )

    return {
        "city": CITY,
        "generated_at": now.isoformat(),
        "center": {"lat": CITY_CENTER[0], "lng": CITY_CENTER[1]},
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
    out_dir = Path(__file__).parent / "backend" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "mock_data.json"

    data = build()
    out_path.write_text(json.dumps(data, indent=2))
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")
    print(f"  Peak (standard):  {data['stats']['predicted_peak_standard']} µg/m³")
    print(f"  Peak (optimized): {data['stats']['predicted_peak_optimized']} µg/m³")
    print(f"  Reduction:        {data['stats']['reduction_pct']}%")


if __name__ == "__main__":
    main()
