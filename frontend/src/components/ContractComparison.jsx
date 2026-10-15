import React from "react";
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  ExternalLink
} from "lucide-react";

export default function ContractComparison({ evaluation, onOpenComplaintModal }) {
  if (!evaluation) return null;

  const {
    contract_id,
    promise,
    execution,
    predicates = [],
    verdict,
    critical_warning,
    contradiction_detected,
    risk_score,
    risk_tier,
    recommendation,
    police_draft
  } = evaluation;

  return (
    <div className="space-y-6">
      {/* 1. Severe Contradiction Alert Banner */}
      {contradiction_detected && (
        <div className="contradiction-alert-box p-5 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-red-600/30 border border-red-500/50 rounded-xl text-rose-400 shrink-0">
              <AlertOctagon className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500 text-black">
                  CRITICAL CONTRADICTION
                </span>
                <span className="text-xs font-mono text-rose-300">
                  NPCI Rule Violation: Reverse-Debit Trap
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
                {critical_warning || `YOU ARE ABOUT TO PAY ₹${execution?.actual_amount?.toLocaleString()}, NOT RECEIVE IT.`}
              </h2>
              <p className="text-xs sm:text-sm text-rose-200/90 leading-relaxed">
                In UPI, you <strong className="underline decoration-rose-400 font-bold">never need to enter your UPI PIN</strong> or approve an outgoing collect transfer to receive money or refunds. The promise claimed incoming funds, but this transaction executes an immediate debit from your account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Side-by-Side Comparison: The Promise vs The Execution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {/* Left: The Promise */}
        <div className="glass-panel p-5 border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-slate-900/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-teal-400" />
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded">
                THE PROMISE
              </span>
              <span className="text-xs text-slate-400">Claimed Intent</span>
            </div>
            <ArrowDownLeft className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="space-y-3.5">
            <div>
              <span className="text-[11px] font-mono text-slate-400">Claimed Operation</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-base font-heading font-bold text-cyan-300">
                  {promise?.expected_direction === "CREDIT" ? "Incoming Fund (CREDIT)" : "Outgoing Payment (DEBIT)"}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-cyan-500/10 text-cyan-400 rounded">
                  {promise?.expected_purpose || "REFUND"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
              <div>
                <span className="text-[11px] font-mono text-slate-400">Promised Amount</span>
                <p className="text-lg font-heading font-bold text-white">
                  ₹{promise?.expected_amount?.toLocaleString() || "0"}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-400">Claimed Merchant</span>
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {promise?.claimed_entity || "Unknown Entity"}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06]">
              <span className="text-[11px] font-mono text-slate-400">Lure Communication</span>
              <p className="text-xs text-slate-300 italic bg-black/30 p-2.5 rounded-lg border border-white/[0.05] mt-1 line-clamp-3">
                "{promise?.raw_message}"
              </p>
            </div>
          </div>
        </div>

        {/* Right: The Actual Payment Execution */}
        <div className={`glass-panel p-5 relative overflow-hidden ${
          contradiction_detected
            ? "border-rose-500/40 bg-gradient-to-br from-rose-950/25 to-slate-900/60"
            : "border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900/60"
        }`}>
          <div className={`absolute top-0 left-0 w-full h-1 ${
            contradiction_detected ? "bg-gradient-to-r from-rose-500 to-red-600" : "bg-gradient-to-r from-emerald-400 to-teal-400"
          }`} />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                contradiction_detected
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}>
                ACTUAL EXECUTION
              </span>
              <span className="text-xs text-slate-400">Real Payment Payload</span>
            </div>
            <ArrowUpRight className={`w-5 h-5 ${contradiction_detected ? "text-rose-400" : "text-emerald-400"}`} />
          </div>

          <div className="space-y-3.5">
            <div>
              <span className="text-[11px] font-mono text-slate-400">Executing Action</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className={`text-base font-heading font-bold ${
                  execution?.actual_direction === "DEBIT" ? "text-rose-400" : "text-emerald-400"
                }`}>
                  Outgoing Bank Transfer (DEBIT)
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-rose-500/10 text-rose-300 rounded">
                  PIN Required
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
              <div>
                <span className="text-[11px] font-mono text-slate-400">Debit Amount</span>
                <p className="text-lg font-heading font-bold text-white">
                  ₹{execution?.actual_amount?.toLocaleString() || "0"}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-400">Recipient VPA</span>
                <p className="text-xs font-mono font-semibold text-rose-300 truncate" title={execution?.recipient_vpa}>
                  {execution?.recipient_vpa || "Unknown VPA"}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06]">
              <span className="text-[11px] font-mono text-slate-400">Registry Authentication</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                  contradiction_detected
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                }`}>
                  {contradiction_detected ? "Unregistered Personal Mule" : "Verified Corporate Merchant"}
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {execution?.recipient_name || "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Testable Security Predicates Checklist */}
      <div className="glass-panel p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-white/[0.07] gap-2">
          <div>
            <h3 className="text-sm font-heading font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Testable Payment Safety Predicates</span>
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic verification checks evaluated before authorizing simulated transaction.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 self-start sm:self-auto">
            Contract ID: <span className="text-cyan-300">{contract_id}</span>
          </span>
        </div>

        <div className="space-y-3">
          {predicates.map((p, idx) => {
            const isPass = p.status === "PASS";
            const isFail = p.status === "FAIL";
            const isUnknown = p.status === "UNKNOWN";

            return (
              <div
                key={p.check_id || idx}
                className={`p-3.5 rounded-xl border transition-all ${
                  isFail
                    ? "bg-rose-950/20 border-rose-500/40"
                    : isPass
                    ? "bg-emerald-950/15 border-emerald-500/25"
                    : "bg-amber-950/15 border-amber-500/25"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center space-x-2">
                    {isPass && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {isFail && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    {isUnknown && <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                    <span className="text-xs font-semibold text-white">
                      {p.title}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {p.check_id}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded self-start sm:self-auto ${
                      isPass
                        ? "bg-emerald-500/20 text-emerald-300"
                        : isFail
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-2">
                  {p.reason}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-black/30 p-2 rounded-lg border border-white/[0.04]">
                  <div>
                    <span className="text-slate-500">Expected: </span>
                    <span className="text-slate-200">{p.expected_value}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Actual: </span>
                    <span className={isFail ? "text-rose-400 font-semibold" : "text-emerald-400"}>
                      {p.actual_value}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Recommendation & Cybercrime Draft Button */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono text-slate-400">Recommended Security Action</span>
            <p className="text-xs font-semibold text-slate-200">
              {recommendation}
            </p>
          </div>

          {police_draft && (
            <button
              onClick={() => onOpenComplaintModal(police_draft)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all shrink-0 self-start sm:self-auto"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate 1930 Cybercrime Draft</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
