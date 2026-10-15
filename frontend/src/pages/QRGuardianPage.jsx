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
  ExternalLink,
  Copy,
  Check,
  Zap,
  Info,
  CheckCircle2,
  BarChart2,
  Lock,
  ArrowRight
} from "lucide-react";
import jsQR from "jsqr";
import RiskGauge from "../components/RiskGauge";
import { api } from "../utils/api";
import standeeImg from "../assets/bhim_upi_counter_standee.jpg";

const PRESET_QR_SCENARIOS = [
  {
    title: "Starbucks Swapped QR Scam",
    tag: "Physical Tampering",
    claimed_brand: "Tata Starbucks Pvt Ltd",
    qr_text: "upi://pay?pa=raju.kumar78@okaxis&pn=Raju%20Kumar&mc=0000&mode=02",
    pos_signature: ""
  },
  {
    title: "Genuine Starbucks Signed QR",
    tag: "Verified Enterprise",
    claimed_brand: "Tata Starbucks Pvt Ltd",
    qr_text: "upi://pay?pa=starbucks.pay@hdfcbank&pn=Tata%20Starbucks%20Pvt%20Ltd&mc=5814&am=380.00&mode=01&sign=SIG_POS_AUTH_TATA_SBUX_ED25519_99812",
    pos_signature: "SIG_POS_AUTH_TATA_SBUX_ED25519_99812"
  },
  {
    title: "Genuine Zomato Dynamic QR",
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
    osc.frequency.setValueAtTime(880, ctx.currentTime);
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
  const [qrText, setQrText] = useState(
    prefilledData?.qr_text || PRESET_QR_SCENARIOS[0].qr_text
  );
  const [claimedBrand, setClaimedBrand] = useState(
    prefilledData?.claimed_store_brand || PRESET_QR_SCENARIOS[0].claimed_brand
  );
  const [posSignature, setPosSignature] = useState(
    prefilledData?.pos_signature || PRESET_QR_SCENARIOS[0].pos_signature
  );
  const [geminiApiKey, setGeminiApiKey] = useState(
    () => localStorage.getItem("paysentrix_gemini_api_key") || ""
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(standeeImg);
  const [copied, setCopied] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Live Camera Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // "environment" | "user"

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSaveApiKey = (val) => {
    setGeminiApiKey(val);
    localStorage.setItem("paysentrix_gemini_api_key", val);
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

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    if (isScanning) {
      stopCamera();
      setTimeout(startCamera, 200);
    }
  };

  const toggleFlash = async () => {
    try {
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() || {};
        if (capabilities.torch) {
          const nextState = !torchOn;
          await track.applyConstraints({
            advanced: [{ torch: nextState }]
          });
          setTorchOn(nextState);
        } else {
          setTorchOn(!torchOn);
        }
      } else {
        setTorchOn(!torchOn);
      }
    } catch (e) {
      console.warn("Torch not supported:", e);
      setTorchOn(!torchOn);
    }
  };

  const captureFrameNow = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const snapshot = canvas.toDataURL("image/jpeg", 0.85);
    setImagePreview(snapshot);
    stopCamera();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      playScanBeep();
      setQrText(code.data);
      runVerification(code.data, snapshot);
    } else {
      runVerification(qrText, snapshot);
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
      runVerification(code.data, snapshot);
      return;
    }

    animFrameRef.current = requestAnimationFrame(tickScan);
  };

  const runVerification = async (textToVerify = qrText, snapshotToVerify = imagePreview) => {
    if (!textToVerify.trim()) return;
    setLoading(true);
    try {
      // Don't send large static asset URL directly if it's not data:image
      const imagePayload = (typeof snapshotToVerify === "string" && snapshotToVerify.startsWith("data:image"))
        ? snapshotToVerify
        : null;

      const res = await api.verifyQR(
        textToVerify,
        claimedBrand,
        posSignature,
        imagePayload,
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
        } else {
          runVerification(qrText, dataUrl);
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gemini = result?.gemini_analysis;

  return (
    <div className="space-y-6">
      {/* Main Container Grid matching Screenshot 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Central Workspace (7-8 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          {/* Workspace Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  QR Guardian
                </h1>
              </div>
              <p className="text-xs text-slate-500">
                Scan or upload any UPI QR code to verify merchant identity, detect tampering, and analyze risks.
              </p>
            </div>

            {/* NPCI Compliant Badge matching Screenshot 2 */}
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>NPCI Compliant</span>
            </span>
          </div>

          {/* Mode Switcher Tabs matching Screenshot 2 */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setActiveInputMode("camera");
                if (!isScanning) startCamera();
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeInputMode === "camera"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
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
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeInputMode === "upload"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>

            {/* Quick Presets Toggle button */}
            <div className="ml-auto flex items-center space-x-1">
              {PRESET_QR_SCENARIOS.slice(0, 2).map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => loadPreset(p)}
                  className="hidden sm:inline-block px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {p.claimed_brand.includes("Starbucks") && p.tag.includes("Tampering")
                    ? "Tampered Demo"
                    : "Genuine Demo"}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Viewport matching Screenshot 2 */}
          <div className="relative w-full h-72 sm:h-80 bg-slate-900 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
            {/* Live Video Stream */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${isScanning ? "block" : "hidden"}`}
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* If camera is not active, display preview image (default bhim_upi_counter_standee.jpg or uploaded) */}
            {!isScanning && (
              <img
                src={imagePreview || standeeImg}
                alt="Standee Preview"
                className="w-full h-full object-cover"
              />
            )}

            {/* Targeting Scan Bracket Corners matching Screenshot 2 */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top-Left Bracket */}
              <span className="absolute top-6 left-12 w-6 h-6 border-t-2 border-l-2 border-white shadow-sm" />
              {/* Top-Right Bracket */}
              <span className="absolute top-6 right-12 w-6 h-6 border-t-2 border-r-2 border-white shadow-sm" />
              {/* Bottom-Left Bracket */}
              <span className="absolute bottom-16 left-12 w-6 h-6 border-b-2 border-l-2 border-white shadow-sm" />
              {/* Bottom-Right Bracket */}
              <span className="absolute bottom-16 right-12 w-6 h-6 border-b-2 border-r-2 border-white shadow-sm" />
            </div>

            {/* Floating Translucent Controls at Bottom Center matching Screenshot 2 */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center space-x-4 z-20">
              {/* Flip Button */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex flex-col items-center justify-center hover:bg-black/60 transition-colors shadow"
                title="Flip Camera"
              >
                <SwitchCamera className="w-4 h-4" />
                <span className="text-[9px] font-medium leading-none mt-0.5">Flip</span>
              </button>

              {/* Shutter / Capture Button */}
              <button
                type="button"
                onClick={() => {
                  if (isScanning) {
                    captureFrameNow();
                  } else {
                    startCamera();
                  }
                }}
                className="w-12 h-12 rounded-full bg-blue-600 border-2 border-white text-white flex items-center justify-center shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                title="Capture Scan"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-white" />
              </button>

              {/* Flash Button */}
              <button
                type="button"
                onClick={toggleFlash}
                className={`w-10 h-10 rounded-full backdrop-blur-md border border-white/20 text-white flex flex-col items-center justify-center transition-colors shadow ${
                  torchOn ? "bg-amber-500/80" : "bg-black/40 hover:bg-black/60"
                }`}
                title="Flash Toggle"
              >
                <Zap className="w-4 h-4" />
                <span className="text-[9px] font-medium leading-none mt-0.5">Flash</span>
              </button>
            </div>

            {/* Camera error message */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-30">
                <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
                <p className="text-xs text-rose-200 max-w-sm mb-3 font-mono">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                >
                  Retry Camera
                </button>
              </div>
            )}
          </div>

          {/* Action button: Start Live Camera Scan matching Screenshot 2 */}
          {!isScanning ? (
            <button
              type="button"
              onClick={startCamera}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Start Live Camera Scan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              <CameraOff className="w-4 h-4" />
              <span>Stop Camera Scan</span>
            </button>
          )}

          {/* Divider: OR matching Screenshot 2 */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium tracking-wider">
                OR
              </span>
            </div>
          </div>

          {/* Hidden File Input for Upload Tab */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Decoded QR Content & Verification Form matching Screenshot 2 */}
          <form onSubmit={handleManualSubmit} className="space-y-4">
            {/* Decoded UPI QR Content (Intent URI) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Decoded UPI QR Content / Intent URI
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  placeholder="upi://pay?pa=...&pn=...&mc=..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded"
                  title="Copy Decoded URI"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Two Side-by-Side Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Visual Store Branding (Detected)
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={claimedBrand}
                    onChange={(e) => setClaimedBrand(e.target.value)}
                    placeholder="e.g. Tata Starbucks Pvt Ltd"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1 mb-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mock POS Terminal Signature</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={posSignature}
                    onChange={(e) => setPosSignature(e.target.value)}
                    placeholder="e.g. SIG_POS_AUTH_TATA_SBUX_..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Dark Action Button matching Screenshot 2 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Running Gemini AI & Merchant Registry Verification...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Verify QR Authenticity & Counter Match</span>
                </>
              )}
            </button>
          </form>

          {/* Gemini Multimodal Standee Inspector Toggle Drawer */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                className="flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Gemini Vision Standee Inspector Options</span>
              </button>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  geminiApiKey
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {geminiApiKey ? "API KEY CONFIGURED" : "OPTIONAL AI KEY"}
              </span>
            </div>

            {showSettingsDrawer && (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    Gemini Multimodal AI Vision Key
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={geminiApiKey}
                    onChange={(e) => handleSaveApiKey(e.target.value)}
                    placeholder="Enter Gemini API key (optional for simulated vision)"
                    className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  When active, Gemini analyzes standee images to cross-reference counter logos with digital VPAs.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right-Hand Contextual Panel (4-5 cols) matching Screenshot 2 */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: How to use QR Guardian matching Screenshot 2 */}
          <div className="bg-[#f0f7ff] border border-blue-100 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Info className="w-3.5 h-3.5 text-white" />
              </div>
              <span>How to use QR Guardian</span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="leading-relaxed">
                  Point your camera at any UPI QR code or upload an image.
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="leading-relaxed">
                  We decode the UPI intent, verify merchant identity, and check for tampering.
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="leading-relaxed">
                  View risk analysis, merchant details, and safety recommendations.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Live Scan Results matching Screenshot 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            {/* Header with Live Status */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                Live Scan Results
              </h2>

              <div className="flex items-center space-x-1.5 text-xs font-medium">
                {loading ? (
                  <span className="text-blue-600 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    <span>Analyzing...</span>
                  </span>
                ) : isScanning ? (
                  <span className="text-amber-600 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Scanning</span>
                  </span>
                ) : result ? (
                  result.is_swapped ? (
                    <span className="text-rose-600 flex items-center space-x-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Tampering Flagged</span>
                    </span>
                  ) : (
                    <span className="text-emerald-600 flex items-center space-x-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Verified</span>
                    </span>
                  )
                ) : (
                  <span className="text-emerald-600 flex items-center space-x-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Ready</span>
                  </span>
                )}
              </div>
            </div>

            {/* Empty State before Scan matching Screenshot 2 */}
            {!result ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 mb-1">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">
                  No QR code scanned yet
                </h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Scan a UPI QR code using your camera or upload an image to see instant analysis results.
                </p>
              </div>
            ) : (
              /* Verified / Analyzed Scan Results */
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Prominent Verdict Banner */}
                {result.is_swapped ? (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                    <div className="flex items-center space-x-2 font-bold text-xs sm:text-sm text-rose-900">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>PHYSICAL QR STICKER TAMPERING DETECTED</span>
                    </div>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      {result.guidance || "DO NOT PAY! The physical QR code at this counter has been replaced or tampered with."}
                    </p>
                  </div>
                ) : result.is_verified ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                    <div className="flex items-center space-x-2 font-bold text-xs sm:text-sm text-emerald-900">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>VERIFIED OFFICIAL MERCHANT</span>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      {result.guidance || "Verified official merchant. Safe to proceed with payment."}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                    <div className="flex items-center space-x-2 font-bold text-xs text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>UNREGISTERED COMMERCIAL ENTITY</span>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      {result.guidance || "This VPA is not enrolled in the national enterprise registry. Proceed with caution."}
                    </p>
                  </div>
                )}

                {/* Risk Gauge */}
                <RiskGauge score={result.risk_score} subtitle={result.risk_tier} />

                {/* 4-Tier Data Origin Breakdown as required in Section 4 */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  {/* 1. Extracted directly from QR payload */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-200 font-sans">
                      <span>1. Extracted from QR Payload</span>
                      <span className="text-[10px] text-blue-600 font-mono">Decoded</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payee VPA:</span>
                      <span className="text-slate-900 font-semibold truncate max-w-[200px]">
                        {result.parsed_payload?.vpa || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payee Name:</span>
                      <span className="text-slate-800">
                        {result.parsed_payload?.merchant_name || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">MCC Code:</span>
                      <span className="text-slate-700">
                        {result.parsed_payload?.mcc_code || "0000"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mode:</span>
                      <span className="text-slate-700">
                        {result.parsed_payload?.qr_mode || "Static"}
                      </span>
                    </div>
                    {result.parsed_payload?.amount && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount:</span>
                        <span className="text-emerald-700 font-bold">
                          ₹{result.parsed_payload.amount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 2. Returned by trusted external / backend source */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-200 font-sans">
                      <span>2. Trusted Registry Lookup</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        result.is_verified
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {result.is_verified ? "ENROLLED" : "NOT ENROLLED"}
                      </span>
                    </div>
                    {result.merchant_details ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Registered Entity:</span>
                          <span className="text-emerald-700 font-bold">
                            {result.merchant_details.brand_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Registered VPA:</span>
                          <span className="text-slate-800">
                            {result.merchant_details.registered_vpa}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Category:</span>
                          <span className="text-slate-700">
                            {result.merchant_details.category}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tier:</span>
                          <span className="text-emerald-700 font-bold">
                            {result.merchant_details.tier}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-500 font-sans italic">
                        No enterprise registration on file for VPA "{result.parsed_payload?.vpa}".
                      </p>
                    )}
                  </div>

                  {/* 3. User-Entered Merchant Info & 4. Verification Comparison */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-200 font-sans">
                      <span>3. Counter Branding & Cryptographic Signature</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        result.is_swapped
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {result.is_swapped ? "CONTRADICTION" : "CONSISTENT"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Visual Store:</span>
                      <span className="text-slate-800 font-semibold">{claimedBrand || "None entered"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Counter Match:</span>
                      <span className={result.is_swapped ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                        {result.is_swapped ? "FAILED (Sticker Swap Detected)" : "PASSED"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">POS Signature:</span>
                      <span className={result.pos_signature_valid ? "text-emerald-700 font-bold" : "text-slate-600"}>
                        {result.pos_signature_valid ? "VALID (Ed25519 Hardware POS)" : "Not present / Unsigned"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gemini Vision AI Standee Findings (if present) */}
                {gemini && !gemini.error && (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Gemini Vision AI Standee Findings</span>
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        gemini.tampering_detected
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {gemini.tampering_detected ? "TAMPERING OBSERVED" : "CLEARED"}
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px] text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Visual Brand Detected:</span>
                        <span className="font-semibold text-slate-900">{gemini.visual_brand_detected}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cross-Modal Invariance:</span>
                        <span className={gemini.cross_modal_match ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                          {gemini.cross_modal_match ? "Match" : "CONTRADICTION"}
                        </span>
                      </div>
                    </div>
                    {gemini.forensic_reasoning && (
                      <p className="text-[11px] text-slate-600 italic pt-1 border-t border-blue-100 leading-relaxed font-sans">
                        "{gemini.forensic_reasoning}"
                      </p>
                    )}
                  </div>
                )}

                {/* Evidence Checklist */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-semibold text-slate-800 block">
                    Security Analysis Checklist
                  </span>
                  {(result.evidence || []).map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-0.5"
                    >
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-800 font-semibold">{ev.type}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            ev.status === "PASS"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{ev.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist: What we analyze matching Screenshot 2 */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                <span>What we analyze</span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>UPI payload structure & parameters</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Merchant name and VPA verification</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>QR tampering and malicious redirection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>NPCI format compliance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Counterfeit sticker detection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Risk score and safety recommendations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
