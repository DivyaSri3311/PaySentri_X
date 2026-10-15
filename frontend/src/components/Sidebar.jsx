import React from "react";
import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  MessageSquareWarning,
  Link2,
  QrCode,
  Cpu,
  BarChart3,
  FileText,
  Sliders,
  ShieldCheck,
  Zap,
  Radio,
  X
} from "lucide-react";
import { BRAND, NAVIGATION_ITEMS } from "../utils/constants";

const ICON_MAP = {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  MessageSquareWarning,
  Link2,
  QrCode,
  Cpu,
  BarChart3,
  FileText,
  Sliders,
};

export default function Sidebar({ activePage, setActivePage, isMobileOpen, setIsMobileOpen, backendOnline }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-[#080d1a]/95 backdrop-blur-2xl border-r border-white/[0.08] z-50 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActivePage("command-core")}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/40 shadow-cyan-glow">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-heading text-lg font-bold tracking-tight text-white">
                  Pay<span className="text-cyan-400">SentriX</span>
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded">
                  v3.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-[170px] tracking-wide">
                AI UPI Threat Shield
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hackathon Badge */}
        <div className="px-4 py-2 mx-3 my-2.5 rounded-lg bg-gradient-to-r from-cyan-950/40 via-teal-950/30 to-transparent border border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-mono text-cyan-200 font-medium">CyberCup 6.0</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.2 text-cyan-400/90 bg-cyan-500/10 rounded">
            CC6-AI02
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 pt-1 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Security Command Center
          </div>

          {NAVIGATION_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon] || ShieldCheck;
            const isActive = activePage === item.id;
            const isHighlight = item.highlight;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-200 border border-cyan-500/40 shadow-sm"
                    : isHighlight
                    ? "text-slate-200 hover:text-white hover:bg-white/[0.04] border border-cyan-500/20 bg-cyan-950/20"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? "text-cyan-400"
                        : isHighlight
                        ? "text-cyan-400 group-hover:text-cyan-300"
                        : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span className={`${isHighlight && !isActive ? "font-semibold text-slate-100" : ""}`}>
                    {item.label}
                  </span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? "bg-cyan-400 text-black font-bold"
                        : isHighlight
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-white/[0.05] text-slate-400 group-hover:text-slate-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Engine Status & System Badge */}
        <div className="p-3.5 m-3 rounded-xl bg-[#0b1022] border border-white/[0.07]">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    backendOnline ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    backendOnline ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                {backendOnline ? "ML Inference Live" : "Local Standby"}
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">99.97% Acc</span>
          </div>

          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-400 to-cyan-400 h-full w-full" />
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>XGBoost + Predicates</span>
            <span>FastAPI v3</span>
          </div>
        </div>
      </aside>
    </>
  );
}
