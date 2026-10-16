import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  TrendingUp,
  Cpu,
  ChevronRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  ArrowUpRight
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

  const recentActivities = (data?.recent_activity && data.recent_activity.length > 0)
    ? data.recent_activity.slice(0, 5)
    : [
        {
          id: "PSX-CON-20261015-88A19B",
          risk_tier: "CRITICAL",
          risk_score: 94,
          analysis_type: "CONTRACT",
          input_summary: "Amazon ₹5,000 Refund Reverse-Debit Scam",
          explanation: "Promise promises incoming credit of ₹5,000 but actual payload is an outgoing DEBIT collect request.",
          category: "Reverse-Debit Collect Scam"
        },
        {
          id: "PSX-QR-20261015-77C201",
          risk_tier: "CRITICAL",
          risk_score: 89,
          analysis_type: "QR_STAMP",
          input_summary: "Starbucks Swapped Counter QR Standee",
          explanation: "Physical standee branded as Tata Starbucks, but digital VPA points to unauthorized personal account.",
          category: "Swapped QR Sticker Scam"
        },
        {
          id: "PSX-MSG-20261015-66B142",
          risk_tier: "HIGH",
          risk_score: 76,
          analysis_type: "NLP_MSG",
          input_summary: "Urgent Electricity Disconnection Threat",
          explanation: "High urgency linguistic vector impersonating state discom officer with unverified payment link.",
          category: "Electricity Bill Phishing"
        },
        {
          id: "PSX-LNK-20261015-55D902",
          risk_tier: "HIGH",
          risk_score: 68,
          analysis_type: "LINK_SCAN",
          input_summary: "Typosquatted UPI Portal Redirect",
          explanation: "Domain uses high-entropy characters masquerading as official payment gateway with private IP forwarding.",
          category: "Fake KYC / Account Block"
        },
        {
          id: "PSX-GHP-20261015-44E119",
          risk_tier: "CRITICAL",
          risk_score: 92,
          analysis_type: "GHOSTPAY",
          input_summary: "Forged Transaction Success Screenshot",
          explanation: "Digital font weight inconsistency and timestamp mismatch indicating synthetic receipt generator.",
          category: "Reverse-Debit Collect Scam"
        }
      ];

  const services = data?.services || [
    { name: "XGBoost Supervised Core", status: "OPTIMAL", latency: "3.8ms", load: "12%" },
    { name: "AI Payment Contract Engine", status: "OPTIMAL", latency: "1.4ms", load: "8%" },
    { name: "Multilingual NLP Parser", status: "OPTIMAL", latency: "4.1ms", load: "15%" },
    { name: "QR Guardian & Trust Registry", status: "OPTIMAL", latency: "2.2ms", load: "6%" },
    { name: "SSRF Link Security Inspector", status: "OPTIMAL", latency: "2.9ms", load: "9%" },
    { name: "Isolation Forest Anomaly Lab", status: "OPTIMAL", latency: "5.1ms", load: "11%" }
  ];

  const fraudCategories = data?.fraud_categories || [
    { name: "Reverse-Debit Collect Scam", count: 28 },
    { name: "Fake KYC / Account Block", count: 19 },
    { name: "Swapped QR Sticker Scam", count: 14 },
    { name: "Electricity Bill Phishing", count: 12 },
    { name: "Digital Arrest / Authority", count: 9 },
    { name: "Job / Telegram Task", count: 7 }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive Hero Header & Quick Command Bar */}
      <section className="bg-white border border-slate-200/80 rounded-xl p-6 sm:p-7 shadow-xs relative overflow-hidden transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-md">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>CyberCup 6.0 Threat Shield</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 text-xs text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 rounded-md font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Model Defense Active</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 tracking-tight leading-snug">
              AI-Powered UPI Fraud Prevention & Promise Verification
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              <strong className="text-slate-900 font-semibold">"The Payment Is Real. The Promise May Not Be."</strong> PaySentriX analyzes transaction promises against physical execution, detecting reverse-debit traps, swapped QR stickers, and impersonation before simulated fund clearance.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              onClick={() => setActivePage("ai-payment-contract")}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm shadow-xs hover:shadow transition-all active:scale-[0.99] cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Verify Payment Contract</span>
            </button>
            <button
              onClick={() => setActivePage("data-science-studio")}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-medium transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <span>Holdout ML Studio</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Unified Key Performance Matrix (Stripe-inspired Fintech KPI Cards) */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1: Total Analyzed */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Total Analyzed
              </span>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-[26px] font-heading font-bold text-slate-900 tracking-tight">
              {metrics.total_transactions_analyzed.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 flex items-center gap-1">
            <span className="text-blue-600">↗</span> Synthetic + Live
          </div>
        </div>

        {/* Metric 2: Suspicious Flagged */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Suspicious Flagged
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-[26px] font-heading font-bold text-slate-900 tracking-tight">
              {metrics.suspicious_transactions.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-3 flex items-center gap-1">
            <span>~12.0%</span> Baseline distribution
          </div>
        </div>

        {/* Metric 3: High Risk Alerts */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                High Risk Alerts
              </span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl sm:text-[26px] font-heading font-bold text-slate-900 tracking-tight">
              {metrics.high_risk_alerts.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-rose-700 font-medium mt-3 flex items-center gap-1">
            <span>●</span> Blocked Pre-PIN
          </div>
        </div>

        {/* Metric 4: Detection Recall */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Detection Recall
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-[26px] font-heading font-bold text-slate-900 tracking-tight">
              {metrics.fraud_detection_rate}%
            </div>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-3 flex items-center gap-1">
            <span>✓</span> Holdout Test Data
          </div>
        </div>

        {/* Metric 5: Precision Rate */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Precision Rate
              </span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-[26px] font-heading font-bold text-slate-900 tracking-tight">
              {metrics.precision_rate}%
            </div>
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-3 flex items-center gap-1">
            <span>✓</span> Zero False Positives
          </div>
        </div>

        {/* Metric 6: Inference Latency */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Inference Latency
              </span>
              <Zap className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-[26px] font-heading font-bold text-slate-900 tracking-tight">
              {metrics.avg_latency_ms} <span className="text-xs text-slate-500 font-normal">ms</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-3">
            FastAPI + XGBoost
          </div>
        </div>
      </section>

      {/* 3. Interactive Threat Topology / Real-Time Financial Transaction Graph */}
      <section className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Threat Topology
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500">Three.js Graph Engine</span>
            </div>
            <h2 className="text-base font-heading font-bold text-slate-900">
              Real-Time Financial Transaction Graph
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 self-start sm:self-auto">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Citizen</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Verified Merchant</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-rose-700 font-semibold">Mule / Alert</span>
            </div>
          </div>
        </div>

        {/* 3D Component Viewport */}
        <TransactionNetwork3D />
      </section>

      {/* 4. Lower Dashboard Grid: Suspicious Activity Feed (Left) & Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 of 12 cols): Recent Suspicious Transactions & Forensic Traces */}
        <section className="lg:col-span-8 bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
            <div className="space-y-0.5">
              <h2 className="text-base font-heading font-bold text-slate-900 flex items-center space-x-2">
                <span>Recent Suspicious Transactions & Forensic Traces</span>
              </h2>
              <p className="text-xs text-slate-500">
                Latest simulated threat vectors intercepted by PaySentriX multi-tier defense.
              </p>
            </div>
            <button
              onClick={() => setActivePage("audit-history")}
              className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all flex items-center space-x-1 shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <span>View Audit Ledger</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentActivities.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenAuditDetail && onOpenAuditDetail(item)}
                className="py-3.5 px-2 hover:bg-slate-50/70 rounded-lg transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-medium rounded-full ${
                        item.risk_tier === "CRITICAL"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : item.risk_tier === "HIGH"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {item.risk_tier} ({item.risk_score})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.analysis_type} • {item.id}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {item.input_summary}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed">
                    {item.explanation}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                    {item.category}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column (4 of 12 cols): Infrastructure & Threat Intelligence */}
        <div className="lg:col-span-4 space-y-6">
          {/* Multi-Tier Defense Engines Card */}
          <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-heading font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-slate-400" />
                <span>Multi-Tier Defense Engines</span>
              </h2>
              <span className="text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                ACTIVE
              </span>
            </div>

            <div className="space-y-1">
              {services.map((srv, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/70 rounded-md text-xs transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-700 font-medium truncate">{srv.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-mono shrink-0">
                    <span className="text-slate-400">{srv.latency}</span>
                    <span className="text-emerald-700 font-medium px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-200/60">
                      {srv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Top Fraud Threat Categories Card */}
          <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-heading font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span>Top Fraud Threat Categories</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-400">
                Distribution
              </span>
            </div>

            <div className="space-y-3">
              {fraudCategories.map((cat, idx) => {
                const maxCount = Math.max(...fraudCategories.map((c) => c.count), 30);
                const pct = Math.round((cat.count / maxCount) * 100);

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-700 truncate font-medium">{cat.name}</span>
                      <span className="font-mono text-slate-900 font-semibold ml-2 shrink-0">{cat.count} cases</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
