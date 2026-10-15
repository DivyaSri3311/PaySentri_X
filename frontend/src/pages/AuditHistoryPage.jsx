import React, { useEffect, useState } from "react";
import {
  FileText,
  Search,
  Filter,
  Download,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { api } from "../utils/api";

export default function AuditHistoryPage({ onOpenAuditDetail, onOpenComplaintModal }) {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [analysisType, setAnalysisType] = useState("ALL");
  const [riskTier, setRiskTier] = useState("ALL");

  useEffect(() => {
    loadRecords();
  }, [analysisType, riskTier]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditRecords({
        analysis_type: analysisType,
        risk_tier: riskTier,
        q: search,
        limit: 50
      });
      setRecords(res.records || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("Failed to load audit records:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadRecords();
  };

  const exportCSV = () => {
    if (!records.length) return;
    const headers = ["ID", "Timestamp", "Type", "RiskScore", "Tier", "Category", "Verdict", "Summary"];
    const rows = records.map((r) => [
      r.id,
      r.timestamp,
      r.analysis_type,
      r.risk_score,
      r.risk_tier,
      `"${r.category.replace(/"/g, '""')}"`,
      r.contract_verdict,
      `"${r.input_summary.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PaySentriX_AuditLedger_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="glass-panel p-6 border-cyan-500/20 bg-gradient-to-r from-[#0b1226] to-[#080d1a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded flex items-center space-x-1">
                <FileText className="w-3 h-3 text-cyan-400" />
                <span>IMMUTABLE SQLITE FORENSICS</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {total} Total Audit Traces Logged
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
              Audit History & Forensic Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Persistent chain of custody capturing every contract evaluation, simulated transaction vector, decoded QR, and link inspection with testable evidence outputs.
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/[0.1] text-xs font-semibold transition-all self-start sm:self-auto shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Ledger</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/[0.1] focus:border-cyan-400 text-white text-xs focus:outline-none"
            placeholder="Search Transaction ID, category, or VPA..."
          />
        </form>

        {/* Filter Dropdowns */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Analysis Type Filter */}
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] focus:border-cyan-400 text-slate-200 font-mono text-xs focus:outline-none"
          >
            <option value="ALL">All Analysis Types</option>
            <option value="CONTRACT">AI Payment Contract</option>
            <option value="TRANSACTION">Transaction ML</option>
            <option value="MESSAGE">Message Intelligence</option>
            <option value="LINK">Payment Link</option>
            <option value="QR">QR Guardian</option>
            <option value="EVOLUTION">Evolution Lab</option>
          </select>

          {/* Risk Tier Filter */}
          <select
            value={riskTier}
            onChange={(e) => setRiskTier(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] focus:border-cyan-400 text-slate-200 font-mono text-xs focus:outline-none"
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="CRITICAL">Critical Threats</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium / Suspicious</option>
            <option value="SAFE">Safe / Legitimate</option>
          </select>

          <button
            onClick={loadRecords}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08]"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-black/30 font-mono text-slate-400">
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Input Summary</th>
                <th className="py-3 px-3 text-right">Risk Score</th>
                <th className="py-3 px-3">Fraud Category</th>
                <th className="py-3 px-3 text-center">Contract Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                    Querying SQLite forensic ledger...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    onClick={() => onOpenAuditDetail(rec)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                      {rec.id}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                      {rec.timestamp ? rec.timestamp.slice(0, 19).replace("T", " ") : "-"}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 text-[10px]">
                        {rec.analysis_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-slate-200">
                      {rec.input_summary}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span
                        className={
                          rec.risk_tier === "CRITICAL"
                            ? "text-rose-400 font-extrabold"
                            : rec.risk_tier === "HIGH"
                            ? "text-orange-400 font-bold"
                            : "text-emerald-400"
                        }
                      >
                        {rec.risk_score}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 truncate max-w-[180px]">
                      {rec.category}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          rec.contract_verdict === "FAIL"
                            ? "bg-rose-500/20 text-rose-300"
                            : rec.contract_verdict === "PASS"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {rec.contract_verdict}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAuditDetail(rec);
                        }}
                        className="p-1 rounded hover:bg-white/[0.08] text-slate-400 hover:text-cyan-400"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
