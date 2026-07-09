"use client";

import { Activity, Car, TrendingDown, Radio, FileText, Loader2 } from "lucide-react";
import type { CityStats, Hotspot } from "@/lib/types";
import { LEVEL_COLORS } from "@/lib/api";

interface AnalyticsPanelProps {
  stats: CityStats;
  hotspots: Hotspot[];
  optimized: boolean;
  onGenerateReport: () => void;
  reportLoading: boolean;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-edge bg-panel/70 p-3">
      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-500">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPanel({
  stats,
  hotspots,
  optimized,
  onGenerateReport,
  reportLoading,
}: AnalyticsPanelProps) {
  const peak = optimized
    ? stats.predicted_peak_optimized
    : stats.predicted_peak_standard;

  const ranked = [...hotspots].sort((a, b) => b.pm25 - a.pm25).slice(0, 5);

  return (
    <aside className="flex h-full w-80 flex-col gap-4 overflow-y-auto border-l border-edge bg-surface/60 p-4 backdrop-blur">
      <div>
        <h2 className="text-sm font-semibold text-gray-200">Live Analytics</h2>
        <p className="text-[11px] text-gray-500">
          Scenario: {optimized ? "AI Optimized" : "Standard Traffic"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Activity size={13} />}
          label="Predicted Peak"
          value={`${peak}`}
          sub="µg/m³ PM2.5"
          accent={optimized ? LEVEL_COLORS.moderate : LEVEL_COLORS.critical}
        />
        <StatCard
          icon={<TrendingDown size={13} />}
          label="Reduction"
          value={`${stats.reduction_pct}%`}
          sub="peak vs. standard"
          accent={LEVEL_COLORS.good}
        />
        <StatCard
          icon={<Car size={13} />}
          label="Cars Diverted"
          value={stats.cars_diverted.toLocaleString()}
          sub="proactively re-routed"
        />
        <StatCard
          icon={<Radio size={13} />}
          label="Sensors"
          value={`${stats.sensors_online}`}
          sub="online"
          accent={LEVEL_COLORS.good}
        />
      </div>

      {/* Hotspot ranking */}
      <div>
        <h3 className="mb-2 text-xs font-semibold text-gray-400">
          Highest-risk zones
        </h3>
        <div className="flex flex-col gap-2">
          {ranked.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between rounded-lg border border-edge bg-panel/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: LEVEL_COLORS[h.level] }}
                />
                <span className="text-xs text-gray-300">{h.name}</span>
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: LEVEL_COLORS[h.level] }}
              >
                {h.pm25}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onGenerateReport}
        disabled={reportLoading}
        className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-panel transition hover:bg-sky-300 disabled:opacity-60"
      >
        {reportLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <FileText size={16} />
            Generate Mayor&apos;s Report
          </>
        )}
      </button>
    </aside>
  );
}
