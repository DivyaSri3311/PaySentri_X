import React, { useState } from "react";
import {
  Activity,
  Send,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  Smartphone,
  CreditCard
} from "lucide-react";
import RiskGauge from "../components/RiskGauge";
import { api } from "../utils/api";

export default function TransactionIntelligencePage({ prefilledData }) {
  const [form, setForm] = useState(prefilledData || {
    amount: 5000,
    sender_id: "user9821@oksbi",
    recipient_id: "quick.refund98@ybl",
    hour_of_day: 14,
    sender_prev_tx_count: 32,
    sender_avg_amount: 600,
    recipient_is_new: 1,
    recipient_risk_flag: 1,
    direction: "DEBIT",
    is_collect_request: 1,
    device_is_new: 1,
    device_rooted: 0,
    merchant_mcc_risk: 1,
    urgency_keyword_in_note: 1,
    payment_context: "Emergency Refund Approval Voucher"
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await api.evaluateTransaction({
        ...form,
        amount: parseFloat(form.amount) || 100,
        hour_of_day: parseInt(form.hour_of_day) || 12,
        sender_prev_tx_count: parseInt(form.sender_prev_tx_count) || 10,
        sender_avg_amount: parseFloat(form.sender_avg_amount) || 500,
        recipient_is_new: parseInt(form.recipient_is_new) || 0,
        recipient_risk_flag: parseInt(form.recipient_risk_flag) || 0,
        is_collect_request: parseInt(form.is_collect_request) || 0,
        device_is_new: parseInt(form.device_is_new) || 0,
        device_rooted: parseInt(form.device_rooted) || 0,
      });
      setResult(res);
    } catch (err) {
      console.error("Evaluation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (preset) => {
    setForm(preset);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                XGBOOST ML ENGINE
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Holdout Accuracy: 99.97%
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
              Transaction Intelligence Simulator
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
              Simulate granular payment vectors and evaluate behavioral anomaly features using our trained XGBoost classifier and SHAP-style local feature attribution.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => loadPreset({
                amount: 140,
                sender_id: "user9821@oksbi",
                recipient_id: "chaipoint@yesbank",
                hour_of_day: 16,
                sender_prev_tx_count: 85,
                sender_avg_amount: 180,
                recipient_is_new: 0,
                recipient_risk_flag: 0,
                direction: "DEBIT",
                is_collect_request: 0,
                device_is_new: 0,
                device_rooted: 0,
                payment_context: "Chai and bun maska"
              })}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors"
            >
              Chai Payment (₹140)
            </button>
            <button
              onClick={() => loadPreset({
                amount: 24999,
                sender_id: "user9821@oksbi",
                recipient_id: "crypto.swap99@axis",
                hour_of_day: 2,
                sender_prev_tx_count: 4,
                sender_avg_amount: 600,
                recipient_is_new: 1,
                recipient_risk_flag: 1,
                direction: "DEBIT",
                is_collect_request: 0,
                device_is_new: 1,
                device_rooted: 1,
                payment_context: "Midnight Crypto Token Egress"
              })}
              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors"
            >
              Midnight Mule (₹24,999)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (7 Cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Simulated Payment Parameters</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">NPCI Unified Interface</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Transaction Amount (₹ INR) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Direction */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Transaction Direction *
              </label>
              <select
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="DEBIT">DEBIT (Victim transfers funds out)</option>
                <option value="CREDIT">CREDIT (Funds deposited to victim)</option>
              </select>
            </div>

            {/* Sender VPA */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Sender UPI ID (Citizen/Payer)
              </label>
              <input
                type="text"
                value={form.sender_id}
                onChange={(e) => setForm({ ...form, sender_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Recipient VPA */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Recipient UPI ID (Payee/Mule)
              </label>
              <input
                type="text"
                value={form.recipient_id}
                onChange={(e) => setForm({ ...form, recipient_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Sender Historical Average */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Sender Baseline Average Amount (₹)
              </label>
              <input
                type="number"
                value={form.sender_avg_amount}
                onChange={(e) => setForm({ ...form, sender_avg_amount: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Hour of Day */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Execution Time: {form.hour_of_day}:00 HRS
              </label>
              <input
                type="range"
                min="0"
                max="23"
                value={form.hour_of_day}
                onChange={(e) => setForm({ ...form, hour_of_day: e.target.value })}
                className="w-full accent-blue-600 mt-2"
              />
              <span className="text-[10px] font-mono text-slate-500">
                {form.hour_of_day >= 23 || form.hour_of_day <= 5 ? "⚠️ Dormant Off-Hours" : "Standard Business Hours"}
              </span>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200">
              <input
                type="checkbox"
                checked={form.is_collect_request === 1}
                onChange={(e) => setForm({ ...form, is_collect_request: e.target.checked ? 1 : 0 })}
                className="rounded accent-blue-600"
              />
              <span className="text-slate-700 font-medium">UPI Collect Trap</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200">
              <input
                type="checkbox"
                checked={form.recipient_risk_flag === 1}
                onChange={(e) => setForm({ ...form, recipient_risk_flag: e.target.checked ? 1 : 0 })}
                className="rounded accent-rose-600"
              />
              <span className="text-slate-700 font-medium">Flagged Mule VPA</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200">
              <input
                type="checkbox"
                checked={form.device_is_new === 1}
                onChange={(e) => setForm({ ...form, device_is_new: e.target.checked ? 1 : 0 })}
                className="rounded accent-blue-600"
              />
              <span className="text-slate-700 font-medium">New Device Login</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200">
              <input
                type="checkbox"
                checked={form.device_rooted === 1}
                onChange={(e) => setForm({ ...form, device_rooted: e.target.checked ? 1 : 0 })}
                className="rounded accent-rose-600"
              />
              <span className="text-slate-700 font-medium">Rooted / Jailbroken</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200">
              <input
                type="checkbox"
                checked={form.recipient_is_new === 1}
                onChange={(e) => setForm({ ...form, recipient_is_new: e.target.checked ? 1 : 0 })}
                className="rounded accent-blue-600"
              />
              <span className="text-slate-700 font-medium">First-Time Payee</span>
            </label>
          </div>

          {/* Context Note */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Transaction Note / Context Reference
            </label>
            <input
              type="text"
              value={form.payment_context}
              onChange={(e) => setForm({ ...form, payment_context: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
              placeholder="e.g. Amazon Refund Approval Ref 5000"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Executing XGBoost Classifier Inference...</span>
            ) : (
              <>
                <Send className="w-4 h-4 text-white" />
                <span>Evaluate Transaction Risk Score</span>
              </>
            )}
          </button>
        </form>

        {/* Right Output Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {result ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-heading font-bold text-slate-900 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Model Risk Assessment</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  Audit ID: {result.audit_id}
                </span>
              </div>

              {/* Gauge */}
              <RiskGauge score={result.risk_score} subtitle={result.prediction} />

              {/* Decision Box */}
              <div className={`p-4 rounded-xl border ${
                result.risk_score >= 60
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  {result.risk_score >= 60 ? (
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  <span className="text-sm font-heading font-bold text-slate-900">
                    {result.category}
                  </span>
                </div>
                <p className="text-xs leading-relaxed">
                  {result.action_description}
                </p>
              </div>

              {/* Feature Attribution (SHAP-style) */}
              <div className="space-y-2">
                <span className="text-xs font-heading font-semibold text-slate-900 block">
                  Contributing Risk Drivers (SHAP Local Attribution)
                </span>
                <div className="space-y-2">
                  {(result.contributing_features || []).map((feat, idx) => {
                    const isRisk = feat.impact === "INCREASES_RISK";
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">
                            {feat.feature}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isRisk
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {isRisk ? `+${feat.weight}% Risk` : `${feat.weight}% Safe`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {feat.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 font-mono">
                {result.explanation}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center h-full min-h-[380px] space-y-3 shadow-sm">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <Activity className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900">
                Awaiting Transaction Vector
              </h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Enter simulated payment parameters or select a pre-configured CyberCup test scenario above to execute real XGBoost inference.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
