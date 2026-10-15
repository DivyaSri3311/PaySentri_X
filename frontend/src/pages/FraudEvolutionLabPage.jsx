import React, { useState } from "react";
import {
  Cpu,
  Zap,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Crosshair
} from "lucide-react";
import RiskGauge from "../components/RiskGauge";
import { api } from "../utils/api";

const EVOLUTION_SCENARIOS = [
  {
    name: "Classic Reverse-Debit Refund Lure",
    message: "Your Amazon refund of Rs 5,000 is approved. Click here to receive funds directly into account.",
    amount: 5000,
    vpa: "amz.refund.mule99@ybl",
    is_collect: true,
    is_new: true,
    device: "NEW_DEVICE",
    claimed: "Amazon India",
    held_out: false
  },
  {
    name: "Zero-Day AI Voice Clone Ransom",
    message: "Dad emergency! I had a car accident in Delhi hospital, need Rs 35,000 deposit right now for surgery ICU.",
    amount: 35000,
    vpa: "hospital.emergency.icu@axis",
    is_collect: false,
    is_new: true,
    device: "NEW_DEVICE",
    claimed: "Family Contact",
    held_out: true
  },
  {
    name: "Telegram Part-Time Hotel Task Scam",
    message: "Earn Rs 4,000 daily by rating Google Maps hotels. Deposit Rs 12,000 advance collateral to unlock VIP task commission.",
    amount: 12000,
    vpa: "vip.task.collateral@paytm",
    is_collect: false,
    is_new: true,
    device: "NORMAL",
    claimed: "Telegram HR",
    held_out: true
  },
  {
    name: "Night Disconnection Panic (Hinglish)",
    message: "Aapka bijli connection aaj raat 9:30 baje cut kar diya jayega. Rs 2,500 pending bill jama kare.",
    amount: 2500,
    vpa: "bijli.vibhag.officer@sbi",
    is_collect: false,
    is_new: true,
    device: "NORMAL",
    claimed: "Electricity Board",
    held_out: false
  }
];

export default function FraudEvolutionLabPage() {
  const [selectedScenario, setSelectedScenario] = useState(EVOLUTION_SCENARIOS[0]);
  const [message, setMessage] = useState(EVOLUTION_SCENARIOS[0].message);
  const [amount, setAmount] = useState(EVOLUTION_SCENARIOS[0].amount);
  const [vpa, setVpa] = useState(EVOLUTION_SCENARIOS[0].vpa);
  const [isCollect, setIsCollect] = useState(EVOLUTION_SCENARIOS[0].is_collect);
  const [deviceStatus, setDeviceStatus] = useState(EVOLUTION_SCENARIOS[0].device);
  const [isHeldOut, setIsHeldOut] = useState(EVOLUTION_SCENARIOS[0].held_out);
  const [claimedEntity, setClaimedEntity] = useState(EVOLUTION_SCENARIOS[0].claimed);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRunDefense = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        scenario_name: selectedScenario.name,
        message_text: message,
        transaction_amount: parseFloat(amount) || 5000,
        recipient_vpa: vpa,
        is_collect_request: isCollect,
        is_new_recipient: true,
        device_status: deviceStatus,
        claimed_entity: claimedEntity,
        is_held_out_type: isHeldOut
      };
      const res = await api.evaluateEvolution(payload);
      setResult(res);
    } catch (err) {
      console.error("Evolution evaluation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadScenario = (scen) => {
    setSelectedScenario(scen);
    setMessage(scen.message);
    setAmount(scen.amount);
    setVpa(scen.vpa);
    setIsCollect(scen.is_collect);
    setDeviceStatus(scen.device);
    setIsHeldOut(scen.held_out);
    setClaimedEntity(scen.claimed);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center space-x-1">
                <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                <span>ADVERSARIAL STRESS TESTBED</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Multi-Layered Defense Evaluation
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
              Fraud Evolution & Evasion Lab
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
              Simulates sophisticated fraud actors mutating their attack vectors to bypass supervised models. Compares <strong className="text-slate-900">Supervised XGBoost</strong>, <strong className="text-slate-900">Isolation Forest Anomaly Detection</strong>, and <strong className="text-slate-900">AI Payment Contracts</strong> side-by-side.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {EVOLUTION_SCENARIOS.map((scen, idx) => (
              <button
                key={idx}
                onClick={() => loadScenario(scen)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  selectedScenario.name === scen.name
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {scen.name.split(" ")[0]} {scen.held_out ? "(Held-Out)" : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Workbench (6 Cols) */}
        <form onSubmit={handleRunDefense} className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Adversarial Scenario Workbench</span>
            </h2>
            {isHeldOut && (
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                Unseen Held-Out Attack
              </span>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Lure Message Text
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 text-xs leading-relaxed focus:outline-none focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Amount (₹ INR)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 font-mono text-xs focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Recipient Mule VPA
              </label>
              <input
                type="text"
                value={vpa}
                onChange={(e) => setVpa(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 font-mono text-xs focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Device Integrity Status
              </label>
              <select
                value={deviceStatus}
                onChange={(e) => setDeviceStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 text-xs focus:outline-none focus:bg-white"
              >
                <option value="NORMAL">Standard Trusted Device</option>
                <option value="NEW_DEVICE">New Device (First Login)</option>
                <option value="ROOTED">Rooted / Jailbroken Device</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Claimed Counterparty
              </label>
              <input
                type="text"
                value={claimedEntity}
                onChange={(e) => setClaimedEntity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 text-xs focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-4 text-xs font-mono">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCollect}
                onChange={(e) => setIsCollect(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span className="text-slate-700 font-medium font-sans">Is UPI Collect Request</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isHeldOut}
                onChange={(e) => setIsHeldOut(e.target.checked)}
                className="rounded accent-amber-600"
              />
              <span className="text-slate-700 font-medium font-sans">Held-Out Category</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Running Multi-Engine Defense Benchmark...</span>
            ) : (
              <>
                <Zap className="w-4 h-4 text-white" />
                <span>Test Attack Against Multi-Engine Defense</span>
              </>
            )}
          </button>
        </form>

        {/* Right Output Comparison Matrix (6 Cols) */}
        <div className="lg:col-span-6 space-y-5">
          {result ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono text-blue-600 uppercase font-semibold">
                    Multi-Engine Defense Verdict
                  </span>
                  <h3 className="text-sm font-heading font-bold text-slate-900">
                    {result.final_verdict}
                  </h3>
                </div>
                <span className="text-sm font-heading font-extrabold text-blue-600">
                  {result.combined_risk_score} / 100
                </span>
              </div>

              {/* 3 Defensive Layers Comparison Matrix */}
              <div className="space-y-3">
                {/* Layer 1: XGBoost */}
                <div className={`p-3.5 rounded-xl border ${
                  result.layer_1_supervised_ml.status === "CAUGHT"
                    ? "bg-rose-50 border-rose-200 text-rose-800"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-heading font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>Layer 1: Supervised ML (XGBoost)</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        result.layer_1_supervised_ml.status === "CAUGHT"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {result.layer_1_supervised_ml.status}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Calculated Risk Score: <strong className="font-mono">{result.layer_1_supervised_ml.risk_score}</strong>. Prediction: {result.layer_1_supervised_ml.prediction}.
                  </p>
                </div>

                {/* Layer 2: Isolation Forest */}
                <div className={`p-3.5 rounded-xl border ${
                  result.layer_2_anomaly_detection.status === "CAUGHT"
                    ? "bg-rose-50 border-rose-200 text-rose-800"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-heading font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                      <span>Layer 2: Unsupervised Anomaly (Isolation Forest)</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        result.layer_2_anomaly_detection.status === "CAUGHT"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {result.layer_2_anomaly_detection.status}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Anomaly Intensity: <strong className="font-mono">{result.layer_2_anomaly_detection.anomaly_intensity}%</strong>. Evaluates high-dimensional behavioral outliers.
                  </p>
                </div>

                {/* Layer 3: AI Payment Contract */}
                <div className={`p-3.5 rounded-xl border ${
                  result.layer_3_payment_contract.status === "CAUGHT"
                    ? "bg-rose-50 border-rose-200 text-rose-800"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-heading font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>Layer 3: AI Payment Contract (Predicate Invariance)</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        result.layer_3_payment_contract.status === "CAUGHT"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {result.layer_3_payment_contract.status}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Failed Predicates: <strong className="font-mono">{result.layer_3_payment_contract.failed_predicates.join(", ") || "None"}</strong>. Traps promise contradictions.
                  </p>
                </div>
              </div>

              {/* Gap Analysis Insights */}
              {result.gap_analysis && result.gap_analysis.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                  <span className="font-heading font-bold flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Defense Gap Insight</span>
                  </span>
                  <p className="leading-relaxed">
                    {result.gap_analysis[0]}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center h-full min-h-[380px] space-y-3 shadow-sm">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <Crosshair className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900">
                Awaiting Adversarial Stress Test
              </h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Modify transaction and language parameters or pick a held-out scam to test how multi-engine defense catches evasions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
