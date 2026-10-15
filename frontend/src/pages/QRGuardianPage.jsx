import React, { useState, useRef, useEffect } from "react";
import {
  QrCode,
  Upload,
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Store,
  Key,
  Eye,
  EyeOff,
  Bot,
  RefreshCw,
  SwitchCamera,
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

// Synthesize pleasant scan beep audio
function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio permission block
  }
}

export default function QRGuardianPage({ prefilledData }) {
  const [activeInputMode, setActiveInputMode] = useState("camera"); // "camera" | "upload"
  const [qrText, setQrText] = useState(prefilledData?.qr_text || PRESET_QR_SCENARIOS[0].qr_text);
  const [claimedBrand, setClaimedBrand] = useState(prefilledData?.claimed_store_brand || PRESET_QR_SCENARIOS[0].claimed_brand);
  const [posSignature, setPosSignature] = useState(prefilledData?.pos_signature || PRESET_QR_SCENARIOS[0].pos_signature);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem("paysentrix_gemini_api_key") || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Live Camera Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // "environment" (back) or "user" (front/webcam)

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSaveApiKey = (val) => {
    setGeminiApiKey(val);
    localStorage.setItem("paysentrix_gemini_api_key", val);
  };

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setIsScanning(true);

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        requestAnimationFrame(tickScan);
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Please allow camera access in your browser."
          : `Camera error: ${err.message || "No camera device found."}`
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    if (isScanning) {
      stopCamera();
      setTimeout(startCamera, 200);
    }
  };

  const tickScan = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(tickScan);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert"
    });

    if (code && code.data) {
      playScanBeep();
      const snapshot = canvas.toDataURL("image/jpeg", 0.85);
      setImagePreview(snapshot);
      setQrText(code.data);
      stopCamera();

      // Automatically execute fraud verification on scanned QR!
      runVerification(code.data, snapshot);
      return;
    }

    animFrameRef.current = requestAnimationFrame(tickScan);
  };

  const runVerification = async (textToVerify = qrText, snapshotToVerify = imagePreview) => {
    if (!textToVerify.trim()) return;
    setLoading(true);
    try {
      const res = await api.verifyQR(
        textToVerify,
        claimedBrand,
        posSignature,
        snapshotToVerify,
        geminiApiKey || null
      );
      setResult(res);
    } catch (err) {
      console.error("QR verification failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    if (e) e.preventDefault();
    runVerification();
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
          playScanBeep();
          setQrText(code.data);
          runVerification(code.data, dataUrl);
        }
      };
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const loadPreset = (preset) => {
    stopCamera();
    setQrText(preset.qr_text);
    setClaimedBrand(preset.claimed_brand);
    setPosSignature(preset.pos_signature || "");
    setResult(null);
  };

  const gemini = result?.gemini_analysis;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 border-cyan-500/20 bg-gradient-to-r from-[#0b1226] to-[#080d1a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded flex items-center space-x-1">
                <Bot className="w-3 h-3 text-cyan-400" />
                <span>LIVE CAMERA SCANNER + GEMINI VISION</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Real-Time Physical Sticker Swap Shield
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
              QR Guardian & Counter Authentication
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Live-access camera scanner powered by <strong className="text-white">Gemini Multimodal AI</strong>. Scans printed counter QR standees in real time, compares the visual store branding against the digital payee VPA, and immediately flags physical sticker-overlay fraud.
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
                Configure your Gemini API key in <code className="text-cyan-300">backend/config.py</code>, <code className="text-cyan-300">.env</code>, or enter it directly below.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-80">
            <div className="relative flex-1">
              <input
                type={showApiKey ? "text" : "password"}
                value={geminiApiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                placeholder="Enter Gemini API Key"
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
        {/* Left Input & Live Camera Scanner (7 Cols) */}
        <div className="lg:col-span-7 glass-panel p-5 space-y-4">
          <div className="pb-3 border-b border-white/[0.08] flex items-center justify-between">
            <h2 className="text-sm font-heading font-bold text-white flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Live Camera Scanner & QR Payload</span>
            </h2>

            {/* Input Mode Tabs */}
            <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/[0.07]">
              <button
                type="button"
                onClick={() => {
                  setActiveInputMode("camera");
                  startCamera();
                }}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeInputMode === "camera"
                    ? "bg-cyan-500 text-black font-bold shadow-cyan-glow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveInputMode("upload");
                  fileInputRef.current?.click();
                }}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeInputMode === "upload"
                    ? "bg-cyan-500 text-black font-bold shadow-cyan-glow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image</span>
              </button>
            </div>
          </div>

          {/* Live Camera Scanner Viewport */}
          {activeInputMode === "camera" && (
            <div className="space-y-3">
              <div className="relative w-full h-64 sm:h-80 bg-black rounded-2xl overflow-hidden border border-cyan-500/30 flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Targeting Reticle & Cyber Scanline Animation */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Bounding Scanner Box */}
                    <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-cyan-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(0,242,254,0.35)]">
                      {/* Corner Target Markers */}
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300" />

                      {/* Sweeping Radar Scanline */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
                    </div>

                    <div className="absolute bottom-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full border border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <span>Aim camera at retail QR standee</span>
                    </div>
                  </div>
                )}

                {/* Overlay if not active or error */}
                {!isScanning && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3">
                    {cameraError ? (
                      <div className="space-y-2 text-rose-300 max-w-sm">
                        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                        <p className="text-xs font-mono">{cameraError}</p>
                      </div>
                    ) : imagePreview ? (
                      <div className="space-y-2">
                        <img
                          src={imagePreview}
                          alt="Captured Standee"
                          className="w-28 h-28 object-contain rounded-xl border border-cyan-400 mx-auto bg-black/60 shadow-cyan-glow"
                        />
                        <span className="text-xs font-heading font-bold text-cyan-300 block">
                          Captured Frame Ready for Gemini Inspection
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 text-slate-300">
                        <Camera className="w-8 h-8 text-cyan-400 mx-auto" />
                        <span className="text-sm font-heading font-bold text-white block">
                          Camera Standby
                        </span>
                        <p className="text-xs text-slate-400 max-w-xs">
                          Click below to start live video stream and scan any physical UPI QR code.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Camera Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {!isScanning ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-cyan-glow"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Start Live Camera Scan</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all"
                    >
                      <CameraOff className="w-4 h-4" />
                      <span>Stop Camera</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] text-xs font-mono"
                    title="Switch Camera (Front/Back)"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span>{facingMode === "environment" ? "Back" : "Front"}</span>
                  </button>
                </div>

                {imagePreview && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Frame Snapshot Acquired</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Hidden File Input for Upload Tab */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Decoded QR Content */}
          <form onSubmit={handleManualSubmit} className="space-y-4 pt-2">
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
                <span>Running Gemini AI & Merchant Registry Verification...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>Verify QR Authenticity & Counter Match</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Output: Verification & Accurate Gemini Analysis (5 Cols) */}
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
                    The counter displays <strong className="text-white">{claimedBrand}</strong>, but the scanned QR code directs payment to an unrelated mule VPA. Do not authorize this payment.
                  </p>
                </div>
              )}

              {/* Accurate Gemini Multimodal Analysis Card */}
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
                      <span className="text-slate-400">VPA Account Type:</span>
                      <span className="text-cyan-300">{gemini.vpa_account_type || "Analyzed"}</span>
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
                Live Scanner Standby
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Point your camera at any UPI QR code or counter standee to evaluate physical sticker tampering and NPCI merchant identity verification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
