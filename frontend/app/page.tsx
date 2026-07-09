"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Loader2 } from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Controls from "@/components/Controls";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import ReportModal from "@/components/ReportModal";
import { fetchCityData, generateReport } from "@/lib/api";
import type { CityData, ReportResponse } from "@/lib/types";

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

  const [frameIndex, setFrameIndex] = useState(0);
  const [optimized, setOptimized] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    fetchCityData()
      .then(setData)
      .catch((e) => setLoadError(e.message));
  }, []);

  const activeHotspots = useMemo(() => {
    if (!data) return [];
    const frame = data.timestamps[frameIndex];
    return optimized ? frame.scenarios.optimized : frame.scenarios.standard;
  }, [data, frameIndex, optimized]);

  async function handleGenerateReport() {
    if (!data) return;
    setModalOpen(true);
    setReportLoading(true);
    setReport(null);
    setReportError(null);
    try {
      const res = await generateReport(data.city, data.stats, activeHotspots);
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

  const activeFrame = data.timestamps[frameIndex];

  return (
    <div className="flex h-screen overflow-hidden bg-panel">
      <Sidebar />

      {/* Map area */}
      <main className="relative flex-1">
        {/* Top status bar */}
        <div className="pointer-events-none absolute left-4 top-4 z-[1000] flex items-center gap-3">
          <div className="pointer-events-auto rounded-xl border border-edge bg-surface/90 px-4 py-2 backdrop-blur">
            <p className="text-sm font-semibold">{data.city} · Air Quality</p>
            <p className="text-[11px] text-gray-500">
              Frame: {activeFrame.label} ·{" "}
              {optimized ? "AI Optimized" : "Standard Traffic"}
            </p>
          </div>
        </div>

        <MapView center={data.center} hotspots={activeHotspots} />

        <Controls
          frames={data.timestamps}
          activeIndex={frameIndex}
          onIndexChange={setFrameIndex}
          optimized={optimized}
          onToggleOptimized={setOptimized}
        />
      </main>

      <AnalyticsPanel
        stats={data.stats}
        hotspots={activeHotspots}
        optimized={optimized}
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
