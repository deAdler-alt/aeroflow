"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Loader2 } from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Controls from "@/components/Controls";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import ReportModal from "@/components/ReportModal";
import AlertBanner from "@/components/AlertBanner";
import {
  fetchCityData,
  fetchModelInfo,
  generateReport,
  optimizeTraffic,
} from "@/lib/api";
import type {
  CityData,
  CityStats,
  ModelInfo,
  OptimizeResponse,
  ReportResponse,
  TimestampFrame,
} from "@/lib/types";

// Leaflet touches `window`, so the map must be client-only (no SSR).
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-gray-500">
      <Loader2 className="mr-2 animate-spin" /> Loading map…
    </div>
  ),
});

export default function DashboardPage() {
  const [data, setData] = useState<CityData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  const [frameIndex, setFrameIndex] = useState(0);
  const [optimized, setOptimized] = useState(false);

  // Diversion strength (%) — the real input to the backend traffic model.
  const [diversionPct, setDiversionPct] = useState(60);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResponse | null>(
    null
  );
  const [optimizeLoading, setOptimizeLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    fetchCityData()
      .then(setData)
      .catch((e) => setLoadError(e.message));
    fetchModelInfo()
      .then(setModelInfo)
      .catch(() => {});
  }, []);

  // Run the traffic model whenever the diversion slider moves (debounced),
  // so the optimized scenario is a live computation, not a pre-baked lookup.
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setOptimizeLoading(true);
    const t = setTimeout(() => {
      optimizeTraffic(diversionPct)
        .then((res) => {
          if (!cancelled) setOptimizeResult(res);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setOptimizeLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [data, diversionPct]);

  // Merge the model's optimized readings into the frames the UI renders.
  const effectiveFrames: TimestampFrame[] = useMemo(() => {
    if (!data) return [];
    if (!optimizeResult) return data.timestamps;
    const byOffset = new Map(
      optimizeResult.frames.map((f) => [f.offset_hours, f.hotspots])
    );
    return data.timestamps.map((frame) => ({
      ...frame,
      scenarios: {
        standard: frame.scenarios.standard,
        optimized: byOffset.get(frame.offset_hours) ?? frame.scenarios.optimized,
      },
    }));
  }, [data, optimizeResult]);

  // Headline stats reflect the current diversion level when optimizing.
  const effectiveStats: CityStats | null = useMemo(() => {
    if (!data) return null;
    if (!optimizeResult) return data.stats;
    return {
      ...data.stats,
      predicted_peak_optimized: optimizeResult.predicted_peak_optimized,
      reduction_pct: optimizeResult.reduction_pct,
      cars_diverted: optimizeResult.cars_diverted,
    };
  }, [data, optimizeResult]);

  const activeHotspots = useMemo(() => {
    if (!effectiveFrames.length) return [];
    const frame = effectiveFrames[frameIndex];
    return optimized ? frame.scenarios.optimized : frame.scenarios.standard;
  }, [effectiveFrames, frameIndex, optimized]);

  async function handleGenerateReport() {
    if (!data || !effectiveStats) return;
    setModalOpen(true);
    setReportLoading(true);
    setReport(null);
    setReportError(null);
    try {
      const res = await generateReport(
        data.city,
        effectiveStats,
        activeHotspots,
        diversionPct
      );
      setReport(res);
    } catch (e) {
      setReportError((e as Error).message);
    } finally {
      setReportLoading(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-panel">
        <div className="max-w-md rounded-xl border border-critical/40 bg-critical/10 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 text-critical" />
          <p className="font-semibold text-critical">Could not load data</p>
          <p className="mt-1 text-sm text-gray-400">{loadError}</p>
          <p className="mt-3 text-xs text-gray-500">
            Start the backend and run{" "}
            <code className="text-accent">python generate_mock_data.py</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-panel text-gray-400">
        <Loader2 className="mr-2 animate-spin" /> Initializing command center…
      </div>
    );
  }

  const activeFrame = effectiveFrames[frameIndex];

  return (
    <div className="flex h-screen overflow-hidden bg-panel">
      <Sidebar />

      {/* Map area */}
      <main className="relative flex-1">
        {/* Top status bar + proactive alert */}
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-[1000] flex items-start gap-3">
          <div className="pointer-events-auto rounded-xl border border-edge bg-surface/90 px-4 py-2 backdrop-blur">
            <p className="text-sm font-semibold">{data.city} · Air Quality</p>
            <p className="text-[11px] text-gray-500">
              Frame: {activeFrame.label} ·{" "}
              {optimized ? "AI Optimized" : "Standard Traffic"}
            </p>
          </div>
          <AlertBanner frames={effectiveFrames} optimized={optimized} />
        </div>

        <MapView center={data.center} hotspots={activeHotspots} />

        <Controls
          frames={effectiveFrames}
          activeIndex={frameIndex}
          onIndexChange={setFrameIndex}
          optimized={optimized}
          onToggleOptimized={setOptimized}
          diversionPct={diversionPct}
          onDiversionChange={setDiversionPct}
          optimizeLoading={optimizeLoading}
        />
      </main>

      <AnalyticsPanel
        stats={effectiveStats ?? data.stats}
        hotspots={activeHotspots}
        optimized={optimized}
        frames={effectiveFrames}
        activeIndex={frameIndex}
        modelInfo={modelInfo}
        onGenerateReport={handleGenerateReport}
        reportLoading={reportLoading}
      />

      <ReportModal
        open={modalOpen}
        loading={reportLoading}
        report={report}
        error={reportError}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
