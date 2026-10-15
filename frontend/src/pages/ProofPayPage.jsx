import React, { useState, useEffect, useRef } from "react";
import {
  FileCheck,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Search,
  Sparkles,
  Download,
  Printer,
  RefreshCw,
  Eye,
  Layers,
  ArrowRight,
  Database,
  Hash,
  AlertOctagon,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Sliders,
  DollarSign,
  User,
  Building,
  Info,
  Calendar,
  Zap,
  Lock,
  Cpu
} from "lucide-react";
import { api } from "../utils/api";

export default function ProofPayPage() {
  const [activeTab, setActiveTab] = useState("inspector"); // 'inspector' | 'demolab' | 'challengepay' | 'ledger' | 'history'
  
  // Inspector Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [merchantId, setMerchantId] = useState("MERCH-STARBUCKS-01");
  const [orderId, setOrderId] = useState("ORD-20261015-8821");
  const [expectedAmount, setExpectedAmount] = useState("850.00");
  const [expectedVpa, setExpectedVpa] = useState("starbucks.pay@hdfcbank");
  const [useGemini, setUseGemini] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  
  // Execution & Results
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [result, setResult] = useState(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [activeBoxIndex, setActiveBoxIndex] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  
  // Demo Lab State
  const [scenarios, setScenarios] = useState([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [executingScenarioId, setExecutingScenarioId] = useState(null);
  
  // ChallengePay Orders State
  const [newOrderAmount, setNewOrderAmount] = useState("1200.00");
  const [newOrderCustomer, setNewOrderCustomer] = useState("Aarav Mehta");
  const [newOrderVpa, setNewOrderVpa] = useState("starbucks.pay@hdfcbank");
  const [newOrderNote, setNewOrderNote] = useState("Espresso Roast & Bakery Items");
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
  // Ledger State
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  
  // History State
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("ALL");
  const [historySearch, setHistorySearch] = useState("");
  
  // Active Report Modal
  const [activeReportModal, setActiveReportModal] = useState(null);

  const fileInputRef = useRef(null);
  const imageContainerRef = useRef(null);

  // Load scenarios on mount
  useEffect(() => {
    fetchScenarios();
  }, []);

  // Tab change effects
  useEffect(() => {
    if (activeTab === "demolab") {
      fetchScenarios();
    } else if (activeTab === "ledger") {
      fetchLedger();
    } else if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchScenarios = async () => {
    setLoadingScenarios(true);
    try {
      const res = await api.proofpay.getScenarios();
      const list = Array.isArray(res) ? res : (res?.scenarios || []);
      setScenarios(list);
    } catch (err) {
      console.warn("Failed to fetch ProofPay demo scenarios:", err);
    } finally {
      setLoadingScenarios(false);
    }
  };

  const fetchLedger = async () => {
    setLoadingLedger(true);
    try {
      const res = await api.proofpay.getLedger({ limit: 50 });
      const list = Array.isArray(res) ? res : (res?.ledger || []);
      setLedgerEntries(list);
    } catch (err) {
      console.warn("Failed to fetch simulated ledger:", err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.proofpay.getHistory({ limit: 50 });
      const list = Array.isArray(res) ? res : (res?.history || []);
      setHistoryRecords(list);
    } catch (err) {
      console.warn("Failed to fetch verification history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErrorMsg("Please upload a valid PNG, JPEG, or WEBP payment screenshot.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File size exceeds 10 MB limit.");
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } };
      handleFileSelect(fakeEvent);
    }
  };

  const runAnalysis = async () => {
    if (!selectedFile) {
      setErrorMsg("Please select or drop a payment screenshot first.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (merchantId) formData.append("merchant_id", merchantId);
      if (orderId) formData.append("order_id", orderId);
      if (expectedAmount) formData.append("expected_amount", expectedAmount);
      if (expectedVpa) formData.append("expected_vpa", expectedVpa);
      formData.append("use_gemini", useGemini ? "true" : "false");
      if (geminiApiKey.trim()) formData.append("gemini_api_key", geminiApiKey.trim());

      const res = await api.proofpay.analyzeScreenshot(formData);
      setResult(res);
      // Auto-refresh history if saved
      fetchHistory();
    } catch (err) {
      setErrorMsg(err.message || "Failed to analyze screenshot. Please check backend connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runDemoScenario = async (scenario) => {
    setExecutingScenarioId(scenario.id);
    setErrorMsg(null);
    try {
      const payload = {
        image_base64: scenario.image_base64,
        filename: `${scenario.id}.jpg`,
        order_id: scenario.order_id,
        merchant_id: scenario.merchant_id,
        expected_amount: scenario.expected_amount,
        recipient_vpa: scenario.expected_vpa,
        gemini_api_key: geminiApiKey.trim() || null
      };

      const res = await api.proofpay.verifyPayment(payload);
      setResult(res);
      
      // Update form inputs to match the scenario
      setMerchantId(scenario.merchant_id);
      setOrderId(scenario.order_id);
      setExpectedAmount(scenario.expected_amount?.toString() || "");
      setExpectedVpa(scenario.expected_vpa || "");
      
      if (scenario.image_base64) {
        setPreviewUrl(`data:image/jpeg;base64,${scenario.image_base64}`);
      }
      
      setActiveTab("inspector");
    } catch (err) {
      setErrorMsg(`Failed to execute scenario: ${err.message}`);
    } finally {
      setExecutingScenarioId(null);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm("Reset all ProofPay demo data (orders, ledger, verifications) back to seed state?")) {
      return;
    }
    try {
      await api.proofpay.resetDemo();
      fetchScenarios();
      fetchLedger();
      fetchHistory();
      alert("ProofPay Demo state reset successfully.");
    } catch (err) {
      alert("Error resetting demo: " + err.message);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setIsCreatingOrder(true);
    try {
      const res = await api.proofpay.createOrder({
        merchant_id: merchantId,
        expected_amount: parseFloat(newOrderAmount),
        recipient_vpa: newOrderVpa,
        customer_name: newOrderCustomer
      });
      setCreatedOrder(res);
      setOrderId(res.order_id);
      setExpectedAmount(res.expected_amount?.toString() || newOrderAmount);
      setExpectedVpa(res.recipient_vpa || newOrderVpa);
    } catch (err) {
      alert("Failed to create order: " + err.message);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const exportReportJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proofpay_report_${result.analysis_id || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper colors for verdicts
  const getIntegrityBadge = (status) => {
    switch (status) {
      case "NO_OBVIOUS_MANIPULATION":
        return {
          bg: "bg-emerald-950/40 text-emerald-400 border-emerald-500/30",
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          label: "No Obvious Manipulation"
        };
      case "SUSPICIOUS":
        return {
          bg: "bg-rose-950/40 text-rose-400 border-rose-500/30",
          icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
          label: "Suspicious Visual Anomalies"
        };
      case "INCONCLUSIVE":
      default:
        return {
          bg: "bg-amber-950/40 text-amber-400 border-amber-500/30",
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          label: "Inconclusive Visuals"
        };
    }
  };

  const getVerificationBadge = (status) => {
    switch (status) {
      case "CONFIRMED":
        return {
          bg: "bg-emerald-950/40 text-emerald-400 border-emerald-500/30",
          icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
          label: "Settlement Confirmed"
        };
      case "PENDING":
        return {
          bg: "bg-amber-950/40 text-amber-400 border-amber-500/30",
          icon: <Clock className="w-4 h-4 text-amber-400" />,
          label: "Pending in Ledger"
        };
      case "NOT_FOUND":
        return {
          bg: "bg-rose-950/40 text-rose-400 border-rose-500/30",
          icon: <XCircle className="w-4 h-4 text-rose-400" />,
          label: "Not Found in Ledger"
        };
      case "MISMATCHED":
        return {
          bg: "bg-rose-950/40 text-rose-400 border-rose-500/30",
          icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
          label: "Ledger Data Mismatched"
        };
      case "UNVERIFIED":
      default:
        return {
          bg: "bg-slate-900/60 text-slate-400 border-slate-700/50",
          icon: <Info className="w-4 h-4 text-slate-400" />,
          label: "Verification Unavailable"
        };
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case "FULFILL_ORDER_SAFELY":
        return { bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40", label: "Fulfill Order Safely" };
      case "REJECT_PROOF_IMMEDIATELY":
        return { bg: "bg-rose-500/20 text-rose-400 border-rose-500/40", label: "Reject Proof Immediately" };
      case "REQUEST_FRESH_PAYMENT":
        return { bg: "bg-rose-500/20 text-rose-400 border-rose-500/40", label: "Request Fresh Payment" };
      case "WAIT_FOR_SETTLEMENT":
        return { bg: "bg-amber-500/20 text-amber-400 border-amber-500/40", label: "Wait For Settlement" };
      case "VERIFY_BEFORE_FULFILLMENT":
      default:
        return { bg: "bg-amber-500/20 text-amber-400 border-amber-500/40", label: "Verify Before Fulfillment" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#090d16] border border-slate-800 p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shadow-sm">
                <FileCheck className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-2xl font-bold font-heading text-slate-100 tracking-tight">
                    ProofPay
                  </h1>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/30">
                    AI Screenshot Forensics
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                    CC6-AI02
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  <span className="text-teal-400/90 font-semibold italic">"A Screenshot Can Be Faked. A Transaction Must Be Verified."</span>
                  <span className="mx-2 text-slate-600">•</span>
                  Detects modified UPI receipts, prevents replay attacks & verifies against independent merchant ledger.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Engine Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Gemini 2.5 Flash</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>OpenCV ELA</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>ReplayGuard</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>ChallengePay</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 border-t border-slate-800/80 mt-6 pt-3 overflow-x-auto">
          {[
            { id: "inspector", label: "Forensic Inspector & Upload", icon: Eye },
            { id: "demolab", label: "CyberCup Demo Lab (5 Scenarios)", icon: Zap, badge: "Interactive" },
            { id: "challengepay", label: "ChallengePay Orders", icon: Sliders },
            { id: "ledger", label: "Simulated Merchant Ledger", icon: Database },
            { id: "history", label: "ReplayGuard Vault & Audit", icon: Hash },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-teal-400" : "text-slate-500"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: FORENSIC INSPECTOR & UPLOAD */}
      {activeTab === "inspector" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Upload & Binding Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Upload Box */}
            <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-teal-400" />
                  <span>Upload Payment Screenshot</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">PNG, JPG, WEBP &lt; 10MB</span>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? "border-teal-500/40 bg-teal-500/5"
                    : "border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-3">
                    <img
                      src={previewUrl}
                      alt="Uploaded Screenshot Preview"
                      className="max-h-48 mx-auto rounded-lg shadow-md border border-slate-800 object-contain"
                    />
                    <div className="text-xs text-slate-300">
                      <span className="font-medium text-teal-400">{selectedFile?.name || "Payment Receipt"}</span>
                      {selectedFile && (
                        <span className="text-slate-500 ml-2">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">Click or drop a different image to replace</p>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-medium text-slate-300">
                      Drag & Drop payment screenshot here, or <span className="text-teal-400 underline">browse</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Accepts Google Pay, PhonePe, Paytm, BHIM, Amazon Pay receipts
                    </p>
                  </div>
                )}
              </div>

              {/* Merchant Order Binding Section */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    <span>ChallengePay Verification Binder</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">Independent Ledger Check</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Merchant Profile</label>
                    <select
                      value={merchantId}
                      onChange={(e) => setMerchantId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="MERCH-STARBUCKS-01">Starbucks Coffee (MERCH-STARBUCKS-01)</option>
                      <option value="MERCH-ZOMATO-02">Zomato Food Delivery (MERCH-ZOMATO-02)</option>
                      <option value="MERCH-CHAI-03">Sharma Chai Tapri (MERCH-CHAI-03)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Bind to Order ID</label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="e.g. ORD-20261015-8821"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Expected Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={expectedAmount}
                        onChange={(e) => setExpectedAmount(e.target.value)}
                        placeholder="850.00"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-6 pr-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Expected Recipient VPA</label>
                    <input
                      type="text"
                      value={expectedVpa}
                      onChange={(e) => setExpectedVpa(e.target.value)}
                      placeholder="starbucks.pay@hdfcbank"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Gemini Engine Toggle */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useGemini"
                      checked={useGemini}
                      onChange={(e) => setUseGemini(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <label htmlFor="useGemini" className="text-xs text-slate-300 cursor-pointer flex items-center space-x-1">
                      <span>Enable Gemini 2.5 Flash Multimodal OCR</span>
                      <Sparkles className="w-3 h-3 text-teal-400" />
                    </label>
                  </div>
                </div>

                {useGemini && (
                  <div>
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="Optional: Gemini API Key (or server defaults to .env)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-400 font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing || !selectedFile}
                className={`w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-semibold shadow-md transition-all ${
                  isAnalyzing || !selectedFile
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/20 active:scale-[0.99]"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Running Forensics & Ledger Match...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-slate-950" />
                    <span>Run Full ProofPay Verification</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Demo Scenario Switcher Card */}
            <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick CyberCup Demo Scenarios</span>
                </span>
                <button
                  onClick={() => setActiveTab("demolab")}
                  className="text-[11px] text-teal-400 hover:underline flex items-center space-x-0.5"
                >
                  <span>View Lab</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-1.5">
                {scenarios.slice(0, 3).map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => runDemoScenario(sc)}
                    disabled={executingScenarioId === sc.id}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 text-left transition-colors group"
                  >
                    <div>
                      <div className="text-xs font-medium text-slate-200 group-hover:text-teal-300">
                        {sc.title}
                      </div>
                      <div className="text-[10px] text-slate-500">{sc.description}</div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 ml-2">
                      {sc.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Findings & Dual Verdicts (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {result ? (
              <>
                {/* Dual Verdict Banner Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Verdict 1: Visual Integrity */}
                  {(() => {
                    const badge = getIntegrityBadge(result.visual_integrity);
                    return (
                      <div className={`p-4 rounded-xl border ${badge.bg} flex flex-col justify-between space-y-2`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                            1. Visual Integrity
                          </span>
                          {badge.icon}
                        </div>
                        <div>
                          <div className="text-base font-bold tracking-tight">{badge.label}</div>
                          <p className="text-[11px] text-slate-300/80 mt-0.5">
                            {result.visual_integrity === "NO_OBVIOUS_MANIPULATION"
                              ? "No compression splice or font manipulation detected by OpenCV ELA."
                              : result.visual_integrity === "SUSPICIOUS"
                              ? "Localized compression or edge anomalies found in critical text regions."
                              : "Visual indicators inconclusive. Manual inspection advised."}
                          </p>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/40">
                          Forensic Engine: OpenCV ELA & Perceptual dHash
                        </div>
                      </div>
                    );
                  })()}

                  {/* Verdict 2: Payment Verification */}
                  {(() => {
                    const badge = getVerificationBadge(result.payment_verification);
                    return (
                      <div className={`p-4 rounded-xl border ${badge.bg} flex flex-col justify-between space-y-2`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                            2. Payment Verification
                          </span>
                          {badge.icon}
                        </div>
                        <div>
                          <div className="text-base font-bold tracking-tight">{badge.label}</div>
                          <p className="text-[11px] text-slate-300/80 mt-0.5">
                            {result.payment_verification === "CONFIRMED"
                              ? "Authoritative merchant ledger matches amount, reference, and recipient VPA."
                              : result.payment_verification === "PENDING"
                              ? "Transaction found in merchant ledger, but settlement status is still PENDING."
                              : result.payment_verification === "NOT_FOUND"
                              ? "No matching settlement record exists in the merchant's connected ledger."
                              : "Claimed payment details contradict merchant order configuration."}
                          </p>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/40">
                          Ledger Provider: SimulatedMerchantLedger
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ReplayGuard Alert Banner (if replayed) */}
                {result.reference_reused && (
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-1">
                    <div className="flex items-center space-x-2 font-semibold text-sm text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>ReplayGuard Alert: Duplicate Transaction Reference Reused</span>
                    </div>
                    <p className="text-xs text-amber-200/90">
                      This UTR reference (<strong>{result.claimed_reference || (result.extracted_fields || result.extracted)?.reference_number || "UTR-REUSED"}</strong>) was previously submitted
                      for another order. A customer cannot use a single successful payment proof to fulfill multiple
                      orders!
                    </p>
                  </div>
                )}

                {/* Interactive Screenshot Overlay & Bounding Boxes */}
                <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-teal-400" />
                      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                        Forensic Visual Inspection
                      </h3>
                      {(result.anomaly_regions || result.forensics?.anomaly_boxes)?.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                          {(result.anomaly_regions || result.forensics?.anomaly_boxes).length} Anomalies Highlighted
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowOverlays(!showOverlays)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium border transition-colors ${
                          showOverlays
                            ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                            : "bg-slate-900 text-slate-400 border-slate-800"
                        }`}
                      >
                        {showOverlays ? "Hide Anomaly Overlays" : "Show Overlays"}
                      </button>

                      <button
                        onClick={exportReportJson}
                        className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 flex items-center space-x-1"
                      >
                        <Download className="w-3 h-3 text-slate-400" />
                        <span>Export JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* Image Display Container with Highlight Overlays */}
                  <div
                    ref={imageContainerRef}
                    className="relative bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-center overflow-hidden min-h-[260px]"
                  >
                    {previewUrl ? (
                      <div className="relative inline-block max-w-full">
                        <img
                          src={previewUrl}
                          alt="Forensic Analysis Target"
                          className="max-h-72 w-auto rounded-lg shadow-lg object-contain mx-auto border border-slate-800"
                        />

                        {/* Defensible Forensic Bounding Boxes */}
                        {showOverlays &&
                          (result.anomaly_regions || result.forensics?.anomaly_boxes || []).map((box, idx) => (
                            <div
                              key={idx}
                              onMouseEnter={() => setActiveBoxIndex(idx)}
                              onMouseLeave={() => setActiveBoxIndex(null)}
                              style={{
                                position: "absolute",
                                left: `${box.x}%`,
                                top: `${box.y}%`,
                                width: `${box.w}%`,
                                height: `${box.h}%`,
                              }}
                              className={`border-2 rounded transition-all cursor-pointer ${
                                activeBoxIndex === idx
                                  ? "border-rose-400 bg-rose-500/30 shadow-lg shadow-rose-500/20"
                                  : "border-amber-400 bg-amber-500/15 hover:border-rose-400"
                              }`}
                              title={`${box.label}: ${box.reason}`}
                            >
                              <span className="absolute -top-5 left-0 text-[9px] font-mono bg-rose-950 text-rose-300 px-1 py-0.2 rounded border border-rose-500/40 whitespace-nowrap shadow-sm">
                                {box.label}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-xs">No image loaded</div>
                    )}
                  </div>

                  {/* Hash & Encoding Metadata Strip */}
                  {(result.forensics_metrics || result.forensics) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                        <div className="text-slate-500">Dimensions</div>
                        <div className="text-slate-200">
                          {(result.forensics_metrics || result.forensics)?.dimensions?.width}x{(result.forensics_metrics || result.forensics)?.dimensions?.height} px
                        </div>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                        <div className="text-slate-500">Format</div>
                        <div className="text-slate-200">{(result.forensics_metrics || result.forensics)?.format || "JPEG"}</div>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                        <div className="text-slate-500">Perceptual dHash</div>
                        <div className="text-slate-200 truncate" title={(result.forensics_metrics || result.forensics)?.phash || (result.forensics_metrics || result.forensics)?.perceptual_hash}>
                          {((result.forensics_metrics || result.forensics)?.phash || (result.forensics_metrics || result.forensics)?.perceptual_hash)?.substring(0, 14)}...
                        </div>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                        <div className="text-slate-500">SHA-256 Digest</div>
                        <div className="text-slate-200 truncate" title={(result.forensics_metrics || result.forensics)?.sha256 || (result.forensics_metrics || result.forensics)?.sha256_hash}>
                          {((result.forensics_metrics || result.forensics)?.sha256 || (result.forensics_metrics || result.forensics)?.sha256_hash)?.substring(0, 14)}...
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Extracted Payment Details Table */}
                <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>Extracted Screenshot Intelligence</span>
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Engine: {(result.extracted_fields || result.extracted)?.extraction_engine || "Gemini 2.5 Flash"}
                    </span>
                  </div>

                  {(() => {
                    const ext = result.extracted_fields || result.extracted || {};
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">Claimed Amount</span>
                          <span className="text-base font-bold text-slate-100 font-mono">
                            {ext.amount ? `₹${ext.amount.toLocaleString()}` : "Not visible"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">Claimed Status</span>
                          <span
                            className={`text-xs font-bold font-mono px-2 py-0.5 rounded inline-block mt-0.5 ${
                              ext.claimed_status === "SUCCESS"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-950 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {ext.claimed_status || "UNKNOWN"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">UPI Reference / UTR</span>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs font-mono text-teal-300 font-semibold truncate">
                              {ext.reference_number || "None found"}
                            </span>
                            {ext.reference_number && (
                              <button
                                onClick={() => copyToClipboard(ext.reference_number, "utr")}
                                className="p-1 text-slate-400 hover:text-slate-200"
                              >
                                {copiedKey === "utr" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">Receiver Name / VPA</span>
                          <div className="text-xs text-slate-200 truncate mt-0.5 font-medium">
                            {ext.receiver_name || "Unknown"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">
                            {ext.receiver_vpa || "VPA missing"}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">Sender Name / VPA</span>
                          <div className="text-xs text-slate-200 truncate mt-0.5 font-medium">
                            {ext.sender_name || "Anonymous / Unlisted"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">
                            {ext.sender_vpa || "VPA missing"}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">Payment Application</span>
                          <div className="text-xs text-slate-200 font-medium mt-0.5">
                            {ext.payment_app || "Generic UPI App"}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Conf: {((ext.extraction_confidence || 0.9) * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Fraud Explanation & Action Plan Panel */}
                <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>Defensible Forensic Explanation & Recommended Action</span>
                    </h3>

                    {(() => {
                      const actBadge = getActionBadge(result.recommended_action);
                      return (
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${actBadge.bg}`}>
                          {actBadge.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Human-readable bulleted points */}
                  <div className="space-y-3 text-xs text-slate-300">
                    {typeof result.explanation === "string" ? (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 whitespace-pre-line leading-relaxed text-slate-300 font-sans">
                        {result.explanation}
                      </div>
                    ) : result.explanation ? (
                      <div className="space-y-2">
                        {result.explanation.what_was_extracted && (
                          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                            <span className="font-semibold text-slate-200 block mb-0.5">Extracted Evidence:</span>
                            <p className="text-slate-400">{result.explanation.what_was_extracted}</p>
                          </div>
                        )}

                        {result.explanation.contradictions_discovered && (
                          <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20">
                            <span className="font-semibold text-rose-300 block mb-0.5">Contradictions Discovered:</span>
                            <p className="text-rose-200/90">{result.explanation.contradictions_discovered}</p>
                          </div>
                        )}

                        {result.explanation.merchant_next_steps && (
                          <div className="p-2.5 rounded-lg bg-teal-950/20 border border-teal-500/20">
                            <span className="font-semibold text-teal-300 block mb-0.5">Merchant Protocol:</span>
                            <p className="text-teal-200/90">{result.explanation.merchant_next_steps}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400">
                        {result.findings?.map((f) => f.message).join(". ") || "Analysis completed."}
                      </p>
                    )}
                  </div>

                  {/* Findings breakdown items */}
                  {result.findings?.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Engine Observations ({result.findings.length}):
                      </span>
                      <div className="space-y-1.5">
                        {result.findings.map((f, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded-lg border text-xs flex items-start space-x-2 ${
                              f.severity === "high"
                                ? "bg-rose-950/30 border-rose-500/30 text-rose-200"
                                : f.severity === "medium"
                                ? "bg-amber-950/30 border-amber-500/30 text-amber-200"
                                : "bg-slate-950 border-slate-800 text-slate-300"
                            }`}
                          >
                            <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                              {f.engine}
                            </span>
                            <span className="flex-1">{f.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tamper-Evident Audit Token */}
                  {(result.tamper_audit_token || result.audit_token) && (
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                      <span className="truncate">Audit Token: {result.tamper_audit_token || result.audit_token}</span>
                      <span className="text-teal-400 shrink-0 ml-2">Tamper-Evident Chained</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Empty Placeholder */
              <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-200">Awaiting Screenshot Analysis</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Upload an authentic or suspected fake payment screenshot on the left, or launch one of the 5
                    preconfigured CyberCup scenarios below.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab("demolab")}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold hover:bg-teal-500/20 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Open CyberCup Demo Lab</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CYBERCUP DEMO LAB (5 SCENARIOS) */}
      {activeTab === "demolab" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-slate-100">CyberCup 6.0 Interactive Demo Lab</h2>
              <p className="text-xs text-slate-400">
                Execute 5 preconfigured real-world attack and legitimate verification scenarios through the complete
                backend pipeline.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetDemo}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-colors flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Demo State</span>
              </button>
            </div>
          </div>

          {loadingScenarios ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading demo scenarios...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  className="bg-[#090d16] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-md group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-teal-400">
                        {sc.tag}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{sc.order_id}</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-200 group-hover:text-teal-300 transition-colors">
                        {sc.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{sc.description}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Expected:</span>
                        <span className="text-slate-200 font-semibold">₹{sc.expected_amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Recipient VPA:</span>
                        <span className="text-slate-400 truncate max-w-[150px]">{sc.expected_vpa}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Expected Verdict:</span>
                        <span
                          className={`font-semibold ${
                            sc.expected_result?.payment_verification === "CONFIRMED"
                              ? "text-emerald-400"
                              : sc.expected_result?.payment_verification === "PENDING"
                              ? "text-amber-400"
                              : "text-rose-400"
                          }`}
                        >
                          {sc.expected_result?.payment_verification || "NOT_FOUND"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => runDemoScenario(sc)}
                    disabled={executingScenarioId === sc.id}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold transition-all"
                  >
                    {executingScenarioId === sc.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying in Engine...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-teal-400" />
                        <span>Run Scenario & Inspect</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CHALLENGEPAY ORDER GENERATOR */}
      {activeTab === "challengepay" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-[#090d16] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-teal-400" />
                <span>Create ChallengePay Merchant Order</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Generates a cryptographically bound merchant order. When a payment screenshot is presented, ProofPay
                matches against this authoritative order.
              </p>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Merchant Profile</label>
                <select
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="MERCH-STARBUCKS-01">Starbucks Coffee (MERCH-STARBUCKS-01)</option>
                  <option value="MERCH-ZOMATO-02">Zomato Food Delivery (MERCH-ZOMATO-02)</option>
                  <option value="MERCH-CHAI-03">Sharma Chai Tapri (MERCH-CHAI-03)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Order Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrderAmount}
                    onChange={(e) => setNewOrderAmount(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={newOrderCustomer}
                    onChange={(e) => setNewOrderCustomer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Expected Merchant VPA</label>
                <input
                  type="text"
                  value={newOrderVpa}
                  onChange={(e) => setNewOrderVpa(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Order Description / Notes</label>
                <input
                  type="text"
                  value={newOrderNote}
                  onChange={(e) => setNewOrderNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingOrder}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-all shadow-md mt-2"
              >
                {isCreatingOrder ? "Generating Order..." : "Generate Cryptographic Order ID"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 space-y-4">
            {createdOrder ? (
              <div className="bg-[#090d16] border border-teal-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-teal-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-bold">New Order Created Successfully</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    ACTIVE
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order ID:</span>
                    <span className="text-teal-300 font-bold">{createdOrder.order_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount:</span>
                    <span className="text-slate-200 font-bold">₹{createdOrder.amount} INR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recipient VPA:</span>
                    <span className="text-slate-300">{createdOrder.recipient_vpa}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="text-slate-300">{createdOrder.customer_name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expires At:</span>
                    <span className="text-slate-400">{new Date(createdOrder.expires_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setOrderId(createdOrder.order_id);
                    setExpectedAmount(createdOrder.amount.toString());
                    setExpectedVpa(createdOrder.recipient_vpa);
                    setActiveTab("inspector");
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>Verify Payment Proof Against this Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs space-y-2">
                <Sliders className="w-8 h-8 mx-auto text-slate-600" />
                <p>Fill in the form to generate a new live ChallengePay order.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SIMULATED MERCHANT LEDGER */}
      {activeTab === "ledger" && (
        <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-200">Simulated Merchant Settlement Ledger</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Simulation Mode
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative merchant-side settlement records used to definitively confirm or reject claimed payment
                proofs.
              </p>
            </div>

            <button
              onClick={fetchLedger}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-900"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Reference / UTR</th>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Merchant ID</th>
                  <th className="p-3">Recipient VPA</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Settled At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {ledgerEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/30">
                    <td className="p-3 text-teal-300 font-semibold">{row.transaction_reference}</td>
                    <td className="p-3 text-slate-300">{row.order_id || "Direct"}</td>
                    <td className="p-3 text-slate-400">{row.merchant_id}</td>
                    <td className="p-3 text-slate-400">{row.recipient_vpa}</td>
                    <td className="p-3 text-slate-200 font-bold">₹{row.amount?.toFixed(2)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.payment_status === "SUCCESS"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-950 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {row.payment_status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">{new Date(row.settled_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: REPLAYGUARD VAULT & AUDIT HISTORY */}
      {activeTab === "history" && (
        <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200">ReplayGuard Proof Vault & Verification Audit Trail</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every processed screenshot is hashed with cryptographic SHA-256 and perceptual dHash to prevent reuse.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search by order or UTR..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={fetchHistory}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-900"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Verification ID</th>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Claimed Ref</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Visual Status</th>
                  <th className="p-3">Ledger Status</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {historyRecords
                  .filter((rec) => {
                    if (!historySearch.trim()) return true;
                    const q = historySearch.toLowerCase();
                    return (
                      rec.order_id?.toLowerCase().includes(q) ||
                      rec.claimed_reference?.toLowerCase().includes(q) ||
                      rec.verification_id?.toLowerCase().includes(q)
                    );
                  })
                  .map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-900/30">
                      <td className="p-3 text-teal-300 font-semibold truncate max-w-[120px]">
                        {rec.verification_id}
                      </td>
                      <td className="p-3 text-slate-300">{rec.order_id || "Unbound"}</td>
                      <td className="p-3 text-slate-400">{rec.claimed_reference || "N/A"}</td>
                      <td className="p-3 text-slate-200 font-bold">
                        {rec.claimed_amount ? `₹${rec.claimed_amount}` : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.visual_integrity === "NO_OBVIOUS_MANIPULATION"
                              ? "bg-emerald-950 text-emerald-400"
                              : rec.visual_integrity === "SUSPICIOUS"
                              ? "bg-rose-950 text-rose-400"
                              : "bg-amber-950 text-amber-400"
                          }`}
                        >
                          {rec.visual_integrity}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.payment_verification === "CONFIRMED"
                              ? "bg-emerald-950 text-emerald-400"
                              : rec.payment_verification === "PENDING"
                              ? "bg-amber-950 text-amber-400"
                              : "bg-rose-950 text-rose-400"
                          }`}
                        >
                          {rec.payment_verification}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        {new Date(rec.verified_at).toLocaleTimeString()}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={async () => {
                            try {
                              const rep = await api.proofpay.getReport(rec.verification_id);
                              setActiveReportModal(rep.report);
                            } catch (e) {
                              alert("Failed to load report: " + e.message);
                            }
                          }}
                          className="text-[11px] text-teal-400 hover:underline"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Report Modal */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-slate-100 font-heading">
                  ProofPay Verification Audit Certificate
                </h3>
              </div>
              <button
                onClick={() => setActiveReportModal(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-500">Verification ID:</span>
                  <div className="text-teal-300 font-bold">{activeReportModal.verification_id}</div>
                </div>
                <div>
                  <span className="text-slate-500">Order ID:</span>
                  <div className="text-slate-200 font-bold">{activeReportModal.order_id}</div>
                </div>
                <div>
                  <span className="text-slate-500">Visual Integrity:</span>
                  <div className="text-slate-200">{activeReportModal.visual_integrity}</div>
                </div>
                <div>
                  <span className="text-slate-500">Payment Verification:</span>
                  <div className="text-slate-200">{activeReportModal.payment_verification}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block mb-1">Findings Summary:</span>
                <p className="text-slate-300">{activeReportModal.explanation_summary}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block mb-1">Cryptographic Tamper-Evident Token:</span>
                <div className="text-teal-400 text-[10px] break-all">{activeReportModal.audit_token}</div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 flex items-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Certificate</span>
              </button>
              <button
                onClick={() => setActiveReportModal(null)}
                className="px-4 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-semibold hover:bg-teal-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
