import type { CityData, CityStats, Hotspot, ReportResponse } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function fetchCityData(): Promise<CityData> {
  const res = await fetch(`${API_BASE}/api/data`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load city data (${res.status})`);
  }
  return res.json();
}

export async function generateReport(
  city: string,
  stats: CityStats,
  hotspots: Hotspot[]
): Promise<ReportResponse> {
  const res = await fetch(`${API_BASE}/api/generate-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      city,
      predicted_peak_standard: stats.predicted_peak_standard,
      predicted_peak_optimized: stats.predicted_peak_optimized,
      reduction_pct: stats.reduction_pct,
      cars_diverted: stats.cars_diverted,
      hotspots: hotspots.map((h) => ({
        name: h.name,
        pm25: h.pm25,
        level: h.level,
      })),
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to generate report (${res.status})`);
  }
  return res.json();
}

export const LEVEL_COLORS: Record<string, string> = {
  good: "#22c55e",
  moderate: "#eab308",
  critical: "#ef4444",
};
