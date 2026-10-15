import React, { useState } from "react";
import { X, ShieldCheck, ShieldAlert, FileText, Code2, Copy, Check } from "lucide-react";

export default function AuditDetailModal({ isOpen, onClose, record, onOpenComplaintModal }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !record) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 z-10 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center space-x-3">
            <span
              className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${
                record.risk_tier === "CRITICAL"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : record.risk_tier === "HIGH"
                  ? "bg-orange-50 text-orange-700 border border-orange-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {record.risk_tier} ({record.risk_score}/100)
            </span>
            <div>
              <h3 className="text-base font-heading font-bold text-slate-900">
                Forensic Audit Trace: {record.id}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {record.timestamp} • Type: {record.analysis_type}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Summary Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Incident Category & Overview
            </span>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">
              {record.category}
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {record.explanation}
            </p>
          </div>

          {/* Evidence Flags */}
          {record.evidence_flags && record.evidence_flags.length > 0 && (
            <div>
              <span className="text-xs font-heading font-semibold text-slate-900 mb-2 block">
                Evidence Signals Triggered
              </span>
              <div className="space-y-1.5">
                {record.evidence_flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between"
                  >
                    <span className="text-slate-700">
                      {flag.detail || flag.check || flag.title || flag.feature || flag.type || flag.signal || JSON.stringify(flag)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium shrink-0 ml-2">
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
              <span className="text-xs font-heading font-semibold text-slate-900 flex items-center space-x-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Full Cryptographic Payload</span>
              </span>
              <button
                onClick={handleCopyJson}
                className="text-[11px] font-mono text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy JSON"}</span>
              </button>
            </div>
            <pre className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto max-h-56">
              {JSON.stringify(record.full_payload, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-slate-500">
            Immutable Audit Trail • SQLite Hash Verified
          </div>

          <div className="flex items-center space-x-2">
            {record.police_draft && onOpenComplaintModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenComplaintModal(record.police_draft);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all shadow-sm"
              >
                1930 Cybercrime Draft
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
