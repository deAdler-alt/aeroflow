"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { TimestampFrame } from "@/lib/types";

const CRITICAL_THRESHOLD = 90; // µg/m³

interface Breach {
  frame: TimestampFrame;
  count: number;
}

/** Earliest frame whose scenario has any hotspot above the critical threshold. */
function firstBreach(
  frames: TimestampFrame[],
  scenario: "standard" | "optimized"
): Breach | null {
  for (const frame of frames) {
    const critical = frame.scenarios[scenario].filter(
      (h) => h.pm25 > CRITICAL_THRESHOLD
    );
    if (critical.length > 0) return { frame, count: critical.length };
  }
  return null;
}

interface AlertBannerProps {
  frames: TimestampFrame[];
  optimized: boolean;
}

export default function AlertBanner({ frames, optimized }: AlertBannerProps) {
  const standardBreach = firstBreach(frames, "standard");
  const optimizedBreach = firstBreach(frames, "optimized");

  // Nothing critical in either scenario — no alert needed.
  if (!standardBreach && !optimizedBreach) return null;

  const active = optimized ? optimizedBreach : standardBreach;

  // AI optimization contains the threat entirely.
  if (optimized && !optimizedBreach) {
    return (
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-400/15 px-4 py-2 text-emerald-300 shadow-glow">
        <ShieldCheck size={18} />
        <div className="leading-tight">
          <p className="text-sm font-semibold">Threat contained</p>
          <p className="text-[11px] text-emerald-300/80">
            AI optimization holds every zone below the critical threshold.
          </p>
        </div>
      </div>
    );
  }

  if (!active) return null;

  const preventable = !optimized && !optimizedBreach;

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-critical/60 bg-critical/15 px-4 py-2 text-red-200 shadow-lg">
      <AlertTriangle size={18} className="animate-pulse text-critical" />
      <div className="leading-tight">
        <p className="text-sm font-semibold">
          Critical smog predicted at {active.frame.label}
        </p>
        <p className="text-[11px] text-red-200/80">
          {active.count} zone{active.count > 1 ? "s" : ""} projected above{" "}
          {CRITICAL_THRESHOLD} µg/m³
          {preventable && " · enable Optimize Traffic to prevent it"}
        </p>
      </div>
    </div>
  );
}
