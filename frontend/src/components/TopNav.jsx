import React, { useState, useEffect } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  Sparkles,
  Search,
  Sun,
  Moon,
  ExternalLink,
  ShieldCheck,
  Check
} from "lucide-react";
import PaySentriXLogo from "./PaySentriXLogo";
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTheme, setCurrentTheme] = useState(() => {
    try {
      return localStorage.getItem("paysentrix_scam_checker_theme") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const handleThemeChange = () => {
      try {
        const stored = localStorage.getItem("paysentrix_scam_checker_theme");
        if (stored) setCurrentTheme(stored);
      } catch {}
    };
    window.addEventListener("paysentrix_scam_checker_theme_changed", handleThemeChange);
    return () => window.removeEventListener("paysentrix_scam_checker_theme_changed", handleThemeChange);
  }, []);

  const toggleAppTheme = () => {
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    setCurrentTheme(nextTheme);
    try {
      localStorage.setItem("paysentrix_scam_checker_theme", nextTheme);
      window.dispatchEvent(new Event("paysentrix_scam_checker_theme_changed"));
    } catch {}
  };

  const recentNotifications = [
    { id: 1, title: "Physical QR Swapped Sticker Flagged", time: "2m ago", level: "CRITICAL" },
    { id: 2, title: "Reverse-Debit Collect Scam Blocked", time: "14m ago", level: "HIGH" },
    { id: 3, title: "High-Entropy Typosquatted Link Flagged", time: "32m ago", level: "MEDIUM" },
  ];

  // Quick search matching navigation or presets
  const filteredNav = searchQuery.trim()
    ? NAVIGATION_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredPresets = searchQuery.trim()
    ? DEMO_PRESETS.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Left: Mobile Toggle & Search Bar */}
      <div className="flex items-center space-x-3 flex-1 max-w-xl">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -ml-1 text-slate-500 hover:text-slate-900 rounded-lg lg:hidden"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="lg:hidden flex items-center cursor-pointer" onClick={() => setActivePage("command-core")}>
          <PaySentriXLogo variant="icon" size="sm" theme="light" />
        </div>

        {/* Search Bar matching Screenshot 2 */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search features, scan history, or documentation..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50/80 hover:bg-slate-100/60 focus:bg-white border border-slate-200/80 focus:border-blue-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
          />

          {/* Quick Search Results Dropdown */}
          {searchQuery.trim() && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSearchQuery("")}
              />
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 z-50 max-h-80 overflow-y-auto">
                {filteredNav.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">
                      Features
                    </div>
                    {filteredNav.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setActivePage(n.id);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl flex items-center justify-between transition-colors"
                      >
                        <span>{n.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Jump</span>
                      </button>
                    ))}
                  </div>
                )}

                {filteredPresets.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">
                      Demo Scenarios
                    </div>
                    {filteredPresets.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectPreset(p);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"
                      >
                        <div className="font-medium">{p.title}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{p.description}</div>
                      </button>
                    ))}
                  </div>
                )}

                {filteredNav.length === 0 && filteredPresets.length === 0 && (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No matching features or demos found.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Controls matching Screenshot 2 */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Demo Presets Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs hover:shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Demo Scenarios</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showPresets && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPresets(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-heading font-semibold text-slate-800">
                    PaySentriX Evaluation Presets
                  </span>
                  <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    1-Click Test
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto py-1 space-y-1">
                  {DEMO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelectPreset(preset);
                        setShowPresets(false);
                      }}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {preset.title}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                          {preset.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          aria-label={`Switch to ${currentTheme === "light" ? "Dark" : "Light"} Mode`}
          onClick={toggleAppTheme}
          title={`Switch to ${currentTheme === "light" ? "Dark" : "Light"} Mode`}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          {currentTheme === "dark" ? (
            <Moon className="w-4 h-4 text-cyan-500" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </button>

        {/* Notification Bell with red badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-800">
                  Live Security Alerts
                </div>
                <div className="py-1 space-y-1">
                  {recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-2 rounded-lg hover:bg-slate-50 text-xs transition-colors"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-0.5">
                        <span
                          className={
                            notif.level === "CRITICAL"
                              ? "text-rose-600 font-bold"
                              : "text-amber-600 font-semibold"
                          }
                        >
                          {notif.level}
                        </span>
                        <span>{notif.time}</span>
                      </div>
                      <p className="text-slate-700 text-xs font-medium">{notif.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Pill matching Screenshot 2 */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold font-mono">
              YK
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                Yusuf Khan
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                Research Mode
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="font-semibold text-slate-800">Yusuf Khan</div>
                  <div className="text-[11px] text-slate-500">Security Analyst • Admin</div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActivePage("settings");
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                  >
                    System Settings
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("audit-history");
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                  >
                    Security Audit Trail
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
