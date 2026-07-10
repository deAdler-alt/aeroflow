"""
AeroFlow AI — "digital twin" pollution simulator.

Shared ground-truth physics used to (a) synthesise a labelled training set for the
Random Forest and (b) build feature vectors at inference time. Keeping the feature
order in ONE place guarantees training and prediction stay consistent.

The target relationship is physically motivated:

    PM2.5 = background
          + EMISSION_GAIN * traffic_density * road_topology   # emissions, trapped by street canyons
          - WIND_GAIN     * wind_speed                        # dispersion clears the air
          + inversion effect (cool air + late hours trap particulates)
          + noise
"""

import math

# Canonical feature order — used everywhere the model is trained or queried.
FEATURES = [
    "traffic_density",   # 0..1  fraction of road capacity in use
    "wind_speed",        # m/s   0..8
    "temperature",       # deg C -5..30
    "road_topology",     # 0..1  street-canyon / trapping factor per sector
    "hour_sin",          # cyclic encoding of hour-of-day
    "hour_cos",
]

BACKGROUND = 18.0
EMISSION_GAIN = 165.0
WIND_GAIN = 5.5
INVERSION_GAIN = 14.0


def hour_encoding(hour: float) -> tuple[float, float]:
    """Cyclic (sin, cos) encoding so 23:00 and 00:00 sit next to each other."""
    rad = 2.0 * math.pi * (hour % 24) / 24.0
    return math.sin(rad), math.cos(rad)


def true_pm25(
    traffic_density: float,
    wind_speed: float,
    temperature: float,
    road_topology: float,
    hour: float,
    noise: float = 0.0,
) -> float:
    """Ground-truth PM2.5 for a set of conditions (the 'twin' the RF learns to mimic)."""
    # Nocturnal / cold-air temperature inversion traps particulates near ground.
    night = 1.0 if (hour >= 19 or hour <= 6) else 0.0
    inversion = INVERSION_GAIN * night * max(0.0, (10.0 - temperature) / 15.0)

    pm25 = (
        BACKGROUND
        + EMISSION_GAIN * traffic_density * road_topology
        - WIND_GAIN * wind_speed
        + inversion
        + noise
    )
    return float(min(max(pm25, 5.0), 220.0))


def feature_vector(
    traffic_density: float,
    wind_speed: float,
    temperature: float,
    road_topology: float,
    hour: float,
) -> list[float]:
    """Build a model input row in the canonical FEATURES order."""
    hs, hc = hour_encoding(hour)
    return [traffic_density, wind_speed, temperature, road_topology, hs, hc]
