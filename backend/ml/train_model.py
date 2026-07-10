"""
Train the AeroFlow PM2.5 prediction model (Random Forest).

We have no real sensor archive, so we bootstrap a labelled dataset from the digital-twin
simulator (`simulator.true_pm25`) over a wide, randomised range of traffic / weather /
topology conditions, then fit a RandomForestRegressor to learn that relationship.

Run:
    python backend/ml/train_model.py

Outputs:
    backend/ml/pm25_model.pkl     the trained model
    backend/ml/model_meta.json    metrics + feature importances (served at /api/model-info)
"""

import json
import random
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from simulator import FEATURES, feature_vector, true_pm25

N_SAMPLES = 6000
N_ESTIMATORS = 200
SEED = 42

HERE = Path(__file__).parent


def synth_dataset(n: int, rng: random.Random):
    X, y = [], []
    for _ in range(n):
        traffic = rng.uniform(0.05, 1.0)
        wind = rng.uniform(0.0, 8.0)
        temp = rng.uniform(-5.0, 30.0)
        topo = rng.uniform(0.2, 1.0)
        hour = rng.uniform(0.0, 24.0)
        noise = rng.gauss(0.0, 6.0)  # sensor + unmodelled variability

        X.append(feature_vector(traffic, wind, temp, topo, hour))
        y.append(true_pm25(traffic, wind, temp, topo, hour, noise))
    return np.array(X), np.array(y)


def main():
    rng = random.Random(SEED)
    X, y = synth_dataset(N_SAMPLES, rng)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED
    )

    model = RandomForestRegressor(
        n_estimators=N_ESTIMATORS,
        max_depth=None,
        min_samples_leaf=2,
        random_state=SEED,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    mae = mean_absolute_error(y_test, preds)

    importances = dict(
        sorted(
            zip(FEATURES, (round(float(v), 4) for v in model.feature_importances_)),
            key=lambda kv: kv[1],
            reverse=True,
        )
    )

    joblib.dump(model, HERE / "pm25_model.pkl")
    meta = {
        "algorithm": "RandomForestRegressor",
        "n_estimators": N_ESTIMATORS,
        "n_samples": N_SAMPLES,
        "features": FEATURES,
        "r2": round(float(r2), 4),
        "mae": round(float(mae), 2),
        "feature_importances": importances,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    (HERE / "model_meta.json").write_text(json.dumps(meta, indent=2))

    print("Trained RandomForestRegressor")
    print(f"  samples:   {N_SAMPLES}")
    print(f"  R^2 (test): {r2:.4f}")
    print(f"  MAE (test): {mae:.2f} µg/m³")
    print("  feature importances:")
    for k, v in importances.items():
        print(f"    {k:16s} {v:.3f}")


if __name__ == "__main__":
    main()
