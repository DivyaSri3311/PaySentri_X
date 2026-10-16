import React, { useState, useRef, useEffect } from "react";
import {
  QrCode,
  Upload,
  Camera,
  CameraOff,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Store,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  SwitchCamera,
  ExternalLink,
  Info,
  Copy,
  Check,
  ChevronDown,
  BarChart2,
  Zap,
  FileText,
  Receipt,
  ArrowRight,
  Sun,
  Moon,
  X
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
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Ignore audio block
  }
}

export default function QRGuardianPage({ prefilledData, setActivePage, onOpenComplaintModal }) {
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
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("paysentrix_scam_checker_theme") || "light";
  });
  const isDark = theme === "dark";

  const toggleTheme = (newMode) => {
    const target = newMode || (theme === "light" ? "dark" : "light");
    setTheme(target);
    try {
      localStorage.setItem("paysentrix_scam_checker_theme", target);
      document.documentElement.classList.toggle("dark", target === "dark");
      window.dispatchEvent(new Event("paysentrix_scam_checker_theme_changed"));
    } catch {}
  };

  useEffect(() => {
    const onThemeChange = () => {
      const stored = localStorage.getItem("paysentrix_scam_checker_theme");
      if (stored && stored !== theme) {
        setTheme(stored);
        document.documentElement.classList.toggle("dark", stored === "dark");
      }
    };
    window.addEventListener("paysentrix_scam_checker_theme_changed", onThemeChange);
    return () => window.removeEventListener("paysentrix_scam_checker_theme_changed", onThemeChange);
  }, [theme]);

  // Live Camera Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [torchOn, setTorchOn] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSaveApiKey = (val) => {
    setGeminiApiKey(val);
    localStorage.setItem("paysentrix_gemini_api_key", val);
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
          ? "Camera permission denied. Allow camera in browser settings."
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
    setTorchOn(false);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    if (isScanning) {
      stopCamera();
      setTimeout(startCamera, 200);
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current) {
      setTorchOn(!torchOn);
      return;
    }
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.getCapabilities && track.getCapabilities().torch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }]
        });
        setTorchOn(!torchOn);
      } catch (e) {
        console.warn("Torch constraint failed", e);
        setTorchOn(!torchOn);
      }
    } else {
      setTorchOn(!torchOn);
    }
  };

  const captureFrameNow = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const snapshot = canvas.toDataURL("image/jpeg", 0.85);
      setImagePreview(snapshot);
      playScanBeep();
      stopCamera();
      runVerification(qrText, snapshot);
    } else {
      // Trigger verification using active preview
      runVerification(qrText, imagePreview);
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
      const imagePayload =
        typeof snapshotToVerify === "string" && snapshotToVerify.startsWith("data:image")
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

      try {
        localStorage.setItem(
          "paysentrix_last_qr_context",
          JSON.stringify({
            qr_text: textToVerify,
            merchant_name: res.parsed_payload?.merchant_name || claimedBrand,
            vpa: res.parsed_payload?.vpa,
            amount: res.parsed_payload?.amount
          })
        );
      } catch {
        // Storage non-fatal
      }
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
    <div className={`space-y-6 transition-colors duration-200 ${isDark ? "text-slate-100" : "text-slate-800"}`}>
      {/* Top Page Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b transition-colors ${
        isDark ? "border-slate-800" : "border-slate-200/80"
      }`}>
        <div className="flex items-center space-x-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0 border transition-all ${
            isDark
              ? "bg-gradient-to-br from-cyan-600 to-blue-700 text-white border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
              : "bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-500/20"
          }`}>
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className={`text-xl sm:text-2xl font-bold font-heading tracking-tight transition-colors ${
                isDark ? "text-white" : "text-slate-900"
              }`}>
                Payment Scam Checker
              </h1>
              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs transition-colors ${
                isDark
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
              }`}>
                <ShieldCheck className={`w-3.5 h-3.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                <span>NPCI Compliant</span>
              </span>
            </div>
            <p className={`text-xs sm:text-sm mt-1 leading-relaxed transition-colors ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}>
              Scan or upload any payment QR code to verify <strong className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>merchant</strong> identity, detect tampering, and prevent scam transfers.
            </p>
          </div>
        </div>

        {/* Light & Dark Mode Toggle Switch */}
        <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
          <div className={`flex items-center p-1 rounded-xl border transition-all ${
            isDark
              ? "bg-slate-900/90 border-slate-700/80 shadow-inner"
              : "bg-slate-100/90 border-slate-200/80 shadow-2xs"
          }`}>
            <button
              type="button"
              onClick={() => toggleTheme("light")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isDark
                  ? "bg-white text-amber-600 shadow-xs border border-slate-200/80 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              title="Switch to Light Mode"
            >
              <Sun className={`w-3.5 h-3.5 ${!isDark ? "text-amber-500" : "text-slate-400"}`} />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => toggleTheme("dark")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isDark
                  ? "bg-slate-950 text-cyan-400 shadow-sm border border-cyan-500/40 font-bold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
              }`}
              title="Switch to Dark Mode"
            >
              <Moon className={`w-3.5 h-3.5 ${isDark ? "text-cyan-400" : "text-slate-500"}`} />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 Cols) */}
        <div className={`lg:col-span-7 border rounded-2xl p-5 sm:p-6 space-y-4 transition-colors ${
          isDark
            ? "bg-slate-900/90 border-slate-800 shadow-xl shadow-black/20"
            : "bg-white border-slate-200/80 shadow-sm"
        }`}>
          {/* Top Tabs */}
          <div className={`grid grid-cols-2 gap-3 p-1 rounded-xl border transition-colors ${
            isDark
              ? "bg-slate-950/80 border-slate-800"
              : "bg-slate-100/80 border-slate-200/60"
          }`}>
            <button
              type="button"
              onClick={() => {
                setActiveInputMode("camera");
                if (!isScanning) startCamera();
              }}
              className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeInputMode === "camera"
                  ? isDark
                    ? "bg-slate-800 text-cyan-400 shadow-sm border border-slate-700"
                    : "bg-white text-blue-700 shadow-sm border border-slate-200/60"
                  : isDark
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Live Camera</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopCamera();
                setActiveInputMode("upload");
                fileInputRef.current?.click();
              }}
              className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeInputMode === "upload"
                  ? isDark
                    ? "bg-slate-800 text-cyan-400 shadow-sm border border-slate-700"
                    : "bg-white text-blue-700 shadow-sm border border-slate-200/60"
                  : isDark
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Image</span>
            </button>
          </div>

          {/* Camera Viewfinder Card */}
          <div className={`relative w-full h-[280px] sm:h-[330px] bg-slate-950 rounded-2xl overflow-hidden border flex items-center justify-center shadow-inner group transition-colors ${
            isDark ? "border-slate-800" : "border-slate-200"
          }`}>
            {/* Live Video Stream */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${isScanning ? "block" : "hidden"}`}
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Captured / Uploaded Image Preview (Only when an image is selected) */}
            {!isScanning && imagePreview && (
              <>
                <img
                  src={imagePreview}
                  alt="Captured QR Code Preview"
                  className="w-full h-full object-contain bg-black"
                />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute top-3 right-3 z-30 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-rose-600/90 text-white text-[11px] font-medium backdrop-blur-md border border-white/20 transition-all flex items-center gap-1.5 shadow-md"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove Image</span>
                </button>
              </>
            )}

            {/* Standby Viewfinder Placeholder when no image is loaded and not scanning */}
            {!isScanning && !imagePreview && (
              <div className="flex flex-col items-center justify-center text-center p-6 select-none z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg border ${
                  isDark ? "bg-slate-900/90 border-slate-700/60" : "bg-slate-900 border-slate-700"
                }`}>
                  <QrCode className="w-7 h-7 text-cyan-400 opacity-80" />
                </div>
                <p className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                  Camera Viewfinder Standby
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] leading-relaxed">
                  Start live camera scan or upload a QR code image to analyze
                </p>
              </div>
            )}

            {/* 4 Corner Brackets Framing Target */}
            <div className="absolute inset-0 pointer-events-none p-8 sm:p-12 flex items-center justify-center">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                <span className={`absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl shadow ${
                  isDark ? "border-cyan-400" : "border-white"
                }`} />
                <span className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr shadow ${
                  isDark ? "border-cyan-400" : "border-white"
                }`} />
                <span className={`absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl shadow ${
                  isDark ? "border-cyan-400" : "border-white"
                }`} />
                <span className={`absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br shadow ${
                  isDark ? "border-cyan-400" : "border-white"
                }`} />
              </div>
            </div>

            {/* Floating Translucent Controls at Bottom Center */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md rounded-full px-6 py-2 flex items-center gap-7 border border-white/15 text-white z-20 shadow-lg">
              <button
                type="button"
                onClick={toggleFacingMode}
                className="flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition-colors"
                title="Flip Camera"
              >
                <SwitchCamera className="w-4 h-4" />
                <span className="text-[10px] font-medium leading-none">Flip</span>
              </button>

              <button
                type="button"
                onClick={captureFrameNow}
                className={`w-11 h-11 rounded-full border-2 border-white flex items-center justify-center active:scale-95 transition-all shadow-md ${
                  isDark ? "bg-cyan-500 hover:bg-cyan-400" : "bg-blue-600 hover:bg-blue-500"
                }`}
                title="Capture Scan"
              >
                <span className={`w-4 h-4 rounded-full ${isDark ? "bg-slate-950" : "bg-white"}`} />
              </button>

              <button
                type="button"
                onClick={toggleFlash}
                className={`flex flex-col items-center gap-0.5 transition-colors ${
                  torchOn ? "text-amber-400" : "text-slate-300 hover:text-white"
                }`}
                title="Flash"
              >
                <Zap className="w-4 h-4" />
                <span className="text-[10px] font-medium leading-none">Flash</span>
              </button>
            </div>

            {/* Camera error message */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-30">
                <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
                <p className="text-xs text-rose-200 max-w-sm mb-3 font-mono">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
                >
                  Retry Camera
                </button>
              </div>
            )}
          </div>

          {/* Button: Start Live Camera Scan */}
          {!isScanning ? (
            <button
              type="button"
              onClick={startCamera}
              className={`w-full py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center justify-center space-x-2 ${
                isDark
                  ? "bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Start Live Camera Scan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              <CameraOff className="w-4 h-4" />
              <span>Stop Camera Scan</span>
            </button>
          )}

          {/* Divider: OR */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t transition-colors ${isDark ? "border-slate-800" : "border-slate-200"}`} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={`px-2.5 font-semibold tracking-wider transition-colors ${
                isDark ? "bg-slate-900 text-slate-500" : "bg-white text-slate-400"
              }`}>
                OR
              </span>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Form Section */}
          <form onSubmit={handleManualSubmit} className="space-y-4">
            {/* Decoded UPI QR Content (Intent URI) */}
            <div>
              <label className={`text-xs font-medium block mb-1.5 transition-colors ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}>
                Decoded UPI QR Content / Intent URI
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  placeholder="upi://pay?pa=...&pn=...&mc=..."
                  className={`w-full pl-3.5 pr-20 py-2.5 rounded-xl text-xs font-mono transition-all focus:outline-none ${
                    isDark
                      ? "bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:bg-black"
                      : "bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                  }`}
                />
                <div className="absolute right-2 flex items-center space-x-0.5">
                  {/* Preset selector dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDark
                          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                      }`}
                      title="Select Preset Scenario"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {showPresetDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setShowPresetDropdown(false)}
                        />
                        <div className={`absolute right-0 bottom-full mb-1 w-72 rounded-xl border p-1.5 z-40 animate-in fade-in zoom-in-95 transition-colors ${
                          isDark
                            ? "bg-slate-900 border-slate-800 shadow-2xl text-slate-100"
                            : "bg-white border-slate-200 shadow-xl text-slate-800"
                        }`}>
                          <div className={`px-2.5 py-1 text-[10px] font-bold uppercase ${
                            isDark ? "text-slate-500" : "text-slate-400"
                          }`}>
                            Select Test Scenario
                          </div>
                          {PRESET_QR_SCENARIOS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                loadPreset(preset);
                                setShowPresetDropdown(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                                isDark
                                  ? "hover:bg-slate-800 text-slate-200"
                                  : "hover:bg-slate-50 text-slate-800"
                              }`}
                            >
                              <span className="truncate pr-2">{preset.title}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                isDark
                                  ? "text-cyan-400 bg-cyan-950/70"
                                  : "text-blue-600 bg-blue-50"
                              }`}>
                                {preset.tag}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark
                        ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                    }`}
                    title="Copy Intent URI"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Store Branding & Mock POS Signature in 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={`text-xs font-medium block mb-1.5 transition-colors ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}>
                  Visual Store Branding (Detected)
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={claimedBrand}
                    onChange={(e) => setClaimedBrand(e.target.value)}
                    placeholder="e.g. Tata Starbucks Pvt Ltd"
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs transition-all focus:outline-none ${
                      isDark
                        ? "bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:bg-black"
                        : "bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-medium flex items-center space-x-1 mb-1.5 transition-colors ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}>
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mock POS Terminal Signature</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={posSignature}
                    onChange={(e) => setPosSignature(e.target.value)}
                    placeholder="e.g. SIG_POS_AUTH_TATA_SBUX_..."
                    className={`w-full pl-3.5 pr-3.5 py-2.5 rounded-xl text-xs font-mono transition-all focus:outline-none ${
                      isDark
                        ? "bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:bg-black"
                        : "bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-semibold text-xs sm:text-sm transition-all active:scale-[0.99] flex items-center justify-center space-x-2 disabled:opacity-50 ${
                isDark
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-cyan-500/20 shadow-md"
                  : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-inherit" />
                  <span>Running Verification & Counter Match...</span>
                </span>
              ) : (
                <>
                  <ShieldCheck className={`w-4 h-4 ${isDark ? "text-slate-950" : "text-emerald-400"}`} />
                  <span>Verify QR Authenticity & Counter Match</span>
                </>
              )}
            </button>
          </form>

          {/* Gemini Vision Standee Inspector Options Drawer */}
          <div className={`pt-2 border-t transition-colors ${isDark ? "border-slate-800" : "border-slate-100"}`}>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                className={`flex items-center space-x-1.5 font-medium transition-colors ${
                  isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isDark ? "text-cyan-400" : "text-blue-600"}`} />
                <span>Gemini Vision Standee Inspector Options</span>
              </button>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  geminiApiKey
                    ? isDark
                      ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-semibold"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                    : isDark
                      ? "bg-slate-800 text-slate-400"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {geminiApiKey ? "API KEY CONFIGURED" : "OPTIONAL AI KEY"}
              </span>
            </div>

            {showSettingsDrawer && (
              <div className={`mt-3 p-3.5 rounded-xl space-y-2.5 animate-in fade-in duration-200 border transition-colors ${
                isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    Gemini Multimodal AI Vision Key
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className={`text-[11px] hover:underline flex items-center space-x-1 ${
                      isDark ? "text-cyan-400" : "text-blue-600"
                    }`}
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
                    className={`w-full pl-3 pr-8 py-1.5 rounded-lg text-xs font-mono focus:outline-none transition-colors ${
                      isDark
                        ? "bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500"
                        : "bg-white border border-slate-200 text-slate-800 focus:border-blue-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  When active, Gemini analyzes standee images to cross-reference counter logos with digital VPAs.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: How to use Payment Scam Checker */}
          <div className={`rounded-2xl p-5 shadow-xs space-y-3.5 border transition-all ${
            isDark
              ? "bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-slate-800 text-slate-200 shadow-md"
              : "bg-gradient-to-br from-blue-50/90 to-indigo-50/40 border-blue-200/70 text-slate-900"
          }`}>
            <div className={`flex items-center space-x-2 font-bold text-sm ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                isDark ? "bg-cyan-500 text-slate-950 font-bold" : "bg-blue-600 text-white"
              }`}>
                <Info className="w-3.5 h-3.5" />
              </div>
              <span>How to use Payment Scam Checker</span>
            </div>

            <div className={`space-y-3 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              <div className="flex items-start space-x-3">
                <span className={`w-5 h-5 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 ${
                  isDark ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-blue-600 text-white"
                }`}>
                  1
                </span>
                <p className="leading-relaxed">
                  Point your camera at any UPI QR code or upload an image.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <span className={`w-5 h-5 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 ${
                  isDark ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-blue-600 text-white"
                }`}>
                  2
                </span>
                <p className="leading-relaxed">
                  We decode the UPI intent, verify merchant identity, and check for tampering.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <span className={`w-5 h-5 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 ${
                  isDark ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-blue-600 text-white"
                }`}>
                  3
                </span>
                <p className="leading-relaxed">
                  View risk analysis, merchant details, and safety recommendations.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Live Scan Results */}
          <div className={`border rounded-2xl p-5 shadow-sm space-y-4 transition-colors ${
            isDark
              ? "bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl shadow-black/20"
              : "bg-white border-slate-200 text-slate-900"
          }`}>
            {/* Header with Live Status */}
            <div className={`flex items-center justify-between pb-3 border-b transition-colors ${
              isDark ? "border-slate-800" : "border-slate-100"
            }`}>
              <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                Live Scan Results
              </h2>

              <div className="flex items-center space-x-1.5 text-xs font-medium">
                {loading ? (
                  <span className={`${isDark ? "text-cyan-400" : "text-blue-600"} flex items-center space-x-1`}>
                    <span className={`w-2 h-2 rounded-full ${isDark ? "bg-cyan-400" : "bg-blue-600"} animate-ping`} />
                    <span>Analyzing...</span>
                  </span>
                ) : isScanning ? (
                  <span className="text-amber-500 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Scanning</span>
                  </span>
                ) : result ? (
                  result.is_swapped ? (
                    <span className="text-rose-500 flex items-center space-x-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Tampering Flagged</span>
                    </span>
                  ) : (
                    <span className="text-emerald-500 flex items-center space-x-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Verified</span>
                    </span>
                  )
                ) : (
                  <span className="text-emerald-500 flex items-center space-x-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Ready</span>
                  </span>
                )}
              </div>
            </div>

            {/* Empty State before Scan */}
            {!result ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-1 shadow-sm transition-colors ${
                  isDark ? "border-slate-800 bg-slate-950 text-slate-500" : "border-slate-200 bg-slate-50 text-slate-400"
                }`}>
                  <QrCode className="w-7 h-7" />
                </div>
                <h3 className={`font-semibold text-sm ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                  No QR code scanned yet
                </h3>
                <p className={`text-xs max-w-[260px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Scan a UPI QR code using your camera or upload an image to see instant analysis results.
                </p>
              </div>
            ) : (
              /* Verified / Analyzed Scan Results */
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Prominent Verdict Banner */}
                {result.is_swapped ? (
                  <div className={`p-3.5 rounded-xl border space-y-1 ${
                    isDark ? "bg-rose-950/40 border-rose-500/40 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}>
                    <div className={`flex items-center space-x-2 font-bold text-xs sm:text-sm ${
                      isDark ? "text-rose-200" : "text-rose-900"
                    }`}>
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>PHYSICAL QR STICKER TAMPERING DETECTED</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isDark ? "text-rose-300" : "text-rose-700"}`}>
                      {result.guidance || "DO NOT PAY! The physical QR code at this counter has been replaced or tampered with."}
                    </p>
                  </div>
                ) : result.is_verified ? (
                  <div className={`p-3.5 rounded-xl border space-y-1 ${
                    isDark ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  }`}>
                    <div className={`flex items-center space-x-2 font-bold text-xs sm:text-sm ${
                      isDark ? "text-emerald-200" : "text-emerald-900"
                    }`}>
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>VERIFIED OFFICIAL MERCHANT</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                      {result.guidance || "Verified official merchant. Safe to proceed with payment."}
                    </p>
                  </div>
                ) : (
                  <div className={`p-3.5 rounded-xl border space-y-1 ${
                    isDark ? "bg-amber-950/40 border-amber-500/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}>
                    <div className={`flex items-center space-x-2 font-bold text-xs ${
                      isDark ? "text-amber-200" : "text-amber-900"
                    }`}>
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>UNREGISTERED COMMERCIAL ENTITY</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                      {result.guidance || "This VPA is not enrolled in the national enterprise registry. Proceed with caution."}
                    </p>
                  </div>
                )}

                {/* Risk Gauge */}
                <RiskGauge score={result.risk_score} subtitle={result.risk_tier} isDark={isDark} />

                {/* 4-Tier Data Breakdown */}
                <div className={`space-y-2.5 pt-2 border-t transition-colors ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                  {/* 1. QR Payload */}
                  <div className={`p-3.5 rounded-xl border text-xs space-y-2 font-mono shadow-2xs transition-colors ${
                    isDark ? "bg-slate-950/80 border-slate-800 text-slate-200" : "bg-slate-50/90 border-slate-200/80"
                  }`}>
                    <div className={`flex items-center justify-between text-[11px] font-bold pb-1.5 border-b font-sans ${
                      isDark ? "border-slate-800 text-slate-300" : "border-slate-200/80 text-slate-700"
                    }`}>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-cyan-400" : "bg-blue-600"}`}></span>
                        <span>1. Extracted from QR Payload</span>
                      </span>
                      <span className={`text-[10px] border px-1.5 py-0.5 rounded font-mono font-semibold ${
                        isDark ? "text-cyan-400 bg-cyan-950/50 border-cyan-500/30" : "text-blue-700 bg-blue-50 border-blue-200/60"
                      }`}>Decoded</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>Payee VPA:</span>
                      <span className={`font-semibold truncate max-w-[210px] ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                        {result.parsed_payload?.vpa || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>Payee Name:</span>
                      <span className={`font-sans font-medium truncate max-w-[210px] ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                        {result.parsed_payload?.merchant_name || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>MCC Code:</span>
                      <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {result.parsed_payload?.mcc_code || "0000"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>Mode:</span>
                      <span className={`font-sans ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {result.parsed_payload?.qr_mode || "Static"}
                      </span>
                    </div>
                    {result.parsed_payload?.amount && (
                      <div className={`flex justify-between items-center pt-1 border-t ${isDark ? "border-slate-800" : "border-slate-200/60"}`}>
                        <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>Amount:</span>
                        <span className={`font-bold font-mono text-xs ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                          ₹{result.parsed_payload.amount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 2. Trusted Registry Lookup */}
                  <div className={`p-3.5 rounded-xl border text-xs space-y-2 font-mono shadow-2xs transition-colors ${
                    isDark ? "bg-slate-950/80 border-slate-800 text-slate-200" : "bg-slate-50/90 border-slate-200/80"
                  }`}>
                    <div className={`flex items-center justify-between text-[11px] font-bold pb-1.5 border-b font-sans ${
                      isDark ? "border-slate-800 text-slate-300" : "border-slate-200/80 text-slate-700"
                    }`}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>2. Trusted Registry Lookup</span>
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                        result.is_verified
                          ? isDark ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                          : isDark ? "bg-slate-900 text-slate-400 border-slate-800" : "bg-slate-100 text-slate-600 border-slate-200/80"
                      }`}>
                        {result.is_verified ? "ENROLLED" : "NOT ENROLLED"}
                      </span>
                    </div>
                    {result.merchant_details ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>Registered Entity:</span>
                          <span className={`font-bold font-sans ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                            {result.merchant_details.brand_name}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>Registered VPA:</span>
                          <span className={isDark ? "text-slate-200" : "text-slate-800"}>
                            {result.merchant_details.registered_vpa}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>Category:</span>
                          <span className={`font-sans ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                            {result.merchant_details.category}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>Tier:</span>
                          <span className={`font-bold font-sans ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                            {result.merchant_details.tier}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className={`text-[11px] font-sans italic py-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        No enterprise registration on file for VPA "{result.parsed_payload?.vpa}".
                      </p>
                    )}
                  </div>

                  {/* 3. Counter Branding & POS Signature */}
                  <div className={`p-3.5 rounded-xl border text-xs space-y-2 font-mono shadow-2xs transition-colors ${
                    isDark ? "bg-slate-950/80 border-slate-800 text-slate-200" : "bg-slate-50/90 border-slate-200/80"
                  }`}>
                    <div className={`flex items-center justify-between text-[11px] font-bold pb-1.5 border-b font-sans ${
                      isDark ? "border-slate-800 text-slate-300" : "border-slate-200/80 text-slate-700"
                    }`}>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-cyan-400" : "bg-indigo-600"}`}></span>
                        <span>3. Counter Branding & POS Signature</span>
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                        result.is_swapped
                          ? isDark ? "bg-rose-950/50 text-rose-300 border-rose-500/30" : "bg-rose-50 text-rose-800 border-rose-200/80"
                          : isDark ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                      }`}>
                        {result.is_swapped ? "CONTRADICTION" : "CONSISTENT"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>Visual Store:</span>
                      <span className={`font-sans font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{claimedBrand || "None entered"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>Counter Match:</span>
                      <span className={`font-sans font-bold ${
                        result.is_swapped
                          ? "text-rose-500"
                          : isDark ? "text-emerald-400" : "text-emerald-700"
                      }`}>
                        {result.is_swapped ? "FAILED (Sticker Swap Detected)" : "PASSED"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>POS Signature:</span>
                      <span className={`font-sans font-medium ${
                        result.pos_signature_valid
                          ? isDark ? "text-emerald-400 font-semibold" : "text-emerald-700 font-semibold"
                          : isDark ? "text-slate-400" : "text-slate-600"
                      }`}>
                        {result.pos_signature_valid ? "VALID (Ed25519 Hardware POS)" : "Not present / Unsigned"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gemini Vision AI Standee Findings (if present) */}
                {gemini && !gemini.error && (
                  <div className={`p-3.5 rounded-xl border space-y-2 text-xs transition-colors ${
                    isDark ? "bg-blue-950/30 border-blue-500/30 text-blue-200" : "bg-blue-50/70 border-blue-200 text-slate-800"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold flex items-center space-x-1 ${isDark ? "text-blue-300" : "text-slate-900"}`}>
                        <Sparkles className={`w-3.5 h-3.5 ${isDark ? "text-cyan-400" : "text-blue-600"}`} />
                        <span>Gemini Vision AI Standee Findings</span>
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        gemini.tampering_detected
                          ? isDark ? "bg-rose-950/60 text-rose-300 border border-rose-500/30" : "bg-rose-100 text-rose-800"
                          : isDark ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {gemini.tampering_detected ? "TAMPERING OBSERVED" : "CLEARED"}
                      </span>
                    </div>
                    <div className={`space-y-1 font-mono text-[11px] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      <div className="flex justify-between">
                        <span className={isDark ? "text-slate-400" : "text-slate-500"}>Visual Brand Detected:</span>
                        <span className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{gemini.visual_brand_detected}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDark ? "text-slate-400" : "text-slate-500"}>Cross-Modal Invariance:</span>
                        <span className={`font-bold ${
                          gemini.cross_modal_match
                            ? isDark ? "text-emerald-400" : "text-emerald-700"
                            : isDark ? "text-rose-400" : "text-rose-700"
                        }`}>
                          {gemini.cross_modal_match ? "Match" : "CONTRADICTION"}
                        </span>
                      </div>
                    </div>
                    {gemini.forensic_reasoning && (
                      <p className={`text-[11px] italic pt-1 border-t leading-relaxed font-sans ${
                        isDark ? "text-slate-400 border-blue-900/40" : "text-slate-600 border-blue-100"
                      }`}>
                        "{gemini.forensic_reasoning}"
                      </p>
                    )}
                  </div>
                )}

                {/* Evidence Checklist */}
                <div className="space-y-1.5 pt-2">
                  <span className={`text-xs font-semibold block ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    Security Analysis Checklist
                  </span>
                  {(result.evidence || []).map((ev, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs space-y-0.5 transition-colors ${
                        isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between font-mono">
                        <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{ev.type}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            ev.status === "PASS"
                              ? isDark ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800"
                              : isDark ? "bg-rose-950/60 text-rose-300 border border-rose-500/30" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>
                      <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-600"}`}>{ev.detail}</p>
                    </div>
                  ))}
                </div>

                {/* Action Buttons: 1930 Cybercrime Draft & Reset */}
                <div className="pt-2 flex flex-col gap-2">
                  {onOpenComplaintModal && (
                    <button
                      type="button"
                      onClick={() => onOpenComplaintModal(result.police_draft || `INCIDENT REPORT FOR CYBER CRIME CELL (PORTAL 1930 / CYBERCRIME.GOV.IN)\n=========================================================================\nIncident Type: Swapped QR Sticker Scam / Physical Counter Tampering\nSuspect UPI ID (VPA): ${result.parsed_payload?.vpa || "Unknown"}\nClaimed Brand: ${claimedBrand}\nTampering Flag: Counter mismatch detected`)}
                      className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Generate 1930 Cybercrime Incident Report Draft</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem(
                          "paysentrix_last_qr_context",
                          JSON.stringify({
                            qr_text: qrText,
                            merchant_name: result?.parsed_payload?.merchant_name || claimedBrand,
                            vpa: result?.parsed_payload?.vpa,
                            amount: result?.parsed_payload?.amount
                          })
                        );
                      } catch {}
                      setActivePage?.("ghostpay-detector");
                    }}
                    className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-colors border flex items-center justify-center space-x-1.5 ${
                      isDark
                        ? "bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border-indigo-500/30"
                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Cross-Examine Customer Payment in GhostPay Detector</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setImagePreview(null);
                    }}
                    className={`w-full py-2 rounded-xl font-semibold text-xs transition-colors ${
                      isDark
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Scan Another QR Code
                  </button>
                </div>
              </div>
            )}

            {/* Checklist: What we analyze */}
            <div className={`pt-3 border-t space-y-2.5 transition-colors ${
              isDark ? "border-slate-800" : "border-slate-100"
            }`}>
              <div className={`flex items-center space-x-1.5 text-xs font-bold ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}>
                <BarChart2 className={`w-3.5 h-3.5 ${isDark ? "text-cyan-400" : "text-blue-600"}`} />
                <span>What we analyze</span>
              </div>

              <div className={`space-y-1.5 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                  <span>UPI payload structure & parameters</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                  <span>Merchant name and VPA verification</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                  <span>QR tampering and malicious redirection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                  <span>NPCI format compliance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                  <span>Counterfeit sticker detection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
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
