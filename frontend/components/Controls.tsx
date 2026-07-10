"use client";

import { Zap, Clock, Car, Loader2 } from "lucide-react";
import type { TimestampFrame } from "@/lib/types";

interface ControlsProps {
  frames: TimestampFrame[];
  activeIndex: number;
  onIndexChange: (i: number) => void;
  optimized: boolean;
  onToggleOptimized: (v: boolean) => void;
  diversionPct: number;
  onDiversionChange: (v: number) => void;
  optimizeLoading: boolean;
}

export default function Controls({
  frames,
  activeIndex,
  onIndexChange,
  optimized,
  onToggleOptimized,
  diversionPct,
  onDiversionChange,
  optimizeLoading,
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

      {/* Diversion strength — the live input to the backend traffic model */}
      {optimized && (
        <div className="mt-3 border-t border-edge pt-3">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-2">
              <Car size={14} />
              Traffic diversion strength
            </span>
            <span className="flex items-center gap-2 font-semibold text-emerald-300">
              {optimizeLoading && (
                <Loader2 size={12} className="animate-spin text-accent" />
              )}
              {diversionPct}% diverted
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={diversionPct}
            onChange={(e) => onDiversionChange(Number(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <div className="mt-1 flex justify-between text-[10px] text-gray-600">
            <span>Do nothing</span>
            <span>Aggressive re-routing</span>
          </div>
        </div>
      )}
    </div>
  );
}
