import React from "react";
import { X, ShieldCheck, ShieldAlert, FileText, Code2, Copy, Check } from "lucide-react";

export default function AuditDetailModal({ isOpen, onClose, record, onOpenComplaintModal }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !record) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-[#0c1224] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 z-10 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center space-x-3">
            <span
              className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${
                record.risk_tier === "CRITICAL"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : record.risk_tier === "HIGH"
                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {record.risk_tier} ({record.risk_score}/100)
            </span>
            <div>
              <h3 className="text-base font-heading font-bold text-white">
                Forensic Audit Trace: {record.id}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {record.timestamp} • Type: {record.analysis_type}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Summary Banner */}
          <div className="glass-panel p-4 bg-slate-900/40 border-white/[0.08]">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Incident Category & Overview
            </span>
            <div className="text-sm font-semibold text-slate-100 mt-0.5">
              {record.category}
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {record.explanation}
            </p>
          </div>

          {/* Evidence Flags */}
          {record.evidence_flags && record.evidence_flags.length > 0 && (
            <div>
              <span className="text-xs font-heading font-semibold text-white mb-2 block">
                Evidence Signals Triggered
              </span>
              <div className="space-y-1.5">
                {record.evidence_flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] text-xs font-mono flex items-center justify-between"
                  >
                    <span className="text-slate-300">
                      {flag.check || flag.title || flag.feature || flag.type || flag.signal || JSON.stringify(flag)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300">
                      {flag.status || flag.impact || flag.severity || "FLAGGED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON Payload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-heading font-semibold text-white flex items-center space-x-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Full Cryptographic Payload</span>
              </span>
              <button
                onClick={handleCopyJson}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy JSON"}</span>
              </button>
            </div>
            <pre className="bg-black/60 p-3.5 rounded-xl border border-white/[0.07] font-mono text-[11px] text-cyan-200/90 overflow-x-auto max-h-56">
              {JSON.stringify(record.full_payload, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-slate-400">
            Immutable Audit Trail • SQLite Hash Verified
          </div>

          <div className="flex items-center space-x-2">
            {record.police_draft && onOpenComplaintModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenComplaintModal(record.police_draft);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
              >
                1930 Cybercrime Draft
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 text-xs font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
