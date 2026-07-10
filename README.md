# 🌬️ AeroFlow AI

> **Smart cities shouldn't just be fast — they must be breathable.**

A proactive smart-city command center that **predicts local PM2.5 pollution spikes up to
6 hours ahead** with a **Machine-Learning model**, and simulates **re-routing traffic** to
prevent smog from accumulating — turning cities from passive observers of pollution into
active protectors of public health.

**SmartAIthon 2026 — Round 1**
Team **AeroFlow AI** · Rzeszów University of Technology
Kamil (Lead) · Dominika · Joanna

---

## The problem

Vehicles idling in stop-and-go traffic emit **up to 20× more pollutants** than those moving
smoothly, and urban traffic drives **30–50% of PM2.5 and NOx emissions**. Yet today's
Intelligent Transport Systems optimise only for *vehicle throughput* — they ignore air
quality until a smog alert has already been triggered. Management is **reactive, not
preventive.**

AeroFlow closes that gap: it forecasts *where and when* pollution will breach safe limits,
then simulates a traffic-redistribution plan that keeps the air below the critical
threshold **before** the smog forms.

---

## The loop (predict → optimise → explain)

| Stage | What happens | Where |
|-------|--------------|-------|
| **1. Predict** | A **Random Forest** predicts PM2.5 per city sector from traffic density, road topology, wind, temperature and time-of-day, across the forecast horizon (Now, +2h, +4h, +6h). | `backend/ml/` + `POST /api/data` |
| **2. Optimise** | Diverting traffic lowers each sector's `traffic_density` and the **same model re-predicts** PM2.5 — driven live by the *Optimize Traffic* control. | `POST /api/optimize` |
| **3. Explain** | A Generative-AI **Mayor's Report** is written by an LLM, quoting the exact diversion level, peak reduction, and cars re-routed. | `POST /api/generate-report` (Groq) |

Move the **diversion slider** and the map markers, the forecast chart, the headline stats,
the proactive alert **and** the AI report all recompute together.

---

## The prediction engine (Random Forest)

We have no real sensor archive, so we **bootstrap** one: a physically-motivated digital-twin
simulator generates 6,000 labelled samples (features → PM2.5) across randomised traffic and
weather conditions, and a `RandomForestRegressor` (scikit-learn, 200 trees) learns the
relationship. The **same trained model powers both the forecast and the optimisation.**

**Held-out test performance:**

| Metric | Value |
|--------|-------|
| R² | **0.966** |
| MAE | **5.17 µg/m³** |

**Learned feature importances** (what actually drives the prediction):

| Feature | Importance |
|---------|-----------|
| Traffic density | 53% |
| Road topology (street-canyon trapping) | 35% |
| Wind speed | 10% |
| Temperature / time-of-day | ~2% |

Diverting traffic (the *Optimize* control) reduces the `traffic_density` feature, and the
model re-predicts a lower peak — e.g. 0% → 162 µg/m³, 40% → 100 µg/m³, 70% → 52 µg/m³.

> The model is served live: `GET /api/model-info` returns these metrics, and the dashboard
> renders them in a **Prediction Engine** card.

---

## What's working in this MVP

- ✅ **Real ML prediction engine** — Random Forest (R² 0.966), served live and visualised.
- ✅ **Interactive dark-mode command center** (map + analytics side panel + controls).
- ✅ **Live pollution map** — glowing colour-coded hotspots (green / yellow / red) on
  CartoDB Dark Matter tiles (OpenStreetMap data, **no API keys**).
- ✅ **Forecast time slider** — Now / +2h / +4h / +6h.
- ✅ **Optimize Traffic** — a live model re-prediction with a **0–80% diversion slider**;
  markers cool and shrink as traffic is re-routed.
- ✅ **PM2.5 forecast chart** — Standard vs Optimized peak, with the critical threshold line.
- ✅ **Proactive alert banner** — detects the earliest hour a zone is predicted to breach
  90 µg/m³ and whether optimisation prevents it.
- ✅ **AI Mayor's Report** — live Groq (`llama-3.3-70b-versatile`) with a deterministic
  offline fallback so the demo never breaks.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) · Tailwind CSS · React-Leaflet · Lucide icons |
| Maps | CartoDB Dark Matter tiles (OpenStreetMap) — free, keyless |
| Backend | Python · FastAPI |
| Machine Learning | scikit-learn — `RandomForestRegressor` for PM2.5 prediction |
| Generative AI | Groq API · Llama 3.3 70B (`llama-3.3-70b-versatile`) |
| Data | Mocked JSON + digital-twin simulator — no database, for a fast MVP |

---

## Project structure

```
aeroflow/
├─ generate_mock_data.py         # RF-powered forecast → backend/data/mock_data.json
├─ backend/
│  ├─ main.py                     # FastAPI: /api/data, /api/optimize,
│  │                              #   /api/model-info, /api/generate-report
│  ├─ ml/
│  │  ├─ simulator.py             # digital-twin physics + feature definitions
│  │  ├─ train_model.py           # trains the Random Forest
│  │  ├─ pm25_model.pkl           # trained model (generated)
│  │  └─ model_meta.json          # metrics + feature importances (generated)
│  ├─ requirements.txt
│  ├─ .env.example                # copy → .env, add your Groq key
│  └─ data/mock_data.json         # generated
└─ frontend/
   ├─ app/                        # layout, page (dashboard), globals.css
   ├─ components/                 # Sidebar, MapView, Controls, TrendChart,
   │                              #   AlertBanner, ModelCard, AnalyticsPanel, ReportModal
   └─ lib/                        # api client + types
```

---

## Run it

### 1 · Backend deps
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then paste your key from https://console.groq.com/keys
```

### 2 · Train the model, then generate the forecast
```bash
python ml/train_model.py      # → pm25_model.pkl + model_meta.json
cd ..
python generate_mock_data.py  # RF-powered → backend/data/mock_data.json
```

### 3 · Start the backend (port 8000)
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 4 · Start the frontend (port 3000)
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

> **Groq key is optional** — without it the report endpoint returns a deterministic
> fallback. **The model is optional too** — if `pm25_model.pkl` is missing, the forecast and
> optimisation fall back to the analytic twin, so the app always runs.

---

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/data` | Time-series PM2.5 forecast (RF predictions + input features per sector). |
| `GET /api/model-info` | Trained-model metrics + feature importances. |
| `POST /api/optimize` | `{ "diversion_pct": 60 }` → RF re-predicts the optimised trajectory + stats. |
| `POST /api/generate-report` | Pollution summary → formal Mayor's Report via Groq. |

---

## Roadmap (Round 2)

The MVP proves the full ML → optimisation → GenAI loop end-to-end. Next:

- 📡 **Live data ingestion** — retrain the Random Forest on real city PM2.5 sensors and
  live traffic-density / weather feeds (replacing the digital-twin training set).
- 🚦 **SCADA / traffic-controller integration** — extend real "green waves" on perimeter
  roads instead of a simulated diversion percentage.
- ☁️ **Deployment** — Vercel (frontend) + Render (backend).

---

## Why it's different

- **Proactive, not reactive** — designed to *cure* city lungs before they get sick.
- **Zero new hardware** — integrates with existing sensor and traffic-controller APIs.
- **Cross-domain** — merges ecology and transportation into one actionable ML model.
- **Fast & low-cost** — a lightweight Random Forest, rapid response, keyless mapping.

---

## References

- MDPI/IEEE — *Air Quality Prediction in Smart Cities Using Machine Learning Based on Sensor Data: A Review* (2020) — https://www.mdpi.com/2076-3417/10/7/2401
- IEEE — *Traffic Light Control Using Reinforcement Learning* (2024) — https://ieeexplore.ieee.org/document/10459528
- WHO — *Global Air Quality Guidelines* (2021) — https://apps.who.int/iris/handle/10665/345329
- EEA — *Transport and Environment Reporting Mechanism (TERM)* (2020) — https://www.eea.europa.eu/en/topics/in-depth/transport-and-mobility

---

*AeroFlow AI — anticipating pollution before it settles, reclaiming urban health without sacrificing mobility.*
