import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Receipt,
  Camera,
  CameraOff,
  Upload,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Copy,
  Check,
  SwitchCamera,
  Lock,
  ArrowRight,
  FileText,
  Clock,
  Sparkles,
  Info,
  Trash2,
  Search
} from "lucide-react";
import RiskGauge from "../components/RiskGauge";
import { api } from "../utils/api";

export default function GhostPayDetectorPage({ prefilledData, setActivePage, onOpenComplaintModal }) {
  // Input Modes: "camera" | "upload" | "qr-workflow"
  const [activeTab, setActiveTab] = useState("camera");

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [facingMode, setFacingMode] = useState("environment"); // "environment" | "user"

  // Image Evidence State
  const [capturedImage, setCapturedImage] = useState(null); // base64 data URI
  const [imageMeta, setImageMeta] = useState(null); // { name, size, type }

  // Transaction Expected Details Form
  const [expectedAmount, setExpectedAmount] = useState(prefilledData?.expected_amount || "");
  const [expectedRecipient, setExpectedRecipient] = useState(prefilledData?.expected_recipient_name || "");
  const [expectedVpa, setExpectedVpa] = useState(prefilledData?.expected_vpa || "");
  const [approxTime, setApproxTime] = useState(prefilledData?.approx_payment_time || "");
  const [expectedUtr, setExpectedUtr] = useState(prefilledData?.expected_utr || "");
  const [merchantConfirmedCredit, setMerchantConfirmedCredit] = useState(false);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [presets, setPresets] = useState([]);

  // QR Workflow Integration State
  const [lastQrContext, setLastQrContext] = useState(null);

  // Video and Canvas Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. Stop Camera cleanup
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // 2. Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser or requires HTTPS.");
      }

      // Enumerate video devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch {
        // Enumerate error non-fatal
      }

      const constraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn("GhostPay Camera Error:", err);
      setCameraError(err.message || "Unable to access camera. Please check permissions or upload a screenshot.");
      setIsCameraActive(false);
    }
  }, [facingMode, selectedDeviceId, stopCamera]);

  // Handle Tab Switch
  useEffect(() => {
    if (activeTab === "camera" && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, capturedImage, startCamera, stopCamera]);

  // Load Presets and Stored QR Context on Mount
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const p = await api.getGhostPayPresets();
        setPresets(p);
      } catch (e) {
        console.warn("Could not fetch GhostPay presets:", e);
      }
    };
    fetchPresets();

    // Check localStorage for recent QR Guardian scan context
    try {
      const stored = localStorage.getItem("paysentrix_last_qr_context");
      if (stored) {
        setLastQrContext(JSON.parse(stored));
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  // Capture current frame from Video Stream
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const b64 = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedImage(b64);
    setImageMeta({
      name: `camera_capture_${Date.now()}.jpg`,
      size: `${Math.round((b64.length * 3) / 4 / 1024)} KB`,
      type: "image/jpeg"
    });
    stopCamera();
  };

  // Retake Photo
  const handleRetakePhoto = () => {
    setCapturedImage(null);
    setImageMeta(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setSelectedPresetId(null);
    startCamera();
  };

  // Flip Camera
  const handleSwitchFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    setSelectedDeviceId("");
  };

  // File Upload Handlers
  const handleFileSelected = (file) => {
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setAnalysisError("Invalid file type. Please upload a JPG, PNG, or WebP payment screenshot.");
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setAnalysisError("File size exceeds 10MB limit. Please upload a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target.result;
      setCapturedImage(b64);
      setImageMeta({
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        type: file.type
      });
      setAnalysisError(null);
      setAnalysisResult(null);
      setSelectedPresetId(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Import QR Context
  const handleImportQrContext = (ctx) => {
    if (!ctx) return;
    if (ctx.amount) setExpectedAmount(ctx.amount);
    if (ctx.merchant_name) setExpectedRecipient(ctx.merchant_name);
    if (ctx.vpa) setExpectedVpa(ctx.vpa);
  };

  // Apply Demo Preset
  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setCapturedImage(preset.image_base64);
    setImageMeta({
      name: `${preset.id}.png`,
      size: "Synthetic HD",
      type: "image/png"
    });
    setExpectedAmount(preset.expected_amount || "");
    setExpectedRecipient(preset.expected_recipient_name || "");
    setExpectedVpa(preset.expected_vpa || "");
    setExpectedUtr(preset.expected_utr || "");
    setApproxTime(preset.approx_payment_time || "");
    setMerchantConfirmedCredit(preset.merchant_confirmed_credit || false);
    setAnalysisResult(null);
    setAnalysisError(null);
    stopCamera();
  };

  // Analyze Evidence
  const handleAnalyzePayment = async () => {
    if (!capturedImage && !expectedAmount && !expectedUtr) {
      setAnalysisError("Please capture/upload a payment screenshot or enter expected payment details.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const customKey = localStorage.getItem("paysentrix_gemini_api_key") || "";
      const payload = {
        image_base64: capturedImage,
        expected_amount: expectedAmount ? parseFloat(expectedAmount) : null,
        expected_recipient_name: expectedRecipient ? expectedRecipient.trim() : null,
        expected_vpa: expectedVpa ? expectedVpa.trim() : null,
        approx_payment_time: approxTime ? approxTime.trim() : null,
        expected_utr: expectedUtr ? expectedUtr.trim() : null,
        merchant_confirmed_credit: merchantConfirmedCredit,
        gemini_api_key: customKey || null,
        preset_scenario_id: selectedPresetId || null
      };

      const res = await api.analyzeGhostPay(payload);
      setAnalysisResult(res);
    } catch (err) {
      console.error("GhostPay Analysis Failed:", err);
      setAnalysisError(err.message || "Failed to analyze payment evidence. Ensure backend is running on port 8000.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helpers for Result Styling
  const getAssessmentStyle = (assessment) => {
    switch (assessment) {
      case "VERIFIED_BY_TRUSTED_SOURCE":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          text: "text-emerald-800",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: ShieldCheck,
          label: "VERIFIED BY TRUSTED SOURCE"
        };
      case "SUSPICIOUS_REVIEW_REQUIRED":
        return {
          bg: "bg-rose-50",
          border: "border-rose-200",
          text: "text-rose-800",
          badge: "bg-rose-100 text-rose-800 border-rose-300",
          icon: ShieldAlert,
          label: "SUSPICIOUS — REVIEW REQUIRED"
        };
      case "INSUFFICIENT_EVIDENCE":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-800",
          badge: "bg-amber-100 text-amber-800 border-amber-300",
          icon: HelpCircle,
          label: "INSUFFICIENT EVIDENCE"
        };
      case "NOT_VERIFIED":
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-900",
          badge: "bg-blue-100 text-blue-800 border-blue-300",
          icon: AlertTriangle,
          label: "NOT VERIFIED"
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">GhostPay Detector</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-mono">
                  Screenshot Forensics
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                “A payment screenshot is a claim. Verify the transaction.” — Detect fake UPI receipts and spoof app claims.
              </p>
            </div>
          </div>
        </div>

        {/* Security Indicator Pill */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-sm text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Preliminary Screenshot Analysis</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 font-mono text-[11px]">Non-Settlement Evidence</span>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-amber-950">Important Merchant Notice: </span>
          Screenshot analysis evaluates visual integrity and extracted consistency only. A customer screenshot cannot prove that funds were deposited into your bank account. Always verify credit confirmation via your official merchant app, bank SMS, or soundbox before releasing goods.
        </div>
      </div>

      {/* Main Grid: Left Workspace (Input & Details) vs Right Contextual Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Input & Transaction Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* A. Capture Workspace Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Payment Evidence Capture
              </span>

              {/* 3 Input Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-lg space-x-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("camera");
                    setCapturedImage(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center space-x-1.5 ${
                    activeTab === "camera"
                      ? "bg-white text-blue-600 shadow-sm font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capture Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center space-x-1.5 ${
                    activeTab === "upload"
                      ? "bg-white text-blue-600 shadow-sm font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Screenshot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("qr-workflow")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center space-x-1.5 ${
                    activeTab === "qr-workflow"
                      ? "bg-white text-blue-600 shadow-sm font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>From QR Workflow</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Live Camera Viewport */}
            {activeTab === "camera" && (
              <div className="space-y-4">
                {!capturedImage ? (
                  <div className="relative aspect-[4/3] sm:aspect-video w-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-300 shadow-inner">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        isCameraActive ? "opacity-100" : "opacity-0"
                      }`}
                    />

                    {/* Camera Offline / Blocked Fallback */}
                    {!isCameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 text-white space-y-3">
                        <div className="p-3 rounded-full bg-slate-800 text-slate-400">
                          <CameraOff className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">
                            {cameraError ? "Camera Access Blocked" : "Live Camera Inactive"}
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm mt-1">
                            {cameraError ||
                              "Click below to start your device camera, or switch to Upload Screenshot tab."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors shadow-sm"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Start Camera Preview</span>
                        </button>
                      </div>
                    )}

                    {/* Camera Framing Overlay */}
                    {isCameraActive && (
                      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                        {/* Corner Brackets */}
                        <div className="flex justify-between">
                          <div className="w-8 h-8 border-t-2 border-l-2 border-white/80 rounded-tl-lg" />
                          <div className="w-8 h-8 border-t-2 border-r-2 border-white/80 rounded-tr-lg" />
                        </div>

                        {/* Center Target Box */}
                        <div className="self-center text-center px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-[11px] text-white/90 border border-white/20">
                          Align customer payment confirmation inside frame
                        </div>

                        <div className="flex justify-between">
                          <div className="w-8 h-8 border-b-2 border-l-2 border-white/80 rounded-bl-lg" />
                          <div className="w-8 h-8 border-b-2 border-r-2 border-white/80 rounded-br-lg" />
                        </div>
                      </div>
                    )}

                    {/* Live Camera Bottom Floating Action Bar */}
                    {isCameraActive && (
                      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center space-x-4 px-4 z-10">
                        {/* Switch Front/Back or Device Selector */}
                        {availableDevices.length > 1 ? (
                          <select
                            value={selectedDeviceId}
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                            className="bg-black/60 text-white text-[11px] font-medium py-1.5 px-2 rounded-lg backdrop-blur-md border border-white/20 outline-none max-w-[140px] truncate"
                            title="Select Video Camera"
                          >
                            {availableDevices.map((dev, i) => (
                              <option key={dev.deviceId || i} value={dev.deviceId} className="bg-slate-900 text-white">
                                {dev.label || `Camera ${i + 1}`}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSwitchFacingMode}
                            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all text-xs flex items-center space-x-1"
                            title="Switch Camera Facing"
                          >
                            <SwitchCamera className="w-4 h-4" />
                          </button>
                        )}

                        {/* Capture Shutter Button */}
                        <button
                          type="button"
                          onClick={handleCapturePhoto}
                          className="w-14 h-14 rounded-full bg-white hover:bg-slate-100 text-blue-600 flex items-center justify-center shadow-lg transition-transform active:scale-95 border-4 border-blue-600/30"
                          title="Capture Payment Photo"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                            <Camera className="w-5 h-5" />
                          </div>
                        </button>

                        {/* Stop Camera */}
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all text-xs"
                          title="Stop Camera"
                        >
                          <CameraOff className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Captured Photo Preview Card */
                  <div className="space-y-3">
                    <div className="relative aspect-[4/3] sm:aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm flex items-center justify-center">
                      <img
                        src={capturedImage}
                        alt="Captured payment confirmation"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[11px] text-white flex items-center space-x-1.5 border border-white/20">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Photo Frozen for Forensics</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{imageMeta?.name}</span> ({imageMeta?.size})
                      </div>
                      <button
                        type="button"
                        onClick={handleRetakePhoto}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center space-x-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retake Photo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Upload Screenshot */}
            {activeTab === "upload" && (
              <div className="space-y-4">
                {!capturedImage ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center bg-slate-50 hover:bg-blue-50/30 transition-all cursor-pointer space-y-3"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => handleFileSelected(e.target.files?.[0])}
                    />

                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Drag and drop customer payment screenshot here
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Supported formats: JPG, PNG, WebP (up to 10MB)
                      </p>
                    </div>

                    <button
                      type="button"
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg border border-slate-300 shadow-sm"
                    >
                      Browse Files
                    </button>
                  </div>
                ) : (
                  /* Uploaded Image Preview */
                  <div className="space-y-3">
                    <div className="relative aspect-[4/3] sm:aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                      <img
                        src={capturedImage}
                        alt="Uploaded payment screenshot"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{imageMeta?.name}</span> ({imageMeta?.size})
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center space-x-1.5 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCapturedImage(null);
                            setImageMeta(null);
                            setAnalysisResult(null);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: QR Workflow Integration */}
            {activeTab === "qr-workflow" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span>Cross-Reference with Counter QR Guardian</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Customer scanned your counter standee QR code? You can import the registered payee VPA, merchant branding, and locked amount directly into GhostPay’s expected parameters to cross-examine against their phone screen.
                  </p>

                  {lastQrContext ? (
                    <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span>Latest Scanned QR Session:</span>
                        <span className="text-[10px] text-blue-600 font-mono">Active Cache</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono">
                        <div>Merchant: <span className="text-slate-900 font-medium">{lastQrContext.merchant_name || "N/A"}</span></div>
                        <div>VPA: <span className="text-slate-900 font-medium">{lastQrContext.vpa || "N/A"}</span></div>
                        <div>Amount: <span className="text-slate-900 font-medium">{lastQrContext.amount ? `₹${lastQrContext.amount}` : "Dynamic"}</span></div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImportQrContext(lastQrContext)}
                        className="w-full mt-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-md border border-blue-200 flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Import Parameters into Verification Form</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                      No active QR scan found in current session. You can open QR Guardian to scan your counter QR first.
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActivePage?.("qr-guardian")}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg flex items-center space-x-1.5 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Open QR Guardian Scanner</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* B. Demo Test Presets Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Demo Presets & Synthetic Evidence
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">1-Click Test Scenarios</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-400 ring-1 ring-blue-400"
                        : "bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 truncate pr-2">{preset.title}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full shrink-0 ${
                        preset.badge === "Critical Risk" ? "bg-rose-100 text-rose-800" :
                        preset.badge === "High Risk" ? "bg-orange-100 text-orange-800" :
                        preset.badge === "Verified Safe" ? "bg-emerald-100 text-emerald-800" :
                        "bg-slate-200 text-slate-700"
                      }`}>
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* C. Transaction Expected Details Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Transaction Expected Details (Optional)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Cross-Examination Parameters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Expected Amount (₹ INR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 350.00"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:bg-white focus:border-blue-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Expected Recipient / Shop Name</label>
                <input
                  type="text"
                  placeholder="e.g. Chai Point Mountain Trail"
                  value={expectedRecipient}
                  onChange={(e) => setExpectedRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Expected UPI ID / VPA</label>
                <input
                  type="text"
                  placeholder="e.g. chaipoint@yesbank"
                  value={expectedVpa}
                  onChange={(e) => setExpectedVpa(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:bg-white focus:border-blue-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Expected UTR / Ref (If Known)</label>
                <input
                  type="text"
                  placeholder="e.g. 430198274192"
                  value={expectedUtr}
                  onChange={(e) => setExpectedUtr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:bg-white focus:border-blue-500 outline-none text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-medium mb-1">Approximate Payment Timestamp</label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. 15 Oct 2026, 07:15 PM"
                    value={approxTime}
                    onChange={(e) => setApproxTime(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500 outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Merchant Bank Confirmation Checkbox */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-3 text-xs">
              <input
                id="merchant-settlement-check"
                type="checkbox"
                checked={merchantConfirmedCredit}
                onChange={(e) => setMerchantConfirmedCredit(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="merchant-settlement-check" className="text-slate-700 cursor-pointer select-none">
                <span className="font-semibold text-slate-900">Independent Bank Confirmation:</span> I have personally checked my official merchant app / bank account / SMS / soundbox and confirmed funds were credited.
              </label>
            </div>

            {/* Privacy Reminder */}
            <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Privacy Guard: Never enter or request customer UPI PINs, OTPs, or passwords.</span>
            </div>

            {/* Error Message */}
            {analysisError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{analysisError}</span>
              </div>
            )}

            {/* Main Action Button */}
            <button
              type="button"
              disabled={isAnalyzing || (!capturedImage && !expectedAmount && !expectedUtr)}
              onClick={handleAnalyzePayment}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-[0.99]"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Multimodal Evidence Forensics...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Analyse Payment Evidence</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Contextual Results & Guide Panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* If No Analysis Result Yet: Show How-to Guide & What We Analyze */}
          {!analysisResult ? (
            <div className="space-y-6">
              {/* How to use GhostPay */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>How to use GhostPay Detector</span>
                </div>

                <div className="space-y-3.5 text-xs text-slate-600">
                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="leading-relaxed">
                      <strong className="text-slate-800">Capture or Upload:</strong> Take a photo of the customer's phone display, upload a screenshot, or select one of the demo presets.
                    </p>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="leading-relaxed">
                      <strong className="text-slate-800">Cross-Examine Details:</strong> Enter expected amount, payee name, or UTR to verify whether the displayed receipt matches reality.
                    </p>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="leading-relaxed">
                      <strong className="text-slate-800">Forensic Verdict:</strong> Review OCR extractions, duplicate hash alerts, visual tampering flags, and independent settlement guidance.
                    </p>
                  </div>
                </div>
              </div>

              {/* What We Analyze Checklist */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  What we analyze
                </span>

                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Multimodal OCR extraction of amount, recipient, and 12-digit UTR</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Cross-comparison with expected merchant name and UPI VPA</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Perceptual image dHash & SHA-256 duplicate evidence detection</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Image tampering & spoof app editing metadata inspection</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Independent bank settlement verification status disclosure</span>
                  </li>
                </ul>
              </div>

              {/* Golden Rule of Merchant Safety */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 shadow-sm">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Golden Security Rule</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Never dispense goods or approve refunds solely on a customer's phone screen. Fake UPI apps can simulate realistic success screens with sounds in under 3 seconds.
                </p>
              </div>
            </div>
          ) : (
            /* Analysis Results Panel */
            <div className="space-y-5">
              {/* Overall Assessment Banner */}
              {(() => {
                const style = getAssessmentStyle(analysisResult.overall_assessment);
                const IconComponent = style.icon;

                return (
                  <div className={`p-4 rounded-xl border ${style.bg} ${style.border} space-y-2.5 shadow-sm`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <IconComponent className={`w-5 h-5 ${style.text}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${style.badge}`}>
                        Risk Tier: {analysisResult.risk_tier}
                      </span>
                    </div>

                    <p className={`text-xs font-medium ${style.text} leading-relaxed`}>
                      {analysisResult.explanation}
                    </p>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold">Recommended Action:</span>
                      <span className="font-semibold text-slate-900 text-right max-w-xs truncate">
                        {analysisResult.recommended_action}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Risk Gauge & Confidence Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Forensic Risk Level
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Confidence: {Math.round((analysisResult.extracted_details?.ocr_confidence || 0.85) * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-around py-2">
                  <RiskGauge score={analysisResult.risk_score} size="medium" />
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500">Verdict:</span>
                      <span className="font-bold text-slate-900">{analysisResult.prediction}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500">App Identified:</span>
                      <span className="font-mono text-slate-800 font-semibold">
                        {analysisResult.extracted_details?.payment_app || "Unknown App"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500">Audit ID:</span>
                      <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {analysisResult.audit_id || "LOGGED"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extracted Details Matrix */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Extracted Confirmation Fields
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">OCR Extraction</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-medium">Claimed Amount:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {analysisResult.extracted_details?.amount !== null && analysisResult.extracted_details?.amount !== undefined
                        ? `₹ ${Number(analysisResult.extracted_details.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : "Not Extracted"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-medium">Recipient Name:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[200px]" title={analysisResult.extracted_details?.recipient_name}>
                      {analysisResult.extracted_details?.recipient_name || "Unknown"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-medium">Recipient VPA:</span>
                    <span className="font-mono text-slate-800 text-[11px] truncate max-w-[190px]">
                      {analysisResult.extracted_details?.recipient_vpa || "Unknown"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-medium">UPI Ref / UTR:</span>
                    <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                      <span className="text-slate-900 font-bold">
                        {analysisResult.extracted_details?.utr_number || "None"}
                      </span>
                      {analysisResult.extracted_details?.utr_number && (
                        <button
                          type="button"
                          onClick={() => handleCopy(analysisResult.extracted_details.utr_number, "utr")}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Copy UTR"
                        >
                          {copiedField === "utr" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-medium">Claimed Timestamp:</span>
                    <span className="text-slate-700 text-[11px]">
                      {analysisResult.extracted_details?.timestamp_text || "Not visible"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Forensic Checklist & Indicators */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Analysis Verification Checklist
                </span>

                <div className="space-y-2">
                  {analysisResult.analysis_checklist?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border flex items-start space-x-2.5 text-xs bg-slate-50 border-slate-100"
                    >
                      {item.status === "PASS" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : item.status === "FAIL" ? (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : item.status === "WARN" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800">{item.item}</div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplicate Evidence & Bank Provider Info */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3 text-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Fingerprint & Settlement Disclosure
                </span>

                <div className="space-y-2 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Image SHA-256:</span>
                    <span className="font-mono text-slate-700 truncate max-w-[200px]">
                      {analysisResult.duplicate_evidence?.sha256?.slice(0, 16)}...
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Perceptual dHash:</span>
                    <span className="font-mono text-slate-700">
                      {analysisResult.duplicate_evidence?.dhash}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Settlement Verification:</span>
                    <span className={`font-semibold ${
                      analysisResult.bank_verification_provider?.verified ? "text-emerald-700" : "text-amber-700"
                    }`}>
                      {analysisResult.bank_verification_provider?.verified ? "Bank Verified" : "Direct Settlement Unavailable"}
                    </span>
                  </div>
                </div>

                {/* Complaint Drafting Action if suspicious */}
                {analysisResult.overall_assessment === "SUSPICIOUS_REVIEW_REQUIRED" && (
                  <button
                    type="button"
                    onClick={() => {
                      const draft = `NATIONAL CYBERCRIME REPORT (1930) - FAKE PAYMENT SCREENSHOT / GHOSTPAY FRAUD\nIncident Date: ${new Date().toISOString()}\nClaimed Amount: ₹${analysisResult.extracted_details?.amount || expectedAmount}\nClaimed Recipient: ${analysisResult.extracted_details?.recipient_name || expectedRecipient}\nReported UTR: ${analysisResult.extracted_details?.utr_number || expectedUtr || 'N/A'}\nEvidence Summary: ${analysisResult.explanation}\nAudit ID: ${analysisResult.audit_id}`;
                      onOpenComplaintModal?.(draft);
                    }}
                    className="w-full mt-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Draft 1930 Cybercrime Incident Report</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
