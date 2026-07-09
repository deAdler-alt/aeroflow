"use client";

import {
  LayoutDashboard,
  FileText,
  Settings,
  Wind,
  ShieldCheck,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Reports", icon: FileText, active: false },
  { label: "Settings", icon: Settings, active: false },
];

export default function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-edge bg-surface/60 backdrop-blur">
      {/* Brand */}
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent shadow-glow">
          <Wind size={20} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-wide">AeroFlow AI</p>
          <p className="text-[11px] text-gray-500">Smart City Ops</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-2 flex flex-col gap-1 px-3">
        {NAV.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            disabled={!active}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              active
                ? "bg-accent/15 text-accent"
                : "text-gray-500 hover:bg-white/5 disabled:cursor-not-allowed"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-4 py-4">
        {/* Fake logged-in user */}
        <div className="flex items-center gap-3 rounded-xl border border-edge bg-panel/70 px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-emerald-400 text-sm font-bold text-panel">
            CA
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium">City Admin</p>
            <p className="flex items-center gap-1 text-[11px] text-emerald-400">
              <ShieldCheck size={12} /> Authorized
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
