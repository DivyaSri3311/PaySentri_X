import React, { useState } from "react";
import { X, Copy, Check, Download, AlertTriangle, ShieldAlert } from "lucide-react";

export default function ComplaintModal({ isOpen, onClose, draftText }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !draftText) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([draftText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PaySentriX_1930_Complaint_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-[#0c1224] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-white">
                National Cyber Crime Portal 1930 Complaint Draft
              </h3>
              <p className="text-xs text-slate-400">
                Structured forensic report pre-formatted for submission to cybercrime.gov.in
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

        {/* Content Box */}
        <div className="bg-black/50 p-4 rounded-xl border border-white/[0.07] font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed selection:bg-cyan-500/40">
          {draftText}
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
          <div className="text-[11px] font-mono text-slate-400">
            Emergency Helpline: <span className="text-amber-400 font-bold">Call 1930</span> (Indian Cyber Crime Coordination Centre)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/[0.1] text-xs font-semibold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .TXT</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-cyan-glow"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied to Clipboard" : "Copy Incident Draft"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
