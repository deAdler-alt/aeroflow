"use client";

import { BrainCircuit } from "lucide-react";
import type { ModelInfo } from "@/lib/types";

const FEATURE_LABELS: Record<string, string> = {
  traffic_density: "Traffic density",
  road_topology: "Road topology",
  wind_speed: "Wind speed",
  temperature: "Temperature",
  hour_sin: "Time of day",
  hour_cos: "Time of day",
};

export default function ModelCard({ info }: { info: ModelInfo }) {
  if (!info.loaded) return null;

  // Top-3 drivers (skip the duplicate time-of-day encodings after the first).
  const seen = new Set<string>();
  const top = Object.entries(info.feature_importances ?? {})
    .filter(([k]) => {
      const label = FEATURE_LABELS[k] ?? k;
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    })
    .slice(0, 3);

  const maxImp = top.length ? top[0][1] : 1;

  return (
    <div className="rounded-xl border border-edge bg-panel/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <BrainCircuit size={14} className="text-accent" />
          Prediction Engine
        </h3>
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
          Random Forest
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-edge bg-panel/60 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Accuracy (R²)</p>
          <p className="text-sm font-bold text-emerald-400">
            {info.r2 !== undefined ? info.r2.toFixed(3) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-edge bg-panel/60 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Error (MAE)</p>
          <p className="text-sm font-bold text-gray-200">
            {info.mae !== undefined ? `${info.mae} µg/m³` : "—"}
          </p>
        </div>
      </div>

      <p className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-500">
        Top prediction drivers
      </p>
      <div className="flex flex-col gap-1.5">
        {top.map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[11px] text-gray-400">
              {FEATURE_LABELS[key] ?? key}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${(val / maxImp) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-[10px] text-gray-500">
              {Math.round(val * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
