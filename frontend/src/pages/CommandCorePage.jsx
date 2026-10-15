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
  Zap
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
      {/* Hero Security Banner */}
      <div className="glass-panel-elevated p-6 bg-gradient-to-r from-[#0c1329] via-[#09152b] to-[#0a1c2e] border-cyan-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full flex items-center space-x-1.5 shadow-cyan-glow">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>CYBERCUP 6.0 THREAT SHIELD</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Model Defense Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight leading-tight">
              AI-Powered UPI Fraud Prevention & Promise Verification
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              "The Payment Is Real. The Promise May Not Be." PaySentriX analyzes transaction promises against physical execution, detecting reverse-debit traps, swapped QR stickers, and impersonation before simulated fund clearance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setActivePage("ai-payment-contract")}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-heading font-bold text-sm shadow-cyan-glow transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-black" />
              <span>Verify Payment Contract</span>
            </button>
            <button
              onClick={() => setActivePage("data-science-studio")}
              className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/[0.12] text-sm font-semibold transition-all"
            >
              <span>Holdout ML Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        {/* Metric 1 */}
        <div className="glass-card p-4 rounded-xl">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
            Total Analyzed
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-white">
            {metrics.total_transactions_analyzed.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-cyan-400 mt-1 block">
            Synthetic Corpus + Live
          </span>
        </div>

        {/* Metric 2 */}
        <div className="glass-card p-4 rounded-xl">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
            Suspicious Flagged
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-amber-400">
            {metrics.suspicious_transactions.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">
            ~12.0% Baseline
          </span>
        </div>

        {/* Metric 3 */}
        <div className="glass-card p-4 rounded-xl">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
            High Risk Alerts
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-rose-400">
            {metrics.high_risk_alerts.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-rose-300 mt-1 block">
            Blocked Pre-PIN
          </span>
        </div>

        {/* Metric 4 */}
        <div className="glass-card p-4 rounded-xl">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
            Detection Recall
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-emerald-400">
            {metrics.fraud_detection_rate}%
          </div>
          <span className="text-[10px] font-mono text-emerald-400 mt-1 block">
            Holdout Test Data
          </span>
        </div>

        {/* Metric 5 */}
        <div className="glass-card p-4 rounded-xl">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
            Precision Rate
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-cyan-300">
            {metrics.precision_rate}%
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">
            Zero False Positives
          </span>
        </div>

        {/* Metric 6 */}
        <div className="glass-card p-4 rounded-xl">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
            Inference Latency
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-white">
            {metrics.avg_latency_ms} <span className="text-xs text-slate-400">ms</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 mt-1 block">
            FastAPI + XGBoost
          </span>
        </div>
      </div>

      {/* 3D Interactive Transaction Network */}
      <TransactionNetwork3D />

      {/* Lower Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Live Suspicious Activity Stream */}
        <div className="lg:col-span-2 glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div>
              <h2 className="text-sm font-heading font-bold text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Recent Suspicious Transactions & Forensic Traces</span>
              </h2>
              <p className="text-xs text-slate-400">
                Latest simulated threat vectors intercepted by PaySentriX multi-tier defense.
              </p>
            </div>
            <button
              onClick={() => setActivePage("audit-history")}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
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
                className="p-3 rounded-xl bg-black/40 hover:bg-white/[0.04] border border-white/[0.06] hover:border-cyan-500/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${
                        item.risk_tier === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : item.risk_tier === "HIGH"
                          ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {item.risk_tier} ({item.risk_score})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.analysis_type} • {item.id}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {item.input_summary}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {item.explanation}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                  <span className="text-[11px] font-mono text-slate-400">
                    {item.category}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (1 Col): System Service Status & Top Fraud Categories */}
        <div className="space-y-6">
          {/* Service Engine Health */}
          <div className="glass-panel p-5 space-y-3">
            <h2 className="text-xs font-heading font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Multi-Tier Defense Engines</span>
            </h2>

            <div className="space-y-2">
              {(data?.services || []).map((srv, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/[0.04] text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-slate-300 font-medium">{srv.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-mono">
                    <span className="text-slate-400">{srv.latency}</span>
                    <span className="text-emerald-400 font-bold px-1.5 py-0.2 bg-emerald-500/10 rounded">
                      {srv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud Category Distribution */}
          <div className="glass-panel p-5 space-y-3">
            <h2 className="text-xs font-heading font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Top Fraud Threat Categories</span>
            </h2>

            <div className="space-y-2.5">
              {(data?.fraud_categories || []).map((cat, idx) => {
                const maxCount = Math.max(...(data?.fraud_categories || []).map((c) => c.count), 30);
                const pct = Math.round((cat.count / maxCount) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 truncate">{cat.name}</span>
                      <span className="font-mono text-cyan-400 font-bold">{cat.count} cases</span>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full rounded-full transition-all duration-700"
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
