import React, { useState } from "react";
import {
  MessageSquareWarning,
  Send,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Languages,
  CheckCircle2,
  Copy,
  ExternalLink
} from "lucide-react";
import RiskGauge from "../components/RiskGauge";
import { api } from "../utils/api";

const PRESET_MESSAGES = [
  {
    title: "Fake SBI YONO KYC Block",
    lang: "Hinglish",
    text: "Aapka SBI YONO account block ho gaya hai. Turant KYC update karein warna 24 ghante me band ho jayega: http://sbi-kyc-update.in"
  },
  {
    title: "BESCOM Power Cut Notice",
    lang: "English / Hinglish",
    text: "Dear consumer, your electricity power will be disconnected tonight at 9:30 PM from electricity office because your previous month bill was not updated. Please immediately contact our electricity officer at 9876543210. BESCOM"
  },
  {
    title: "CBI / TRAI Digital Arrest Notice",
    lang: "English",
    text: "TRAI & Delhi Cyber Police: Your Aadhaar linked mobile number is involved in 17 illegal money laundering cases. An arrest warrant has been issued. Press 1 to connect with DCP Officer immediately."
  },
  {
    title: "Meesho Refund QR Solicitation",
    lang: "Hinglish",
    text: "Sir aapka Meesho order cancel ho gaya tha, ₹1,850 refund pane ke liye phonepe par QR scan kare aur PIN dale."
  },
  {
    title: "Genuine HDFC Salary Credit",
    lang: "English",
    text: "Your A/c ending 4821 is credited with INR 3,200.00 on 14-Oct-26 by transfer from SHARMA R. Bal: INR 18,450.00 - HDFC Bank"
  }
];

export default function MessageIntelligencePage({ prefilledData }) {
  const [text, setText] = useState(prefilledData?.text || PRESET_MESSAGES[0].text);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await api.analyzeMessage(text);
      setResult(res);
    } catch (err) {
      console.error("Message analysis failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (msg) => {
    setText(msg.text);
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
                <Languages className="w-3.5 h-3.5 text-blue-600" />
                <span>MULTILINGUAL NLP PIPELINE</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                English • Hindi • Hinglish
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
              Message Threat Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
              Evaluates suspicious SMS, WhatsApp, and Telegram payment messages. Extracts psychological deception vectors: Artificial Urgency, Authority Impersonation, and Reverse-Debit lures.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {PRESET_MESSAGES.map((msg, idx) => (
              <button
                key={idx}
                onClick={() => loadPreset(msg)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-sm"
              >
                {msg.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Input (7 Cols) */}
        <form onSubmit={handleAnalyze} className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center space-x-2">
              <MessageSquareWarning className="w-4 h-4 text-blue-600" />
              <span>Input Message Text</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">
              {text.length} Characters
            </span>
          </div>

          <div>
            <textarea
              rows={6}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-800 text-xs sm:text-sm leading-relaxed focus:outline-none focus:bg-white"
              placeholder="Paste suspicious SMS, WhatsApp message, or cyber notice here in English or Hinglish..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Executing NLP Classification & Intent Extraction...</span>
            ) : (
              <>
                <Send className="w-4 h-4 text-white" />
                <span>Scan Message Threat Profile</span>
              </>
            )}
          </button>
        </form>

        {/* Right Output (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {result ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono text-blue-600 uppercase font-semibold">
                    Detected Language: {result.detected_language}
                  </span>
                  <h3 className="text-sm font-heading font-bold text-slate-900">
                    {result.category}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  ML Conf: {result.ml_confidence}%
                </span>
              </div>

              {/* Gauge */}
              <RiskGauge score={result.risk_score} subtitle={result.prediction} />

              {/* Safety Advice */}
              <div className={`p-4 rounded-xl border ${
                result.risk_score >= 50
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}>
                <span className="text-[10px] font-mono uppercase tracking-wider block font-bold mb-1">
                  Safety Guidance
                </span>
                <p className="text-xs leading-relaxed font-semibold">
                  {result.safety_guidance}
                </p>
              </div>

              {/* Psychological Vectors */}
              {result.tactics && result.tactics.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-heading font-semibold text-slate-900 block">
                    Psychological Deception Vectors
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.tactics.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Specific Indicators */}
              {result.indicators && result.indicators.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-heading font-semibold text-slate-900 block">
                    Forensic Indicators
                  </span>
                  <div className="space-y-1.5">
                    {result.indicators.map((ind, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-0.5"
                      >
                        <div className="flex justify-between font-mono">
                          <span className="text-slate-800 font-semibold">{ind.type}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                            {ind.severity}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{ind.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 font-mono">
                {result.summary}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center h-full min-h-[380px] space-y-3 shadow-sm">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <MessageSquareWarning className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900">
                Awaiting Message Input
              </h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Paste any SMS or WhatsApp notification to analyze language deceit patterns and intent manipulation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
