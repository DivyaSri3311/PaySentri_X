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
    title: "Amazon ₹5,000 Reverse-Debit Collect Link",
    type: "UPI Deep Link",
    link: "upi://pay?pa=amz.refund.desk@ybl&pn=Amazon%20Refund%20Desk&am=5000&cu=INR&tn=Refund%20Approval%20Voucher"
  },
  {
    title: "Official HDFC Bank Portal (Whitelisted)",
    type: "Verified Domain",
    link: "https://hdfcbank.com/personal/ways-to-bank/online-banking"
  },
  {
    title: "Blocked Internal Loopback SSRF Attack",
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
      <div className="glass-panel p-6 border-cyan-500/20 bg-gradient-to-r from-[#0b1226] to-[#080d1a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded flex items-center space-x-1">
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>SSRF PROTECTED INSPECTOR</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                RFC1918 Private Range Shield Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
              Payment Link & UPI Deep Link Scanner
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Dissects UPI intent deep links (`upi://pay?...`) and conducts safe lexical and structural inspection of payment URLs to detect typosquatting, high-risk TLDs, and SSRF attacks.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {PRESET_LINKS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => loadPreset(preset)}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-cyan-500/15 border border-white/[0.08] text-slate-200 text-xs font-semibold transition-all"
              >
                {preset.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (7 Cols) */}
        <form onSubmit={handleScan} className="lg:col-span-7 glass-panel p-5 space-y-4">
          <div className="pb-3 border-b border-white/[0.08] flex items-center justify-between">
            <h2 className="text-sm font-heading font-bold text-white flex items-center space-x-2">
              <Link2 className="w-4 h-4 text-cyan-400" />
              <span>Enter UPI URI or Web URL</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">
              Safe Non-Executing Sandbox
            </span>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1">
              Target Link to Inspect *
            </label>
            <input
              type="text"
              required
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/[0.1] focus:border-cyan-400 text-white font-mono text-xs sm:text-sm focus:outline-none"
              placeholder="e.g. upi://pay?pa=... or https://..."
            />
          </div>

          <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05] text-[11px] text-slate-400 space-y-1">
            <div className="text-slate-300 font-semibold flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Built-in SSRF & Execution Guardrails</span>
            </div>
            <p>
              PaySentriX never opens remote external connections or executes client code. DNS resolution is strictly validated against private RFC 1918 subnets and cloud metadata services.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-heading font-bold text-sm shadow-cyan-glow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Inspecting URI Structure & Domain Entropy...</span>
            ) : (
              <>
                <Send className="w-4 h-4 text-black" />
                <span>Execute Deep Link Security Audit</span>
              </>
            )}
          </button>
        </form>

        {/* Right Output (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {result ? (
            <div className="glass-panel p-5 space-y-5 border-cyan-500/30 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase">
                    Protocol: {result.type}
                  </span>
                  <h3 className="text-sm font-heading font-bold text-white">
                    {result.prediction}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  SSRF: {result.ssrf_safe ? "CLEARED" : "BLOCKED"}
                </span>
              </div>

              {/* Gauge */}
              <RiskGauge score={result.risk_score} subtitle={result.risk_tier} />

              {/* UPI Intent Decoded Breakdown */}
              {result.type === "UPI_DEEP_LINK" && (
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-2 text-xs font-mono">
                  <span className="text-[10px] uppercase text-cyan-400 font-bold block mb-1">
                    Decoded NPCI UPI Intent Fields
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payee VPA (`pa`):</span>
                    <span className="text-rose-300 font-bold">{result.payee_vpa}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payee Name (`pn`):</span>
                    <span className="text-slate-200">{result.payee_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount (`am`):</span>
                    <span className="text-white font-bold">₹{result.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Note (`tn`):</span>
                    <span className="text-slate-300 italic">{result.transaction_note || "None"}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/[0.06]">
                    <span className="text-slate-400">Payment Direction:</span>
                    <span className="text-rose-400 font-bold">{result.direction}</span>
                  </div>
                </div>
              )}

              {/* Findings */}
              <div className="space-y-2">
                <span className="text-xs font-heading font-semibold text-white block">
                  Security Findings & Evidence Chain
                </span>
                <div className="space-y-2">
                  {(result.findings || []).map((f, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] text-xs space-y-0.5"
                    >
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-200 font-semibold">{f.check}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded ${
                            f.severity === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-300 font-bold"
                              : f.severity === "SAFE"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {f.result}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{f.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 text-center flex flex-col items-center justify-center h-full min-h-[380px] space-y-3">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Link2 className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-base font-heading font-bold text-white">
                Awaiting Link Input
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Enter any payment URL or UPI deep link above to test domain legitimacy and transaction note parameters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
