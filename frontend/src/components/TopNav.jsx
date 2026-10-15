import React, { useState } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  Sparkles,
  Shield,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  ExternalLink,
  RefreshCw,
  User
} from "lucide-react";
import { BRAND, DEMO_PRESETS, NAVIGATION_ITEMS } from "../utils/constants";

export default function TopNav({
  activePage,
  setActivePage,
  setIsMobileOpen,
  backendOnline,
  onSelectPreset,
}) {
  const [showPresets, setShowPresets] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const currentPage = NAVIGATION_ITEMS.find((item) => item.id === activePage) || NAVIGATION_ITEMS[0];

  const recentNotifications = [
    { id: 1, title: "Critical Reverse-Debit Blocked", time: "2m ago", level: "CRITICAL" },
    { id: 2, title: "QR Sticker Mismatch Detected (BTM)", time: "14m ago", level: "HIGH" },
    { id: 3, title: "High-Entropy Phishing URL Flagged", time: "32m ago", level: "MEDIUM" },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#070b16]/80 backdrop-blur-xl border-b border-white/[0.08] px-4 lg:px-8 py-3.5 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center space-x-3.5">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-heading text-lg lg:text-xl font-bold text-white tracking-tight">
              {currentPage.label}
            </h1>
            {currentPage.highlight && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-full">
                Core Innovation
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            {BRAND.name} <span className="text-cyan-400/80 mx-1">•</span> <span className="italic">{BRAND.tagline}</span>
          </p>
        </div>
      </div>

      {/* Right: Presets, Live Status, Notifications, Profile */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Judge Demo Presets Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/15 to-teal-500/15 hover:from-cyan-500/25 hover:to-teal-500/25 text-cyan-200 border border-cyan-500/35 text-xs font-semibold shadow-cyan-glow transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span className="hidden md:inline">Demo Scenarios</span>
            <span className="md:hidden">Demos</span>
            <ChevronDown className="w-3 h-3 text-cyan-400" />
          </button>

          {showPresets && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPresets(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0c1224] border border-cyan-500/30 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-white/[0.07] flex items-center justify-between">
                  <span className="text-xs font-heading font-semibold text-white">
                    CyberCup 6.0 Evaluation Scenarios
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">1-Click Run</span>
                </div>
                <div className="max-h-80 overflow-y-auto py-1 space-y-1">
                  {DEMO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelectPreset(preset);
                        setShowPresets(false);
                      }}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors border border-transparent hover:border-cyan-500/20 group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {preset.title}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                          {preset.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Backend Heartbeat Indicator */}
        <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.07] text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              backendOnline ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400"
            }`}
          />
          <span className="font-mono text-[11px] text-slate-300">
            {backendOnline ? "Model API: 8000" : "Offline Simulation"}
          </span>
        </div>

        {/* Notifications Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.07] transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-[#0c1224] border border-white/[0.1] rounded-xl shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-white/[0.07] text-xs font-semibold text-slate-200">
                  Live Security Alerts
                </div>
                <div className="py-1 space-y-1">
                  {recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-2 rounded-lg hover:bg-white/[0.04] text-xs transition-colors"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-0.5">
                        <span
                          className={
                            notif.level === "CRITICAL"
                              ? "text-rose-400 font-bold"
                              : "text-amber-400"
                          }
                        >
                          {notif.level}
                        </span>
                        <span>{notif.time}</span>
                      </div>
                      <p className="text-slate-200 text-xs font-medium">{notif.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Security Analyst Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-white/[0.08]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-xs font-bold text-black font-mono">
            PX
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-slate-200 leading-tight">
              Cyber Analyst
            </div>
            <div className="text-[10px] text-cyan-400 font-mono">CC6 Defense</div>
          </div>
        </div>
      </div>
    </header>
  );
}
