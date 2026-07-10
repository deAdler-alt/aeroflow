"use client";

import type { TimestampFrame } from "@/lib/types";
import { LEVEL_COLORS } from "@/lib/api";

interface TrendChartProps {
  frames: TimestampFrame[];
  activeIndex: number;
  /** Which scenario is currently shown on the map (for the emphasized line). */
  optimized: boolean;
}

const CRITICAL_THRESHOLD = 90; // µg/m³ — matches classify() in the backend

// Peak PM2.5 across all hotspots in a frame for a given scenario.
function peak(frame: TimestampFrame, scenario: "standard" | "optimized"): number {
  return Math.max(...frame.scenarios[scenario].map((h) => h.pm25));
}

export default function TrendChart({
  frames,
  activeIndex,
  optimized,
}: TrendChartProps) {
  // Geometry (viewBox units).
  const W = 300;
  const H = 130;
  const PAD_L = 30;
  const PAD_R = 10;
  const PAD_T = 12;
  const PAD_B = 22;

  const standard = frames.map((f) => peak(f, "standard"));
  const optimizedVals = frames.map((f) => peak(f, "optimized"));
  const yMax = Math.max(...standard, CRITICAL_THRESHOLD) * 1.1;

  const x = (i: number) =>
    PAD_L + (i / (frames.length - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) =>
    PAD_T + (1 - v / yMax) * (H - PAD_T - PAD_B);

  const toPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

  const thresholdY = y(CRITICAL_THRESHOLD);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400">
          Peak PM2.5 forecast
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-[2px] w-3"
              style={{ backgroundColor: LEVEL_COLORS.critical }}
            />
            Standard
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-[2px] w-3"
              style={{ backgroundColor: LEVEL_COLORS.good }}
            />
            Optimized
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="PM2.5 peak forecast over time"
      >
        {/* Critical threshold line */}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={thresholdY}
          y2={thresholdY}
          stroke={LEVEL_COLORS.critical}
          strokeOpacity={0.4}
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <text
          x={PAD_L}
          y={thresholdY - 3}
          fill={LEVEL_COLORS.critical}
          fillOpacity={0.7}
          fontSize={7}
        >
          critical ({CRITICAL_THRESHOLD})
        </text>

        {/* Y axis min/max labels */}
        <text x={4} y={PAD_T + 4} fill="#6b7280" fontSize={7}>
          {Math.round(yMax)}
        </text>
        <text x={4} y={H - PAD_B} fill="#6b7280" fontSize={7}>
          0
        </text>

        {/* Standard line (solid, red) */}
        <path
          d={toPath(standard)}
          fill="none"
          stroke={LEVEL_COLORS.critical}
          strokeWidth={optimized ? 1.5 : 2.5}
          strokeOpacity={optimized ? 0.55 : 1}
        />
        {/* Optimized line (dashed so it reads without relying on colour alone) */}
        <path
          d={toPath(optimizedVals)}
          fill="none"
          stroke={LEVEL_COLORS.good}
          strokeWidth={optimized ? 2.5 : 1.5}
          strokeOpacity={optimized ? 1 : 0.55}
          strokeDasharray="5 3"
        />

        {/* Points + active-frame highlight */}
        {frames.map((f, i) => (
          <g key={f.label}>
            {i === activeIndex && (
              <line
                x1={x(i)}
                x2={x(i)}
                y1={PAD_T}
                y2={H - PAD_B}
                stroke="#38bdf8"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
            )}
            <circle cx={x(i)} cy={y(standard[i])} r={2} fill={LEVEL_COLORS.critical} />
            <circle cx={x(i)} cy={y(optimizedVals[i])} r={2} fill={LEVEL_COLORS.good} />
            <text
              x={x(i)}
              y={H - 6}
              fill={i === activeIndex ? "#38bdf8" : "#6b7280"}
              fontSize={7}
              textAnchor="middle"
              fontWeight={i === activeIndex ? 700 : 400}
            >
              {f.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
