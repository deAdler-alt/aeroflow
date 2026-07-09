# Context
I am participating in a hackathon to build "AeroFlow AI" - a proactive smart city dashboard that predicts local PM2.5 pollution spikes and simulates optimizing traffic lights to prevent smog accumulation. 
You are an expert Full-Stack Senior Developer. I need you to generate the code for an MVP.

# Tech Stack
- Frontend: Next.js (App Router), Tailwind CSS, React-Leaflet (for maps - 100% free), Lucide React (icons).
- Backend: Python with FastAPI.
- AI Integration: Groq API (`groq` python client) using `llama3-8b-8192` or `llama3-70b-8192` model for generating a "Mayor's Report".
- Data: Mocked JSON/GeoJSON files generated via a Python script (no external databases to save time).

# Requirements & Features

## 1. Mock Data Generator (Python)
Create a Python script (`generate_mock_data.py`) that generates a JSON file containing simulated data for a city (e.g., Warsaw or any generic city). The data must include:
- Time series data (current time, +2h, +4h, +6h).
- For each timestamp, a list of "hotspots" (coordinates) with PM2.5 levels.
- Two scenarios for future timestamps: "Standard Traffic" (PM2.5 increases over time) and "Optimized Traffic" (PM2.5 decreases or stabilizes).

## 2. FastAPI Backend (`backend/main.py`)
- Endpoint `GET /api/data`: Returns the mocked time-series data.
- Endpoint `POST /api/generate-report`: Takes the current pollution data as input, calls the Groq API, and returns a short, professional text report for the City Mayor explaining the predicted threat and how the AI mitigated it by re-routing traffic. Use a generic prompt for Groq to format this as a formal alert.

## 3. Next.js Frontend Dashboard (`frontend/`)
The UI should be a dark-mode, sleek command center.
- **Sidebar:** Fake user profile ("City Admin"), Navigation links (Dashboard, Reports, Settings - non-functional except Dashboard).
- **Main View (Map Area):** Integrate React-Leaflet displaying a dark-themed OpenStreetMap tile layer (e.g., CartoDB Dark Matter). 
- **Heatmap/Markers:** Display pollution hotspots as glowing circles on the map. Color code them (Green = Good, Yellow = Moderate, Red = Critical).
- **Controls (Bottom/Overlay):**
  - **Time Slider:** A slider to jump between Now, +2h, +4h, +6h. Moving the slider updates the pollution markers on the map based on the backend data.
  - **"Optimize Traffic" Toggle:** A large, prominent switch/button. When activated, the map data switches to the "Optimized Traffic" scenario, showing the red spots shrinking/turning yellow for future timestamps.
- **Side Panel (Analytics):**
  - Simple charts or stats (e.g., "Predicted PM2.5 Peak: 145 µg/m³", "Estimated Cars Diverted: 4,200").
  - **"Generate Mayor's Report" Button:** On click, calls the FastAPI `/generate-report` endpoint, shows a loading state, and then displays the Groq-generated text in a modal.

# Rules for the LLM
1. Generate the complete file structure first.
2. Provide fully working code for `generate_mock_data.py`, `main.py`, and the core Next.js page/components.
3. Keep the code as simple as possible for a hackathon demo. Use placeholder coordinates for the map.
4. Do not use Mapbox or Google Maps (they require API keys). Use `react-leaflet` with free tiles.
5. Use placeholder text `<GROQ_API_KEY>` in the backend where needed.
6. Skip standard authentication, just hardcode the UI to look logged in.
7. Do not explain standard Next.js setup boilerplate, focus only on the custom components, map integration, and FastAPI logic. Let's build!