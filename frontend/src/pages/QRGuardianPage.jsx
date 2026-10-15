import React, { useState, useRef, useEffect } from "react";
import {
  QrCode,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Camera,
  Store,
  Key,
  Eye,
  EyeOff,
  Cpu,
  Bot,
  Layers,
  ExternalLink
} from "lucide-react";
import jsQR from "jsqr";
import RiskGauge from "../components/RiskGauge";
import { api } from "../utils/api";

const PRESET_QR_SCENARIOS = [
  {
    title: "Starbucks Counter Swapped QR Scam",
    tag: "Physical Tampering",
    claimed_brand: "Tata Starbucks Pvt Ltd",
    qr_text: "upi://pay?pa=raju.kumar78@okaxis&pn=Raju%20Kumar&mc=0000&mode=02",
    pos_signature: ""
  },
  {
    title: "Genuine Starbucks Cryptographically Signed QR",
    tag: "Verified Enterprise",
    claimed_brand: "Tata Starbucks Pvt Ltd",
    qr_text: "upi://pay?pa=starbucks.pay@hdfcbank&pn=Tata%20Starbucks%20Pvt%20Ltd&mc=5814&am=380.00&mode=01&sign=SIG_POS_AUTH_TATA_SBUX_ED25519_99812",
    pos_signature: "SIG_POS_AUTH_TATA_SBUX_ED25519_99812"
  },
  {
    title: "Genuine Zomato Delivery Dynamic QR",
    tag: "Verified Enterprise",
    claimed_brand: "Zomato India Ltd",
    qr_text: "upi://pay?pa=zomato@icici&pn=Zomato%20India%20Ltd&mc=5812&am=540.00&mode=01&sign=SIG_POS_AUTH_ZOMATO_ED25519_8819",
    pos_signature: "SIG_POS_AUTH_ZOMATO_ED25519_8819"
  },
  {
    title: "Unverified Roadside Stall QR",
    tag: "Unenrolled SME",
    claimed_brand: "Ramesh Kirana Store",
    qr_text: "upi://pay?pa=ramesh.sharma99@paytm&pn=Ramesh%20Sharma&mc=0000&mode=02",
    pos_signature: ""
  }
];

export default function QRGuardianPage({ prefilledData }) {
  const [qrText, setQrText] = useState(prefilledData?.qr_text || PRESET_QR_SCENARIOS[0].qr_text);
  const [claimedBrand, setClaimedBrand] = useState(prefilledData?.claimed_store_brand || PRESET_QR_SCENARIOS[0].claimed_brand);
  const [posSignature, setPosSignature] = useState(prefilledData?.pos_signature || PRESET_QR_SCENARIOS[0].pos_signature);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem("paysentrix_gemini_api_key") || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const fileInputRef = useRef(null);

  const handleSaveApiKey = (val) => {
    setGeminiApiKey(val);
    localStorage.setItem("paysentrix_gemini_api_key", val);
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!qrText.trim()) return;
    setLoading(true);
    try {
      const res = await api.verifyQR(
        qrText,
        claimedBrand,
        posSignature,
        imagePreview,
        geminiApiKey || null
      );
      setResult(res);
    } catch (err) {
      console.error("QR verification failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setImagePreview(dataUrl);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0, image.width, image.height);
        const imageData = context.getImageData(0, 0, image.width, image.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          setQrText(code.data);
          // If Gemini key is set or user uploaded standee, run verification immediately
          setTimeout(() => handleVerify(), 100);
        }
      };
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const loadPreset = (preset) => {
    setQrText(preset.qr_text);
    setClaimedBrand(preset.claimed_brand);
    setPosSignature(preset.pos_signature || "");
    setResult(null);
  };

  const gemini = result?.gemini_analysis;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="glass-panel p-6 border-cyan-500/20 bg-gradient-to-r from-[#0b1226] to-[#080d1a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded flex items-center space-x-1">
                <Bot className="w-3 h-3 text-cyan-400" />
                <span>GEMINI MULTIMODAL AI & TRUST REGISTRY</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Physical Standee Tampering Shield
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
              QR Guardian & Counter Authentication
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Protects retail consumers from physical sticker-overlay scams. Compares the scanned UPI recipient VPA against the enrolled merchant's verified store identity, POS signatures, and Gemini Vision physical standee inspection.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {PRESET_QR_SCENARIOS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => loadPreset(p)}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-cyan-500/15 border border-white/[0.08] text-slate-200 text-xs font-semibold transition-all"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gemini API Key Configuration Bar */}
      <div className="glass-panel p-4 bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-black/40 border-cyan-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-heading font-bold text-white">
                  Gemini Vision Multimodal Standee Inspector
                </span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  geminiApiKey ? "bg-emerald-500/20 text-emerald-300" : "bg-cyan-500/15 text-cyan-300"
                }`}>
                  {geminiApiKey ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Uses Gemini to visually detect physical sticker overlays, misaligned paper borders, and signage brand mismatch.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-80">
            <div className="relative flex-1">
              <input
                type={showApiKey ? "text" : "password"}
                value={geminiApiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                placeholder="Enter Gemini API Key (or set in .env)"
                className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-black/60 border border-white/[0.1] focus:border-cyan-400 text-white font-mono text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {!geminiApiKey && (
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono whitespace-nowrap"
              >
                Get Key
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Input (7 Cols) */}
        <form onSubmit={handleVerify} className="lg:col-span-7 glass-panel p-5 space-y-4">
          <div className="pb-3 border-b border-white/[0.08] flex items-center justify-between">
            <h2 className="text-sm font-heading font-bold text-white flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>QR Code Payload & Counter Context</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">NPCI QR Specification</span>
          </div>

          {/* Image Upload Area with Preview */}
          <div
            onClick={() => fileInputRef.current.click()}
            className="p-5 rounded-2xl border-2 border-dashed border-white/[0.15] hover:border-cyan-400/50 bg-black/20 hover:bg-cyan-500/5 transition-all text-center cursor-pointer space-y-2 group relative overflow-hidden"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {imagePreview ? (
              <div className="flex items-center justify-center space-x-4">
                <img
                  src={imagePreview}
                  alt="Scanned standee"
                  className="w-20 h-20 object-contain rounded-lg border border-cyan-500/40 bg-black/50"
                />
                <div className="text-left">
                  <span className="text-xs font-semibold text-cyan-300 flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Standee Image Loaded</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Click to replace with another photo or scan
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200">
                    Upload Standee or QR Code Photo
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Gemini Vision inspects physical sticker tampering while `jsQR` decodes the payload
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Scanned UPI QR String */}
          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1">
              Decoded UPI QR Content (Intent URI) *
            </label>
            <textarea
              rows={3}
              required
              value={qrText}
              onChange={(e) => setQrText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.1] focus:border-cyan-400 text-white font-mono text-xs leading-relaxed focus:outline-none"
              placeholder="upi://pay?pa=...&pn=...&mc=..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Visual Store Branding */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Visual Store Branding at Counter *
              </label>
              <input
                type="text"
                value={claimedBrand}
                onChange={(e) => setClaimedBrand(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/[0.1] focus:border-cyan-400 text-white text-xs focus:outline-none"
                placeholder="e.g. Tata Starbucks Pvt Ltd"
              />
            </div>

            {/* POS Terminal Signature (Optional) */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1 flex items-center space-x-1">
                <Key className="w-3 h-3 text-cyan-400" />
                <span>Mock POS Terminal Signature</span>
              </label>
              <input
                type="text"
                value={posSignature}
                onChange={(e) => setPosSignature(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/[0.1] focus:border-cyan-400 text-white font-mono text-xs focus:outline-none"
                placeholder="e.g. SIG_POS_AUTH_TATA_SBUX_..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-heading font-bold text-sm shadow-cyan-glow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Running Gemini Vision & Merchant Registry Verification...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-black" />
                <span>Verify QR Authenticity & Counter Match</span>
              </>
            )}
          </button>
        </form>

        {/* Right Output (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {result ? (
            <div className="glass-panel p-5 space-y-5 border-cyan-500/30 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase">
                    Verification Verdict
                  </span>
                  <h3 className="text-sm font-heading font-bold text-white">
                    {result.verdict}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {result.is_swapped ? "⚠️ STICKER SWAP" : (result.is_verified ? "✅ ENROLLED" : "UNREGISTERED")}
                </span>
              </div>

              {/* Gauge */}
              <RiskGauge score={result.risk_score} subtitle={result.risk_tier} />

              {/* Swapped Warning Alert */}
              {result.is_swapped && (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/50 text-rose-300 space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-white text-sm">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    <span>PHYSICAL QR STICKER TAMPERING DETECTED</span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed">
                    The printed signage at this counter displays <strong className="text-white">{claimedBrand}</strong>, but the scanned QR code directs payment to an unrelated mule VPA. Do not scan or pay.
                  </p>
                </div>
              )}

              {/* Gemini AI Multimodal Analysis Card (If returned) */}
              {gemini && !gemini.error && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/30 to-purple-950/20 border border-cyan-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-cyan-300 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Gemini Vision AI Standee Findings</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      gemini.tampering_detected
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}>
                      {gemini.tampering_detected ? "TAMPERING OBSERVED" : "CLEARED"}
                    </span>
                  </div>

                  <div className="text-xs font-mono space-y-1 pt-1 border-t border-white/[0.06]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Visual Brand Detected:</span>
                      <span className="text-white font-bold">{gemini.visual_brand_detected}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cross-Modal Invariance:</span>
                      <span className={gemini.cross_modal_match ? "text-emerald-400" : "text-rose-400 font-bold"}>
                        {gemini.cross_modal_match ? "Matched (PASS)" : "CONTRADICTION (FAIL)"}
                      </span>
                    </div>
                    {gemini.tampering_confidence !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tampering Confidence:</span>
                        <span className="text-cyan-300">{gemini.tampering_confidence}%</span>
                      </div>
                    )}
                  </div>

                  {gemini.physical_tampering_clues && gemini.physical_tampering_clues.length > 0 && (
                    <div className="pt-1.5 border-t border-white/[0.06]">
                      <span className="text-[10px] font-mono text-slate-400 block mb-1">
                        Physical Visual Clues:
                      </span>
                      <div className="space-y-1">
                        {gemini.physical_tampering_clues.map((clue, idx) => (
                          <div key={idx} className="text-[11px] text-amber-200/90 font-mono flex items-start space-x-1.5">
                            <span className="text-amber-400">•</span>
                            <span>{clue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-300 italic pt-1 border-t border-white/[0.06] leading-relaxed">
                    "{gemini.forensic_reasoning}"
                  </p>
                </div>
              )}

              {/* Verified Merchant Profile */}
              {result.merchant_details ? (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 text-xs font-mono">
                  <span className="text-[10px] uppercase text-emerald-400 font-bold block">
                    Certified National Merchant Registry Profile
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Enrolled Entity:</span>
                    <span className="text-emerald-300 font-bold">{result.merchant_details.brand_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registered VPA:</span>
                    <span className="text-white">{result.merchant_details.registered_vpa}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">MCC Code:</span>
                    <span className="text-slate-200">{result.merchant_details.mcc_code} ({result.merchant_details.category})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Verification Tier:</span>
                    <span className="text-emerald-400 font-bold">{result.merchant_details.tier}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-black/40 rounded-xl border border-white/[0.06] text-xs font-mono text-slate-300">
                  Counterparty <strong className="text-amber-300">{result.parsed_payload?.vpa}</strong> is not registered as an enterprise commercial merchant.
                </div>
              )}

              {/* Evidence Chain */}
              <div className="space-y-2">
                <span className="text-xs font-heading font-semibold text-white block">
                  Security Checklist
                </span>
                <div className="space-y-1.5">
                  {(result.evidence || []).map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] text-xs space-y-0.5"
                    >
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-200 font-semibold">{ev.type}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded ${
                            ev.status === "PASS"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : ev.status === "FAIL"
                              ? "bg-rose-500/20 text-rose-300 font-bold"
                              : "bg-cyan-500/20 text-cyan-300"
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{ev.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 text-center flex flex-col items-center justify-center h-full min-h-[380px] space-y-3">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <QrCode className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-base font-heading font-bold text-white">
                Awaiting QR Input
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Upload a counter standee photo or select a scenario above to test physical sticker-swap detection with Gemini Vision multimodal analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
