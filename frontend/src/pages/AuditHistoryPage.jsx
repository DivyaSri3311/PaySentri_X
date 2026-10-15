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
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>IMMUTABLE SQLITE FORENSICS</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {total} Total Audit Traces Logged
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
              Audit History & Forensic Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
              Persistent chain of custody capturing every contract evaluation, simulated transaction vector, decoded QR, and link inspection with testable evidence outputs.
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-sm self-start sm:self-auto shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Ledger</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
            placeholder="Search Transaction ID, category, or VPA..."
          />
        </form>

        {/* Filter Dropdowns */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Analysis Type Filter */}
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
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
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="CRITICAL">Critical Threats</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium / Suspicious</option>
            <option value="SAFE">Safe / Legitimate</option>
          </select>

          <button
            onClick={loadRecords}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-mono text-slate-500">
                <th className="py-3 px-4 font-semibold">Audit ID</th>
                <th className="py-3 px-3 font-semibold">Timestamp</th>
                <th className="py-3 px-3 font-semibold">Type</th>
                <th className="py-3 px-3 font-semibold">Input Summary</th>
                <th className="py-3 px-3 text-right font-semibold">Risk Score</th>
                <th className="py-3 px-3 font-semibold">Fraud Category</th>
                <th className="py-3 px-3 text-center font-semibold">Contract Status</th>
                <th className="py-3 px-4 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                    Querying SQLite forensic ledger...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => onOpenAuditDetail(rec)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {rec.id}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {rec.timestamp ? rec.timestamp.slice(0, 19).replace("T", " ") : "-"}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                        {rec.analysis_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-slate-800 font-medium">
                      {rec.input_summary}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span
                        className={
                          rec.risk_tier === "CRITICAL"
                            ? "text-rose-600 font-extrabold"
                            : rec.risk_tier === "HIGH"
                            ? "text-orange-600 font-bold"
                            : "text-emerald-600"
                        }
                      >
                        {rec.risk_score}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 truncate max-w-[180px]">
                      {rec.category}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          rec.contract_verdict === "FAIL"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : rec.contract_verdict === "PASS"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
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
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"
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
