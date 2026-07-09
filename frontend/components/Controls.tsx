"use client";

import { Zap, Clock } from "lucide-react";
import type { TimestampFrame } from "@/lib/types";

interface ControlsProps {
  frames: TimestampFrame[];
  activeIndex: number;
  onIndexChange: (i: number) => void;
  optimized: boolean;
  onToggleOptimized: (v: boolean) => void;
}

export default function Controls({
  frames,
  activeIndex,
  onIndexChange,
  optimized,
  onToggleOptimized,
}: ControlsProps) {
  return (
    <div className="pointer-events-auto absolute bottom-6 left-1/2 z-[1000] w-[min(720px,90%)] -translate-x-1/2 rounded-2xl border border-edge bg-surface/90 p-4 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        {/* Time slider */}
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
            <Clock size={14} />
            <span>Forecast horizon</span>
          </div>
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            step={1}
            value={activeIndex}
            onChange={(e) => onIndexChange(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="mt-1 flex justify-between text-[11px] text-gray-500">
            {frames.map((f, i) => (
              <span
                key={f.label}
                className={i === activeIndex ? "font-semibold text-accent" : ""}
              >
                {f.label}
              </span>
            ))}
          </div>
        </div>

        {/* Optimize toggle */}
        <button
          onClick={() => onToggleOptimized(!optimized)}
          className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition ${
            optimized
              ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300 shadow-glow"
              : "border-edge bg-panel text-gray-300 hover:border-accent/50"
          }`}
        >
          <Zap
            size={18}
            className={optimized ? "fill-emerald-300 text-emerald-300" : ""}
          />
          {optimized ? "AI Optimization ON" : "Optimize Traffic"}
        </button>
      </div>
    </div>
  );
}
