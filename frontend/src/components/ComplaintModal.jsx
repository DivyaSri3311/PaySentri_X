import React, { useState } from "react";
import { X, Copy, Check, Download, ShieldAlert } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-slate-900">
                National Cyber Crime Portal 1930 Complaint Draft
              </h3>
              <p className="text-xs text-slate-500">
                Structured forensic report pre-formatted for submission to cybercrime.gov.in
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

        {/* Content Box */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
          {draftText}
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-[11px] font-mono text-slate-500">
            Emergency Helpline: <span className="text-amber-600 font-bold">Call 1930</span> (Indian Cyber Crime Coordination Centre)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .TXT</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
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
