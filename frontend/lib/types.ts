export type PollutionLevel = "good" | "moderate" | "critical";

export interface Hotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  pm25: number;
  level: PollutionLevel;
}

export interface TimestampFrame {
  label: string;
  offset_hours: number;
  iso_time: string;
  scenarios: {
    standard: Hotspot[];
    optimized: Hotspot[];
  };
}

export interface CityStats {
  predicted_peak_standard: number;
  predicted_peak_optimized: number;
  reduction_pct: number;
  cars_diverted: number;
  sensors_online: number;
}

export interface CityData {
  city: string;
  generated_at: string;
  center: { lat: number; lng: number };
  timestamps: TimestampFrame[];
  stats: CityStats;
}

export interface ReportResponse {
  report: string;
  model: string;
  source: string;
}
