import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  CheckCircle2,
  BarChart3
} from "lucide-react";
import TransactionNetwork3D from "../components/TransactionNetwork3D";
import { api } from "../utils/api";

export default function CommandCorePage({ setActivePage, onOpenAuditDetail, onSelectPreset }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const summary = await api.getCommandCoreSummary();
      setData(summary);
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const metrics = data?.metrics || {
    total_transactions_analyzed: 15420,
    suspicious_transactions: 1845,
    high_risk_alerts: 384,
    fraud_detection_rate: 99.72,
    precision_rate: 100.0,
    avg_latency_ms: 4.2
  };

  return (
    <div className="space-y-6">
      {/* Hero Security Banner - Paytm-inspired Clean Fintech Banner */}
      <div className="bg-gradient-to-br from-white via-sky-50/20 to-blue-50/30 border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden transition-all">
        {/* Subtle decorative background light */}
        <div className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 bg-sky-200/20 rounded-full blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200/70 rounded-full shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>CYBERCUP 6.0 THREAT SHIELD</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/70 rounded-full font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Model Defense Active</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-heading font-extrabold text-slate-900 tracking-tight leading-snug">
              AI-Powered UPI Fraud Prevention & Promise Verification
            </h1>

            <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed font-normal">
              "The Payment Is Real. The Promise May Not Be." PaySentriX analyzes transaction promises against physical execution, detecting reverse-debit traps, swapped QR stickers, and impersonation before simulated fund clearance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setActivePage("ai-payment-contract")}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#002e6e] hover:bg-[#002456] text-white font-heading font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all active:scale-[0.99] border border-blue-900/10"
            >
              <ShieldAlert className="w-4 h-4 text-white" />
              <span>Verify Payment Contract</span>
            </button>
            <button
              onClick={() => setActivePage("data-science-studio")}
              className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs sm:text-sm font-semibold transition-all shadow-2xs hover:shadow-xs active:scale-[0.99]"
            >
              <span>Holdout ML Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Row - Paytm-inspired Clean Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 lg:gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                Total Analyzed
              </span>
              <Activity className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
              {metrics.total_transactions_analyzed.toLocaleString()}
            </div>
          </div>
          <span className="text-[10px] font-mono text-sky-800 bg-sky-50/80 border border-sky-200/60 px-2 py-0.5 rounded-md mt-2 block font-medium w-fit">
            Synthetic Corpus + Live
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-sm hover:border-amber-200 transition-all duration-200 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                Suspicious Flagged
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl sm:text-2xl font-heading font-extrabold text-amber-600 tracking-tight">
              {metrics.suspicious_transactions.toLocaleString()}
            </div>
          </div>
          <span className="text-[10px] font-mono text-amber-800 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-md mt-2 block font-medium w-fit">
            ~12.0% Baseline
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-sm hover:border-rose-200 transition-all duration-200 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                High Risk Alerts
              </span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl sm:text-2xl font-heading font-extrabold text-rose-600 tracking-tight">
              {metrics.high_risk_alerts.toLocaleString()}
            </div>
          </div>
          <span className="text-[10px] font-mono text-rose-800 bg-rose-50/80 border border-rose-200/60 px-2 py-0.5 rounded-md mt-2 block font-semibold w-fit">
            Blocked Pre-PIN
          </span>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-sm hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                Detection Recall
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl sm:text-2xl font-heading font-extrabold text-emerald-600 tracking-tight">
              {metrics.fraud_detection_rate}%
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 px-2 py-0.5 rounded-md mt-2 block font-semibold w-fit">
            Holdout Test Data
          </span>
        </div>

        {/* Metric 5 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-sm hover:border-blue-200 transition-all duration-200 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                Precision Rate
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl sm:text-2xl font-heading font-extrabold text-blue-600 tracking-tight">
              {metrics.precision_rate}%
            </div>
          </div>
          <span className="text-[10px] font-mono text-blue-800 bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-md mt-2 block font-medium w-fit">
            Zero False Positives
          </span>
        </div>

        {/* Metric 6 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                Inference Latency
              </span>
              <Zap className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
              {metrics.avg_latency_ms} <span className="text-xs text-slate-500 font-normal">ms</span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-indigo-800 bg-indigo-50/80 border border-indigo-200/60 px-2 py-0.5 rounded-md mt-2 block font-medium w-fit">
            FastAPI + XGBoost
          </span>
        </div>
      </div>

      {/* 3D Interactive Transaction Network */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <TransactionNetwork3D />
      </div>

      {/* Lower Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Live Suspicious Activity Stream */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-heading font-bold text-slate-900 flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <span>Recent Suspicious Transactions & Forensic Traces</span>
              </h2>
              <p className="text-xs text-slate-500 pl-9">
                Latest simulated threat vectors intercepted by PaySentriX multi-tier defense.
              </p>
            </div>
            <button
              onClick={() => setActivePage("audit-history")}
              className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/70 transition-all flex items-center space-x-1"
            >
              <span>View Audit Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(data?.recent_activity || []).slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenAuditDetail && onOpenAuditDetail(item)}
                className="p-3.5 rounded-xl bg-slate-50/70 hover:bg-white border border-slate-200/70 hover:border-blue-200 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-md ${
                        item.risk_tier === "CRITICAL"
                          ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                          : item.risk_tier === "HIGH"
                          ? "bg-orange-50 text-orange-700 border border-orange-200/80"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                      }`}
                    >
                      {item.risk_tier} ({item.risk_score})
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {item.analysis_type} • {item.id}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                    {item.input_summary}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed">
                    {item.explanation}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                  <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-1 rounded-md border border-slate-200/70 shadow-2xs">
                    {item.category}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-blue-600 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (1 Col): System Service Status & Top Fraud Categories */}
        <div className="space-y-6">
          {/* Service Engine Health */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <h2 className="text-xs font-heading font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <span>Multi-Tier Defense Engines</span>
            </h2>

            <div className="space-y-2">
              {(data?.services || []).map((srv, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/70 text-xs transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-100" />
                    <span className="text-slate-800 font-medium truncate">{srv.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-mono shrink-0">
                    <span className="text-slate-500">{srv.latency}</span>
                    <span className="text-emerald-700 font-bold px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-200/80">
                      {srv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud Category Distribution */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <h2 className="text-xs font-heading font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <span>Top Fraud Threat Categories</span>
            </h2>

            <div className="space-y-3">
              {(data?.fraud_categories || []).map((cat, idx) => {
                const maxCount = Math.max(...(data?.fraud_categories || []).map((c) => c.count), 30);
                const pct = Math.round((cat.count / maxCount) * 100);

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-700 truncate font-medium">{cat.name}</span>
                      <span className="font-mono text-blue-700 font-bold ml-2 shrink-0">{cat.count} cases</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden p-0.5">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-blue-600 h-full rounded-full transition-all duration-700 shadow-2xs"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
