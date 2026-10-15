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
        <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-rose-100 border border-rose-200 rounded-xl text-rose-600 shrink-0">
              <AlertOctagon className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                  CRITICAL CONTRADICTION
                </span>
                <span className="text-xs font-mono text-rose-700 font-semibold">
                  NPCI Rule Violation: Reverse-Debit Trap
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-rose-950 tracking-tight">
                {critical_warning || `YOU ARE ABOUT TO PAY ₹${execution?.actual_amount?.toLocaleString()}, NOT RECEIVE IT.`}
              </h2>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">
                In UPI, you <strong className="underline decoration-rose-500 font-bold">never need to enter your UPI PIN</strong> or approve an outgoing collect transfer to receive money or refunds. The promise claimed incoming funds, but this transaction executes an immediate debit from your account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Side-by-Side Comparison: The Promise vs The Execution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {/* Left: The Promise */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                THE PROMISE
              </span>
              <span className="text-xs text-slate-500">Claimed Intent</span>
            </div>
            <ArrowDownLeft className="w-5 h-5 text-blue-600" />
          </div>

          <div className="space-y-3.5">
            <div>
              <span className="text-[11px] font-mono text-slate-500">Claimed Operation</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-base font-heading font-bold text-blue-700">
                  {promise?.expected_direction === "CREDIT" ? "Incoming Fund (CREDIT)" : "Outgoing Payment (DEBIT)"}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-50 text-blue-600 rounded">
                  {promise?.expected_purpose || "REFUND"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <span className="text-[11px] font-mono text-slate-500">Promised Amount</span>
                <p className="text-lg font-heading font-bold text-slate-900">
                  ₹{promise?.expected_amount?.toLocaleString() || "0"}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-500">Claimed Merchant</span>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {promise?.claimed_entity || "Unknown Entity"}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-mono text-slate-500">Lure Communication</span>
              <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1 line-clamp-3">
                "{promise?.raw_message}"
              </p>
            </div>
          </div>
        </div>

        {/* Right: The Actual Payment Execution */}
        <div className={`bg-white border rounded-xl p-5 shadow-sm relative overflow-hidden ${
          contradiction_detected ? "border-rose-200" : "border-emerald-200"
        }`}>
          <div className={`absolute top-0 left-0 w-full h-1 ${
            contradiction_detected ? "bg-rose-500" : "bg-emerald-500"
          }`} />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                contradiction_detected
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                ACTUAL EXECUTION
              </span>
              <span className="text-xs text-slate-500">Real Payment Payload</span>
            </div>
            <ArrowUpRight className={`w-5 h-5 ${contradiction_detected ? "text-rose-500" : "text-emerald-500"}`} />
          </div>

          <div className="space-y-3.5">
            <div>
              <span className="text-[11px] font-mono text-slate-500">Executing Action</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className={`text-base font-heading font-bold ${
                  execution?.actual_direction === "DEBIT" ? "text-rose-600" : "text-emerald-600"
                }`}>
                  Outgoing Bank Transfer (DEBIT)
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold">
                  PIN Required
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <span className="text-[11px] font-mono text-slate-500">Debit Amount</span>
                <p className="text-lg font-heading font-bold text-slate-900">
                  ₹{execution?.actual_amount?.toLocaleString() || "0"}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-500">Recipient VPA</span>
                <p className="text-xs font-mono font-semibold text-rose-600 truncate" title={execution?.recipient_vpa}>
                  {execution?.recipient_vpa || "Unknown VPA"}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-mono text-slate-500">Registry Authentication</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-semibold ${
                  contradiction_detected
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>
                  {contradiction_detected ? "Unregistered Personal Mule" : "Verified Corporate Merchant"}
                </span>
                <span className="text-xs text-slate-600 truncate">
                  {execution?.recipient_name || "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Testable Security Predicates Checklist */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-heading font-bold text-slate-900 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Testable Payment Safety Predicates</span>
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic verification checks evaluated before authorizing simulated transaction.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 self-start sm:self-auto">
            Contract ID: <span className="text-blue-600 font-semibold">{contract_id}</span>
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
                    ? "bg-rose-50/60 border-rose-200"
                    : isPass
                    ? "bg-emerald-50/60 border-emerald-200"
                    : "bg-amber-50/60 border-amber-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center space-x-2">
                    {isPass && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {isFail && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    {isUnknown && <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                    <span className="text-xs font-semibold text-slate-900">
                      {p.title}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {p.check_id}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded self-start sm:self-auto ${
                      isPass
                        ? "bg-emerald-100 text-emerald-800"
                        : isFail
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-2">
                  {p.reason}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-white p-2 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500">Expected: </span>
                    <span className="text-slate-800 font-medium">{p.expected_value}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Actual: </span>
                    <span className={isFail ? "text-rose-600 font-bold" : "text-emerald-700 font-semibold"}>
                      {p.actual_value}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Recommendation & Cybercrime Draft Button */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono text-slate-500">Recommended Security Action</span>
            <p className="text-xs font-semibold text-slate-800">
              {recommendation}
            </p>
          </div>

          {police_draft && (
            <button
              onClick={() => onOpenComplaintModal(police_draft)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all shrink-0 self-start sm:self-auto shadow-sm"
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
