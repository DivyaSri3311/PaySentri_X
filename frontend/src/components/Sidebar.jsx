import React from "react";
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  ShieldAlert,
  MessageSquareWarning,
  Link2,
  QrCode,
  Cpu,
  BarChart3,
  FileText,
  Sliders,
  ShieldCheck,
  Receipt,
  Network,
  X
} from "lucide-react";
import PaySentriXLogo from "./PaySentriXLogo";
import { NAVIGATION_ITEMS } from "../utils/constants";

const ICON_MAP = {
  LayoutDashboard,
  Activity,
  TrendingUp,
  ShieldAlert,
  MessageSquareWarning,
  Link2,
  QrCode,
  Receipt,
  Network,
  Cpu,
  BarChart3,
  FileText,
  Sliders,
};

export default function Sidebar({ activePage, setActivePage, isMobileOpen, setIsMobileOpen, backendOnline, theme = "light" }) {
  // Detection suite items: all items from constants
  const detectionItems = NAVIGATION_ITEMS;
  const isDark = theme === "dark";

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 ${
          isDark ? "bg-[#0b1120] border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
        } border-r z-50 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className={`p-4 border-b ${isDark ? "border-slate-800" : "border-slate-200"} flex items-center justify-between`}>
          <PaySentriXLogo
            variant="horizontal"
            theme={isDark ? "dark" : "light"}
            size="md"
            onClick={() => setActivePage("command-core")}
            className="cursor-pointer hover:opacity-90 transition-opacity"
          />

          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {/* Dashboard Quick Switcher */}
          <button
            onClick={() => {
              setActivePage("command-core");
              setIsMobileOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activePage === "command-core" || activePage === "dashboard"
                ? isDark
                  ? "bg-slate-800/90 text-white font-semibold shadow-2xs"
                  : "bg-slate-100/90 text-slate-900 font-semibold shadow-2xs"
                : isDark
                ? "text-slate-400 hover:text-white hover:bg-slate-800/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/80"
            }`}
          >
            <div className="flex items-center space-x-3">
              <LayoutDashboard className={`w-4 h-4 transition-colors ${
                activePage === "command-core" || activePage === "dashboard"
                  ? "text-blue-500"
                  : "text-slate-400"
              }`} />
              <span>Dashboard</span>
            </div>
          </button>

          {/* Section Header */}
          <div className={`px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            DETECTION SUITE
          </div>

          {detectionItems.map((item) => {
            const Icon = ICON_MAP[item.icon] || ShieldCheck;
            const isActive = activePage === item.id;

            // Custom badge mapping matching Screenshot 2
            let badgeText = item.badge;
            let badgeStyle = isDark ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-slate-100 text-slate-600";

            if (item.id === "command-core") {
              badgeText = "Live";
              badgeStyle = isDark ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-semibold" : "bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-semibold";
            } else if (item.id === "mule-network") {
              badgeText = "Graph";
              badgeStyle = isDark ? "bg-amber-950/60 text-amber-400 border border-amber-800/60 font-semibold" : "bg-amber-50 text-amber-700 border border-amber-200/70 font-semibold";
            } else if (item.id === "ai-payment-contract") {
              badgeText = "New";
              badgeStyle = isDark ? "bg-blue-950/60 text-blue-400 border border-blue-800/60 font-semibold" : "bg-blue-50 text-blue-700 border border-blue-200/70 font-semibold";
            } else if (item.id === "ghostpay-detector") {
              badgeText = "Verify";
              badgeStyle = isDark ? "bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 font-semibold" : "bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-semibold";
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? isDark
                      ? "bg-slate-800/90 text-white font-semibold shadow-2xs"
                      : "bg-slate-100/90 text-slate-900 font-semibold shadow-2xs"
                    : isDark
                    ? "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? "text-blue-500"
                        : isDark
                        ? "text-slate-500 group-hover:text-slate-300"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {badgeText && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 ${badgeStyle}`}
                  >
                    {badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Engine Status & System Badge (Matching Screenshot 2) */}
        <div className={`p-3.5 m-3 rounded-xl border ${isDark ? "bg-slate-900/80 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
          <div className="flex items-center justify-between text-xs mb-1">
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
              <span className="text-xs font-semibold text-slate-800">
                {backendOnline ? "System Online" : "System Offline"}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">v3.0.0</span>
          </div>

          <p className="text-[11px] text-slate-500 mb-2">
            All engines operational
          </p>

          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-600 font-medium">ML Inference</span>
            <span className="font-mono font-bold text-blue-600">99.97%</span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-full w-[99.97%]" />
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>XGBoost + NLP + Isolation Forest</span>
          </div>
        </div>
      </aside>
    </>
  );
}
