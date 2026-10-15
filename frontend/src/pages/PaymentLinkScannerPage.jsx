import React, { useState } from "react";
import {
  Link2,
  Send,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Globe,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Copy
} from "lucide-react";
import RiskGauge from "../components/RiskGauge";
import { api } from "../utils/api";

const PRESET_LINKS = [
  {
    title: "Typosquatted SBI YONO Portal",
    type: "Phishing HTTPS",
    link: "https://onlinesbi-pan-kyc-verify.top/portal/update-card"
  },
  {
    title: "Amazon ₹5,000 Reverse-Debit Link",
    type: "UPI Deep Link",
    link: "upi://pay?pa=amz.refund.desk@ybl&pn=Amazon%20Refund%20Desk&am=5000&cu=INR&tn=Refund%20Approval%20Voucher"
  },
  {
    title: "Official HDFC Bank Portal",
    type: "Verified Domain",
    link: "https://hdfcbank.com/personal/ways-to-bank/online-banking"
  },
  {
    title: "Blocked Internal Loopback SSRF",
    type: "SSRF Attack Test",
    link: "http://127.0.0.1:8080/admin/secrets"
  }
];

export default function PaymentLinkScannerPage({ prefilledData }) {
  const [linkInput, setLinkInput] = useState(prefilledData?.link || PRESET_LINKS[0].link);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    if (!linkInput.trim()) return;
    setLoading(true);
    try {
      const res = await api.scanLink(linkInput);
      setResult(res);
    } catch (err) {
      console.error("Link scan failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (preset) => {
    setLinkInput(preset.link);
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
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>SSRF PROTECTED INSPECTOR</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                RFC1918 Private Range Shield Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
              Payment Link & UPI Deep Link Scanner
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
              Dissects UPI intent deep links (`upi://pay?...`) and conducts safe lexical and structural inspection of payment URLs to detect typosquatting, high-risk TLDs, and SSRF attacks.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {PRESET_LINKS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => loadPreset(preset)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-sm"
              >
                {preset.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (7 Cols) */}
        <form onSubmit={handleScan} className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center space-x-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              <span>Enter UPI URI or Web URL</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">
              Safe Non-Executing Sandbox
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Target Link to Inspect *
            </label>
            <input
              type="text"
              required
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 font-mono text-xs sm:text-sm focus:outline-none focus:bg-white"
              placeholder="e.g. upi://pay?pa=... or https://..."
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="text-slate-900 font-semibold flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Built-in SSRF & Execution Guardrails</span>
            </div>
            <p>
              PaySentriX never opens remote external connections or executes client code. DNS resolution is strictly validated against private RFC 1918 subnets and cloud metadata services.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Inspecting URI Structure & Domain Entropy...</span>
            ) : (
              <>
                <Send className="w-4 h-4 text-white" />
                <span>Execute Deep Link Security Audit</span>
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
                    Protocol: {result.type}
                  </span>
                  <h3 className="text-sm font-heading font-bold text-slate-900">
                    {result.prediction}
                  </h3>
                </div>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  result.ssrf_safe ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  SSRF: {result.ssrf_safe ? "CLEARED" : "BLOCKED"}
                </span>
              </div>

              {/* Gauge */}
              <RiskGauge score={result.risk_score} subtitle={result.risk_tier} />

              {/* UPI Intent Decoded Breakdown */}
              {result.type === "UPI_DEEP_LINK" && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
                  <span className="text-[10px] uppercase text-blue-600 font-bold block mb-1">
                    Decoded NPCI UPI Intent Fields
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payee VPA (`pa`):</span>
                    <span className="text-rose-600 font-bold">{result.payee_vpa}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payee Name (`pn`):</span>
                    <span className="text-slate-800 font-medium">{result.payee_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount (`am`):</span>
                    <span className="text-slate-900 font-bold">₹{result.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Note (`tn`):</span>
                    <span className="text-slate-700 italic">{result.transaction_note || "None"}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Payment Direction:</span>
                    <span className="text-rose-600 font-bold">{result.direction}</span>
                  </div>
                </div>
              )}

              {/* Findings */}
              <div className="space-y-2">
                <span className="text-xs font-heading font-semibold text-slate-900 block">
                  Security Findings & Evidence Chain
                </span>
                <div className="space-y-2">
                  {(result.findings || []).map((f, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-0.5"
                    >
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-800 font-semibold">{f.check}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            f.severity === "CRITICAL"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : f.severity === "SAFE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {f.result}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{f.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center h-full min-h-[380px] space-y-3 shadow-sm">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <Link2 className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900">
                Awaiting Link Input
              </h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Enter any payment URL or UPI deep link above to test domain legitimacy and transaction note parameters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
