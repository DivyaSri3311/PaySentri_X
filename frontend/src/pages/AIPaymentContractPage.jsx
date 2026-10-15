import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight,
  FileCheck2,
  FileWarning,
  RefreshCw,
  Send,
  HelpCircle
} from "lucide-react";
import ContractComparison from "../components/ContractComparison";
import { api } from "../utils/api";

const PRESET_CONTRACTS = [
  {
    title: "Amazon ₹5,000 Refund Reverse-Debit Trap",
    tag: "Scam Detection",
    message: "Congratulations! Your Amazon refund of Rs 5,000 has been approved. Scan QR or click here to receive it directly into your bank account: upi://pay?pa=amz.refund.desk@ybl&am=5000",
    actual_direction: "DEBIT",
    actual_amount: 5000,
    recipient_vpa: "amz.refund.desk@ybl",
    recipient_name: "Refund Clearance Agent",
    transaction_note: "Amazon Refund Ref 5000",
    claimed_entity: "Amazon India"
  },
  {
    title: "BESCOM Electricity Overdue Bill Verification",
    tag: "Utility Scam",
    message: "Dear consumer, your electricity power will be disconnected tonight at 9:30 PM because previous month bill not updated. Pay Rs 140 immediately to prevent cut: officer 9876543210",
    actual_direction: "DEBIT",
    actual_amount: 140,
    recipient_vpa: "bescom.officer.rahul@okaxis",
    recipient_name: "Personal Mule (Rahul K)",
    transaction_note: "Bescom Electric Bill",
    claimed_entity: "Electricity Supply Corporation"
  },
  {
    title: "Zomato Verified Food Delivery Order",
    tag: "Genuine Merchant",
    message: "Payment request for Zomato order #84920: Total order amount Rs 450.00 to Zomato India Ltd.",
    actual_direction: "DEBIT",
    actual_amount: 450,
    recipient_vpa: "zomato@icici",
    recipient_name: "Zomato India Ltd",
    transaction_note: "Zomato Order 84920",
    claimed_entity: "Zomato India Ltd"
  },
  {
    title: "Google Pay ₹3,500 Scratch Card Cashback",
    tag: "Reverse-Debit Lure",
    message: "Google Pay Scratch Card: You won ₹3,500 cashback reward! Tap here and enter your UPI PIN to claim money into your bank a/c.",
    actual_direction: "DEBIT",
    actual_amount: 3500,
    recipient_vpa: "gpay.rewards.help@paytm",
    recipient_name: "Cashback Dispatch Desk",
    transaction_note: "Reward Redemption 3500",
    claimed_entity: "Google Pay"
  }
];

export default function AIPaymentContractPage({ prefilledData, onOpenComplaintModal }) {
  const [promiseMessage, setPromiseMessage] = useState(
    prefilledData?.promise_message || PRESET_CONTRACTS[0].message
  );
  const [actualDirection, setActualDirection] = useState(
    prefilledData?.actual_direction || PRESET_CONTRACTS[0].actual_direction
  );
  const [actualAmount, setActualAmount] = useState(
    prefilledData?.actual_amount || PRESET_CONTRACTS[0].actual_amount
  );
  const [recipientVpa, setRecipientVpa] = useState(
    prefilledData?.recipient_vpa || PRESET_CONTRACTS[0].recipient_vpa
  );
  const [recipientName, setRecipientName] = useState(
    prefilledData?.recipient_name || PRESET_CONTRACTS[0].recipient_name
  );
  const [transactionNote, setTransactionNote] = useState(
    prefilledData?.transaction_note || PRESET_CONTRACTS[0].transaction_note
  );
  const [claimedEntity, setClaimedEntity] = useState(
    prefilledData?.claimed_entity || PRESET_CONTRACTS[0].claimed_entity
  );

  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  useEffect(() => {
    handleEvaluate();
  }, []);

  const handleEvaluate = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        promise_message: promiseMessage,
        actual_direction: actualDirection,
        actual_amount: parseFloat(actualAmount) || 5000,
        recipient_vpa: recipientVpa,
        recipient_name: recipientName,
        transaction_note: transactionNote,
        claimed_entity: claimedEntity,
        is_collect_request: actualDirection === "DEBIT" && promiseMessage.toLowerCase().includes("refund"),
        requires_pin: true
      };

      const res = await api.evaluateContract(payload);
      setEvaluation(res);
    } catch (err) {
      console.error("Contract evaluation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset) => {
    setPromiseMessage(preset.message);
    setActualDirection(preset.actual_direction);
    setActualAmount(preset.actual_amount);
    setRecipientVpa(preset.recipient_vpa);
    setRecipientName(preset.recipient_name);
    setTransactionNote(preset.transaction_note);
    setClaimedEntity(preset.claimed_entity);
  };

  return (
    <div className="space-y-6">
      {/* Flagship Innovation Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>PAYPROOF ARCHITECTURE • KEY INNOVATION</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Predicate Invariance Engine
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              AI Payment Contract Verification Laboratory
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed">
              Unlike conventional classifiers that only examine transaction records in isolation, <strong className="text-slate-900">PaySentriX compares what the user was promised against what the payment actually executes</strong>. It translates claims into testable safety predicates before funds leave the account.
            </p>
          </div>

          {/* Quick Select Presets */}
          <div className="space-y-2 shrink-0">
            <span className="text-[11px] font-mono text-blue-600 uppercase tracking-wider block font-semibold">
              Select Preset CyberCup Scenario
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_CONTRACTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 text-left transition-all text-xs group"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-blue-600 truncate">
                    {p.title}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {p.tag}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contract Input Workbench */}
      <form onSubmit={handleEvaluate} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center space-x-2">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            <span>Interactive Contract Verification Parameters</span>
          </h2>
          <span className="text-[10px] font-mono text-slate-400">
            Formal Predicate Specification
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Promised Message */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-blue-600 block mb-1 flex items-center justify-between">
                <span>1. Lure Message / Promised Communication *</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">Natural Language</span>
              </label>
              <textarea
                rows={4}
                required
                value={promiseMessage}
                onChange={(e) => setPromiseMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 text-xs leading-relaxed focus:outline-none focus:bg-white"
                placeholder="Paste the SMS, WhatsApp, or phone prompt that promised a refund, bill payment, cashback, or prize..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Claimed Institution / Enterprise Brand
              </label>
              <input
                type="text"
                value={claimedEntity}
                onChange={(e) => setClaimedEntity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 text-xs focus:outline-none focus:bg-white"
                placeholder="e.g. Amazon India, BESCOM, SBI Bank"
              />
            </div>
          </div>

          {/* Right: Actual Payment Execution Details */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-rose-600 block mb-1 flex items-center justify-between">
              <span>2. Actual Payment Execution Parameters *</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">NPCI UPI Intent Payload</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Executing Direction</span>
                <select
                  value={actualDirection}
                  onChange={(e) => setActualDirection(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 font-mono text-xs focus:outline-none font-bold"
                >
                  <option value="DEBIT">DEBIT (Funds Deducted From User)</option>
                  <option value="CREDIT">CREDIT (Funds Received By User)</option>
                </select>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Executing Amount (₹)</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 font-mono text-xs focus:outline-none font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Recipient VPA</span>
                <input
                  type="text"
                  required
                  value={recipientVpa}
                  onChange={(e) => setRecipientVpa(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 font-mono text-xs focus:outline-none"
                  placeholder="e.g. amz.refund.desk@ybl"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Transaction Note</span>
                <input
                  type="text"
                  value={transactionNote}
                  onChange={(e) => setTransactionNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 text-xs focus:outline-none"
                  placeholder="e.g. Amazon Refund Voucher"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Evaluating Safety Predicates & Contradictions...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-white" />
                    <span>Run AI Payment Contract Verification</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Flagship Output: Side-by-Side Comparison & Predicates */}
      {evaluation && (
        <ContractComparison
          evaluation={evaluation}
          onOpenComplaintModal={onOpenComplaintModal}
        />
      )}
    </div>
  );
}
