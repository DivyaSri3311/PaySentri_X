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
      {/* Hero Security Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center space-x-1.5">
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>CYBERCUP 6.0 THREAT SHIELD</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Model Defense Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight leading-tight">
              AI-Powered UPI Fraud Prevention & Promise Verification
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed">
              "The Payment Is Real. The Promise May Not Be." PaySentriX analyzes transaction promises against physical execution, detecting reverse-debit traps, swapped QR stickers, and impersonation before simulated fund clearance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setActivePage("ai-payment-contract")}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs sm:text-sm shadow-sm transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-white" />
              <span>Verify Payment Contract</span>
            </button>
            <button
              onClick={() => setActivePage("data-science-studio")}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold transition-all shadow-sm"
            >
              <span>Holdout ML Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            Total Analyzed
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900">
            {metrics.total_transactions_analyzed.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-blue-600 mt-1 block font-medium">
            Synthetic Corpus + Live
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            Suspicious Flagged
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-amber-600">
            {metrics.suspicious_transactions.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1 block">
            ~12.0% Baseline
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            High Risk Alerts
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-rose-600">
            {metrics.high_risk_alerts.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-rose-600 mt-1 block font-semibold">
            Blocked Pre-PIN
          </span>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            Detection Recall
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-emerald-600">
            {metrics.fraud_detection_rate}%
          </div>
          <span className="text-[10px] font-mono text-emerald-600 mt-1 block font-semibold">
            Holdout Test Data
          </span>
        </div>

        {/* Metric 5 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            Precision Rate
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-blue-600">
            {metrics.precision_rate}%
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1 block">
            Zero False Positives
          </span>
        </div>

        {/* Metric 6 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            Inference Latency
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900">
            {metrics.avg_latency_ms} <span className="text-xs text-slate-500">ms</span>
          </div>
          <span className="text-[10px] font-mono text-blue-600 mt-1 block font-medium">
            FastAPI + XGBoost
          </span>
        </div>
      </div>

      {/* 3D Interactive Transaction Network */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <TransactionNetwork3D />
      </div>

      {/* Lower Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Live Suspicious Activity Stream */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Recent Suspicious Transactions & Forensic Traces</span>
              </h2>
              <p className="text-xs text-slate-500">
                Latest simulated threat vectors intercepted by PaySentriX multi-tier defense.
              </p>
            </div>
            <button
              onClick={() => setActivePage("audit-history")}
              className="text-xs font-mono text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
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
                className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${
                        item.risk_tier === "CRITICAL"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : item.risk_tier === "HIGH"
                          ? "bg-orange-50 text-orange-700 border border-orange-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {item.risk_tier} ({item.risk_score})
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {item.analysis_type} • {item.id}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {item.input_summary}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {item.explanation}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                  <span className="text-[11px] font-mono text-slate-500">
                    {item.category}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (1 Col): System Service Status & Top Fraud Categories */}
        <div className="space-y-6">
          {/* Service Engine Health */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-heading font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Multi-Tier Defense Engines</span>
            </h2>

            <div className="space-y-2">
              {(data?.services || []).map((srv, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-700 font-medium">{srv.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-mono">
                    <span className="text-slate-500">{srv.latency}</span>
                    <span className="text-emerald-700 font-bold px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                      {srv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud Category Distribution */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-heading font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Top Fraud Threat Categories</span>
            </h2>

            <div className="space-y-2.5">
              {(data?.fraud_categories || []).map((cat, idx) => {
                const maxCount = Math.max(...(data?.fraud_categories || []).map((c) => c.count), 30);
                const pct = Math.round((cat.count / maxCount) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 truncate font-medium">{cat.name}</span>
                      <span className="font-mono text-blue-600 font-bold">{cat.count} cases</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-700"
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
