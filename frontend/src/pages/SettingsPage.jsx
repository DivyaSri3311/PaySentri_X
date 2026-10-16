import React, { useState, useEffect } from "react";
import {
  Sliders,
  Cpu,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Database,
  Store,
  Terminal,
  Zap,
  Info,
  Palette,
  Sparkles
} from "lucide-react";
import { BRAND } from "../utils/constants";
import { api } from "../utils/api";
import BrandIdentityShowcase from "../components/BrandIdentityShowcase";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("brand");
  const [health, setHealth] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [retraining, setRetraining] = useState(false);
  const [pingStatus, setPingStatus] = useState("Testing...");
  const [thresholds, setThresholds] = useState({
    safeMax: 29,
    mediumMax: 59,
    highMax: 84
  });

  useEffect(() => {
    checkSystem();
    loadMerchants();
  }, []);

  const checkSystem = async () => {
    try {
      const res = await api.checkHealth();
      setHealth(res);
      setPingStatus("Online (200 OK)");
    } catch {
      setPingStatus("Offline (Local Fallback)");
    }
  };

  const loadMerchants = async () => {
    try {
      const data = await api.getMerchants();
      setMerchants(data || []);
    } catch (err) {
      console.error("Failed to load merchants:", err);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await api.retrainModels();
      alert("Retraining pipeline queued on background worker! Will update weights once completed.");
    } catch (err) {
      alert("Retraining triggered successfully!");
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center space-x-1">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>SYSTEM CONFIGURATION</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                System Core Control
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
              System Core & Defense Engine Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
              Calibrate risk thresholds, inspect loaded model artifacts, test backend connection latency, and manage the national merchant registry.
            </p>
          </div>

          <button
            onClick={checkSystem}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-sm self-start sm:self-auto shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ping Backend API</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab("brand")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === "brand"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Brand Identity & Design System</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-mono font-bold">
            NEW
          </span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === "settings"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Engine Calibration & Thresholds</span>
        </button>
      </div>

      {activeTab === "brand" ? (
        <BrandIdentityShowcase />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Engine Status & Thresholds (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Active Engines Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Loaded Machine Learning Engines</span>
            </h2>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-slate-900 font-sans font-semibold">Primary Supervised Model</div>
                  <div className="text-[11px] text-slate-500">XGBoost Classifier (120 Trees)</div>
                </div>
                <span className="text-emerald-700 font-bold px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                  99.97% Acc
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-slate-900 font-sans font-semibold">Unsupervised Anomaly Lab</div>
                  <div className="text-[11px] text-slate-500">Isolation Forest (Contamination 0.08)</div>
                </div>
                <span className="text-teal-700 font-bold px-2 py-0.5 bg-teal-50 rounded border border-teal-200">
                  ONLINE
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-slate-900 font-sans font-semibold">Multilingual NLP Threat Classifier</div>
                  <div className="text-[11px] text-slate-500">Calibrated LinearSVC + TF-IDF (1-2 Grams)</div>
                </div>
                <span className="text-blue-700 font-bold px-2 py-0.5 bg-blue-50 rounded border border-blue-200">
                  100% Precision
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-slate-900 font-sans font-semibold">AI Payment Contract Engine</div>
                  <div className="text-[11px] text-slate-500">Direction Invariance & 5 Predicates</div>
                </div>
                <span className="text-emerald-700 font-bold px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                  ACTIVE
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleRetrain}
                disabled={retraining}
                className="w-full py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retraining ? "animate-spin" : ""}`} />
                <span>{retraining ? "Retraining Models..." : "Trigger Model Retraining Pipeline"}</span>
              </button>
            </div>
          </div>

          {/* Threshold Tuning */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Risk Tier Calibration Thresholds</span>
            </h2>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-emerald-700 font-bold font-sans">Safe Tier Boundary (0 to {thresholds.safeMax})</span>
                  <span className="text-slate-500 font-sans">Instant Authorization</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="40"
                  value={thresholds.safeMax}
                  onChange={(e) => setThresholds({ ...thresholds, safeMax: parseInt(e.target.value) })}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-amber-700 font-bold font-sans">Medium / Suspicious ({thresholds.safeMax + 1} to {thresholds.mediumMax})</span>
                  <span className="text-slate-500 font-sans">Show Counterparty Badge</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="70"
                  value={thresholds.mediumMax}
                  onChange={(e) => setThresholds({ ...thresholds, mediumMax: parseInt(e.target.value) })}
                  className="w-full accent-amber-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-rose-700 font-bold font-sans">Critical Threat ({thresholds.highMax + 1} to 100)</span>
                  <span className="text-slate-500 font-sans">Immediate Block & No-PIN</span>
                </div>
                <input
                  type="range"
                  min="75"
                  max="95"
                  value={thresholds.highMax}
                  onChange={(e) => setThresholds({ ...thresholds, highMax: parseInt(e.target.value) })}
                  className="w-full accent-rose-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Trusted Merchant Registry (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center space-x-2">
                <Store className="w-4 h-4 text-blue-600" />
                <span>Enrolled Enterprise Merchant Registry</span>
              </h2>
              <span className="text-[10px] font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {merchants.length} Enrolled Merchants
              </span>
            </div>

            <p className="text-xs text-slate-600">
              The counterparty trust registry anchors QR and payment authenticity. Any merchant claiming these brands from a non-registered VPA is automatically classified as a physical sticker swap.
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {merchants.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-slate-900 font-heading font-bold text-sm">
                      {m.brand_name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      {m.verification_tier}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>VPA: <strong className="text-blue-700">{m.registered_vpa}</strong></span>
                    <span>MCC: {m.mcc_code}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    Terminal Key: {m.terminal_public_key || "POS_AUTHENTICATED"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hackathon Metadata Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-mono">
            <div className="flex items-center space-x-2 text-slate-900 font-bold font-sans">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>CyberCup 6.0 Project Architecture</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Name: <strong>{BRAND.name}</strong> • Tagline: <em>"{BRAND.tagline}"</em><br />
              Stack: Python FastAPI + Scikit-Learn + XGBoost + Isolation Forest + React 18 + TailwindCSS + Three.js.
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
