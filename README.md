# AeroFlow AI

A proactive smart-city command center that **predicts local PM2.5 pollution spikes** and
simulates **optimizing traffic** to prevent smog accumulation.

- **Predict** — mocked time-series air-quality data across a 6-hour horizon (Now, +2h, +4h, +6h).
- **Simulate** — toggle "Optimize Traffic" to switch between the *Standard* and *AI-Optimized* scenarios and watch critical (red) hotspots shrink and cool.
- **Explain** — one click generates a formal *Mayor's Report* via the Groq LLM.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | Next.js (App Router) · Tailwind CSS · React-Leaflet (CartoDB Dark Matter tiles) · Lucide icons |
| Backend  | Python · FastAPI |
| AI       | Groq API (`llama3-70b-8192`) |
| Data     | Mocked JSON (no database) |

## Project structure

```
aeroflow/
├─ generate_mock_data.py      # writes backend/data/mock_data.json
├─ backend/
│  ├─ main.py                 # FastAPI: /api/data + /api/generate-report
│  ├─ requirements.txt
│  └─ data/mock_data.json     # generated
└─ frontend/
   ├─ app/                    # layout, page (dashboard), globals.css
   ├─ components/             # Sidebar, MapView, Controls, AnalyticsPanel, ReportModal
   └─ lib/                    # api client + types
```

## Run it

### 1. Generate mock data
```bash
python generate_mock_data.py
```

### 2. Backend (port 8000)
```bash
cd backend
pip install -r requirements.txt
# optional — enable live AI (otherwise a built-in fallback report is used):
export GROQ_API_KEY="your_key_here"
uvicorn main:app --reload --port 8000
```

### 3. Frontend (port 3000)
```bash
cd frontend
npm install
cp .env.local.example .env.local   # optional
npm run dev
```

Open http://localhost:3000.

## Notes
- The report endpoint **degrades gracefully**: without a valid `GROQ_API_KEY`, it returns a
  well-formatted deterministic fallback so the demo never breaks.
- No auth — the UI is hardcoded as logged-in ("City Admin").
- Map uses free CartoDB Dark Matter tiles — **no API keys required**.
