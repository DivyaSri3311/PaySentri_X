import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Send,
  Radio,
  Cpu,
  Search,
  FileText,
  Clock,
  HelpCircle
} from "lucide-react";
import { api } from "../utils/api";

/**
 * GhostPay AI Payment Investigation Agent & Voice Copilot.
 * 
 * Upgrades Voice Copilot into an autonomous, natural-language AI investigation agent:
 * 1. Powered by OpenAI Whisper for voice transcription and OpenAI LLM for natural-language understanding.
 * 2. Unrestricted natural-language inputs in English, Hindi, and Hinglish.
 * 3. Autonomous tool calling:
 *    - investigate_payment_evidence (OCR, duplicate hash check, tamper analysis, settlement switch check)
 *    - search_transaction_history (audit records & evidence registry)
 *    - update_expected_payment_fields (populates form fields)
 *    - request_missing_evidence (honestly asks for proof, never hallucinates)
 *    - explain_findings_in_language (Hindi/Hinglish translations)
 * 4. Strict, honest verification outcomes:
 *    - VERIFIED BY TRUSTED SOURCE: Only when verified with merchant bank credit.
 *    - SUSPICIOUS: Specific implemented checks detect warning signs.
 *    - NOT VERIFIED: Visual claim present, but bank settlement unconfirmed.
 *    - INSUFFICIENT EVIDENCE: Evidence missing or unreadable.
 */
export default function GhostPayVoiceCopilot({
  capturedImage,
  expectedAmount,
  expectedRecipient,
  expectedVpa,
  expectedUtr,
  approxTime,
  merchantConfirmedCredit,
  onSetAmount,
  onSetRecipient,
  onSetVpa,
  onSetUtr,
  onSetApproxTime,
  onSelectTab,
  onCapturePhoto,
  onAnalyze,
  onSetAnalysisResult,
  onSelectPreset,
  selectedPresetId,
  presets = [],
  hasImage = false,
  onClearForm,
  analysisResult,
  isAnalyzing
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [naturalQueryInput, setNaturalQueryInput] = useState("");
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigationStatus, setInvestigationStatus] = useState("IDLE"); // IDLE | LISTENING | INVESTIGATING | SEARCHING_HISTORY | CLARIFYING | COMPLETED
  const [agentResponse, setAgentResponse] = useState(
    "GhostPay AI Investigation Agent ready. Speak or type your request (e.g. 'Check whether the ₹40 payment on Oct 16 is fake', or 'Verify ₹500 payment to Divya from yesterday')."
  );
  const [agentToolCalls, setAgentToolCalls] = useState([]);
  const [verificationOutcome, setVerificationOutcome] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Audio recording refs for Whisper STT
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const secondsIntervalRef = useRef(null);

  // Spoken feedback helper (browser SpeechSynthesis)
  const speakFeedback = useCallback((text) => {
    if (isMuted || !("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      // Clean up technical symbols for speech
      const cleanSpoken = text.replace(/[₹*_#]/g, "").replace(/https?:\/\/\S+/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanSpoken);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = text.match(/[\u0900-\u097F]/) ? "hi-IN" : "en-IN";

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
      setIsSpeaking(false);
    }
  }, [isMuted]);

  // Stop speaking immediately
  const handleStopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // ---------------------------------------------------------------------------
  // MAIN AI INVESTIGATION PIPELINE
  // ---------------------------------------------------------------------------

  const handleInvestigateQuery = useCallback(async (userQuery) => {
    if (!userQuery || !userQuery.trim()) return;
    const cleanQuery = userQuery.trim();
    handleStopSpeaking();

    // Check for clear form request
    const lower = cleanQuery.toLowerCase();
    if (lower.includes("clear form") || lower.includes("reset form") || lower.includes("clear all")) {
      onClearForm?.();
      setAgentResponse("Form cleared. Evidence and previous parameters reset.");
      setAgentToolCalls([]);
      setVerificationOutcome(null);
      setTranscript("");
      speakFeedback("Form cleared.");
      return;
    }

    // Check for demo preset requests
    if (lower.includes("demo real") || lower.includes("real payment sample") || lower.includes("load real")) {
      const realPreset = presets.find((p) => p.id === "preset-merchant-settled" || p.id.includes("settled") || p.id.includes("real")) || presets[0];
      if (realPreset && onSelectPreset) {
        onSelectPreset(realPreset);
        setAgentResponse("Loaded genuine merchant payment preset. You can now ask: 'Check this screenshot and explain anything suspicious', or click Investigate Evidence.");
        speakFeedback("Loaded genuine merchant payment preset.");
        return;
      }
    }
    if (lower.includes("demo fake") || lower.includes("fake payment sample") || lower.includes("load fake") || lower.includes("spoof")) {
      const fakePreset = presets.find((p) => p.id === "preset-paytm-spoof" || p.id.includes("spoof") || p.id.includes("fake")) || presets[1];
      if (fakePreset && onSelectPreset) {
        onSelectPreset(fakePreset);
        setAgentResponse("Loaded synthetic fake UPI app spoof preset. You can now ask: 'Check this screenshot and explain anything suspicious', or click Investigate Evidence.");
        speakFeedback("Loaded synthetic fake UPI app spoof preset.");
        return;
      }
    }

    // Check for camera capture request
    if (lower.includes("capture photo") || lower.includes("take photo") || lower.includes("snap")) {
      onSelectTab?.("camera");
      onCapturePhoto?.();
      setAgentResponse("Camera frame captured and locked for forensic analysis.");
      speakFeedback("Photo captured.");
      return;
    }

    if (lower.includes("run standard analysis") || lower.includes("manual analyze")) {
      onAnalyze?.();
      return;
    }

    setIsInvestigating(true);
    setInvestigationStatus(
      lower.includes("previous") || lower.includes("history") ? "SEARCHING_HISTORY" : "INVESTIGATING"
    );

    try {
      const customOpenAiKey = localStorage.getItem("paysentrix_openai_api_key") || null;

      const payload = {
        query: cleanQuery,
        image_base64: capturedImage,
        expected_amount: expectedAmount ? parseFloat(expectedAmount) : null,
        expected_recipient_name: expectedRecipient || null,
        expected_vpa: expectedVpa || null,
        expected_utr: expectedUtr || null,
        approx_payment_time: approxTime || null,
        merchant_confirmed_credit: merchantConfirmedCredit,
        preset_scenario_id: selectedPresetId || null,
        conversation_history: conversationHistory.slice(-4),
        openai_api_key: customOpenAiKey,
        current_analysis: analysisResult
      };

      const res = await api.investigateGhostPayAgent(payload);

      if (res && res.status === "SUCCESS") {
        setAgentResponse(res.response_text);
        speakFeedback(res.spoken_text || res.response_text);
        setAgentToolCalls(res.tool_calls || []);
        setVerificationOutcome(res.verification_outcome || null);
        setInvestigationStatus(res.investigation_status || "COMPLETED");

        // Real-Time Form Population from Extracted Entities
        if (res.extracted_fields) {
          const ef = res.extracted_fields;
          if (ef.amount !== null && ef.amount !== undefined) {
            onSetAmount?.(ef.amount.toString());
          }
          if (ef.recipient_name) {
            onSetRecipient?.(ef.recipient_name);
          }
          if (ef.recipient_vpa) {
            onSetVpa?.(ef.recipient_vpa);
          }
          if (ef.utr_number) {
            onSetUtr?.(ef.utr_number);
          }
          if (ef.approx_payment_time) {
            onSetApproxTime?.(ef.approx_payment_time);
          }
        }

        // Real-Time Forensic Result Integration
        if (res.analysis_result) {
          onSetAnalysisResult?.(res.analysis_result);
        }

        // Update multi-turn conversational memory
        setConversationHistory((prev) => [
          ...prev,
          { role: "user", content: cleanQuery },
          { role: "assistant", content: res.response_text }
        ]);
      } else {
        setAgentResponse("Could not complete investigation. Please review your query or use manual verification.");
        setInvestigationStatus("IDLE");
      }
    } catch (err) {
      console.error("AI Investigation error:", err);
      setAgentResponse(`Investigation error: ${err.message || "Failed to contact investigation agent"}. All manual controls remain active.`);
      setInvestigationStatus("IDLE");
    } finally {
      setIsInvestigating(false);
    }
  }, [
    analysisResult,
    approxTime,
    capturedImage,
    conversationHistory,
    expectedAmount,
    expectedRecipient,
    expectedUtr,
    expectedVpa,
    merchantConfirmedCredit,
    onCapturePhoto,
    onClearForm,
    onSelectTab,
    onSetAmount,
    onSetAnalysisResult,
    onSetApproxTime,
    onSetRecipient,
    onSetUtr,
    onSetVpa,
    selectedPresetId,
    speakFeedback
  ]);

  // ---------------------------------------------------------------------------
  // AUDIO RECORDING & OPENAI WHISPER TRANSCRIPTION
  // ---------------------------------------------------------------------------

  const cleanupRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (secondsIntervalRef.current) {
      clearInterval(secondsIntervalRef.current);
      secondsIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setRecordingSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecording();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cleanupRecording]);

  const startWhisperRecording = async () => {
    handleStopSpeaking();
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone API is not supported in this browser environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsListening(false);
        if (secondsIntervalRef.current) clearInterval(secondsIntervalRef.current);
        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 600) {
          setAgentResponse("Audio recording was too short. Click the microphone to speak again.");
          return;
        }

        setAgentResponse("Transcribing audio with OpenAI Whisper...");
        setInvestigationStatus("INVESTIGATING");

        try {
          const customOpenAiKey = localStorage.getItem("paysentrix_openai_api_key") || null;
          const res = await api.transcribeGhostPayVoice(audioBlob, customOpenAiKey);

          if (res && res.transcript && res.transcript.trim()) {
            const spokenText = res.transcript.trim();
            setTranscript(spokenText);
            setNaturalQueryInput(spokenText);
            // Execute investigation automatically with recognized natural language
            handleInvestigateQuery(spokenText);
          } else {
            setAgentResponse("No speech could be recognized. Please try speaking again or type your query.");
            setInvestigationStatus("IDLE");
            speakFeedback("Could not hear clearly. Please try speaking again.");
          }
        } catch (err) {
          console.warn("Whisper transcription failed:", err);
          setAgentResponse("Speech transcription failed. You can type your request directly in the box below.");
          setInvestigationStatus("IDLE");
        }
      };

      recorder.start(200);
      setIsListening(true);
      setInvestigationStatus("LISTENING");
      setAgentResponse("Listening... Speak your payment investigation request, then click Done or pause.");

      secondsIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Auto-stop after 7 seconds of speech
      recordingTimerRef.current = setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 7000);
    } catch (err) {
      console.warn("Microphone access error:", err);
      setIsListening(false);
      setInvestigationStatus("IDLE");
      setAgentResponse(`Microphone access error: ${err.message || "Permission denied"}. You can type requests in the input bar below.`);
    }
  };

  const stopWhisperRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopWhisperRecording();
    } else {
      startWhisperRecording();
    }
  };

  // Manual query submit
  const handleQuerySubmit = (e) => {
    e.preventDefault();
    if (!naturalQueryInput.trim() || isInvestigating) return;
    setTranscript(naturalQueryInput.trim());
    handleInvestigateQuery(naturalQueryInput.trim());
    setNaturalQueryInput("");
  };

  // Helper for Distinct Verification Badges
  const getOutcomeBadge = () => {
    if (!verificationOutcome) return null;

    switch (verificationOutcome) {
      case "VERIFIED_BY_TRUSTED_SOURCE":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-300",
          icon: ShieldCheck,
          label: "VERIFIED BY TRUSTED SOURCE"
        };
      case "SUSPICIOUS_REVIEW_REQUIRED":
      case "SUSPICIOUS":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-300",
          icon: ShieldAlert,
          label: "SUSPICIOUS (WARNING SIGNS DETECTED)"
        };
      case "NOT_VERIFIED":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-300",
          icon: Clock,
          label: "NOT VERIFIED (UNSETTLED CLAIM)"
        };
      case "INSUFFICIENT_EVIDENCE":
        return {
          bg: "bg-slate-100 text-slate-800 border-slate-300",
          icon: HelpCircle,
          label: "INSUFFICIENT EVIDENCE"
        };
      case "VERIFICATION_FAILED":
        return {
          bg: "bg-red-100 text-red-900 border-red-300",
          icon: AlertCircle,
          label: "VERIFICATION FAILED"
        };
      default:
        return null;
    }
  };

  const outcomeBadge = getOutcomeBadge();

  return (
    <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm space-y-3 transition-all">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          {/* Microphone Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all shadow-sm ${
              isListening
                ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-200"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
            title={isListening ? "Stop Speaking / Done" : "Talk to GhostPay Investigation Agent (Whisper)"}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isListening && (
              <span className="absolute -inset-1 rounded-xl bg-rose-500/30 animate-ping pointer-events-none" />
            )}
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900 tracking-tight">GhostPay AI Investigation Agent</span>
              
              {/* Dynamic Investigation Status Badge */}
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isListening
                    ? "bg-rose-50 text-rose-700 border-rose-200 font-semibold"
                    : isInvestigating
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse font-semibold"
                    : isSpeaking
                    ? "bg-amber-50 text-amber-700 border-amber-200 font-semibold"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"
                }`}
              >
                {isListening
                  ? `RECORDING (00:0${recordingSeconds})`
                  : isInvestigating
                  ? (investigationStatus === "SEARCHING_HISTORY" ? "SEARCHING AUDIT HISTORY..." : "AGENT INVESTIGATING...")
                  : isSpeaking
                  ? "SPEAKING"
                  : "AGENT READY"}
              </span>

              <span className="hidden md:inline-flex items-center space-x-1 text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                <Cpu className="w-3 h-3 text-indigo-500" />
                <span>OpenAI Whisper & LLM Agent</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ask any natural-language question in English, Hindi, or Hinglish. Investigates evidence and queries audit history.
            </p>
          </div>
        </div>

        {/* Right Controls: Direct Check + Mute + Stop Speaking */}
        <div className="flex items-center space-x-2">
          {/* Consequential Action: Check Real or Fake */}
          <button
            type="button"
            onClick={() => handleInvestigateQuery("Check this screenshot and explain anything suspicious")}
            disabled={isInvestigating || isAnalyzing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            title="Investigate active screenshot"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isInvestigating || isAnalyzing ? "Investigating..." : "Investigate Evidence"}</span>
          </button>

          {isSpeaking && (
            <button
              type="button"
              onClick={handleStopSpeaking}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 flex items-center space-x-1 transition-colors"
              title="Stop Speaking"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop Speaking</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (isSpeaking) handleStopSpeaking();
              setIsMuted(!isMuted);
            }}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              isMuted
                ? "bg-slate-100 text-slate-400 border-slate-200"
                : "bg-white text-slate-600 hover:text-slate-900 border-slate-200"
            }`}
            title={isMuted ? "Unmute Voice Responses" : "Mute Voice Responses"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {isListening && (
            <button
              type="button"
              onClick={toggleListening}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors"
            >
              Done Speaking
            </button>
          )}
        </div>
      </div>

      {/* AI Investigation Response Card */}
      <div
        className={`p-3 rounded-lg border text-xs transition-all space-y-2 ${
          isListening
            ? "bg-rose-50/70 border-rose-200 text-rose-900"
            : isInvestigating
            ? "bg-indigo-50/80 border-indigo-200 text-indigo-950"
            : outcomeBadge
            ? "bg-slate-50/80 border-slate-200 text-slate-800"
            : "bg-slate-50 border-slate-200 text-slate-700"
        }`}
      >
        <div className="flex items-start space-x-2.5">
          <div className="mt-0.5 shrink-0">
            {isListening ? (
              <Radio className="w-4 h-4 text-rose-600 animate-pulse" />
            ) : isInvestigating ? (
              <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
            ) : outcomeBadge ? (
              <outcomeBadge.icon className="w-4 h-4 text-indigo-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-600" />
            )}
          </div>

          <div className="flex-1 space-y-1.5">
            {/* Recognized transcript */}
            {transcript && (
              <div className="text-[11px] font-mono text-slate-500">
                Understood: <span className="font-semibold text-slate-900">"{transcript}"</span>
              </div>
            )}

            {/* Distinct Outcome Badge */}
            {outcomeBadge && (
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-tight">
                <outcomeBadge.icon className="w-3.5 h-3.5" />
                <span>{outcomeBadge.label}</span>
              </div>
            )}

            {/* Agent Evidence-Backed Response Text */}
            <div className="font-medium text-xs leading-relaxed text-slate-800 whitespace-pre-line">
              {agentResponse}
            </div>

            {/* Tool Calls Executed by Agent */}
            {agentToolCalls.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Investigative Tools:
                </span>
                {agentToolCalls.map((tc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-600"
                  >
                    {tc.tool === "investigate_payment_evidence" && <ShieldCheck className="w-3 h-3 text-indigo-600" />}
                    {tc.tool === "search_transaction_history" && <Search className="w-3 h-3 text-blue-600" />}
                    {tc.tool === "update_expected_payment_fields" && <FileText className="w-3 h-3 text-emerald-600" />}
                    {tc.tool === "request_missing_evidence" && <HelpCircle className="w-3 h-3 text-amber-600" />}
                    {tc.tool === "explain_findings_in_language" && <Sparkles className="w-3 h-3 text-purple-600" />}
                    <span>{tc.tool.replace(/_/g, " ")}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversational Natural-Language Input Bar */}
      <form onSubmit={handleQuerySubmit} className="flex items-center space-x-2">
        <input
          type="text"
          value={naturalQueryInput}
          onChange={(e) => setNaturalQueryInput(e.target.value)}
          placeholder="Ask anything: 'Check whether the ₹40 payment on Oct 16 is fake', 'Find previous analysis'..."
          disabled={isInvestigating}
          className="flex-1 text-xs px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 transition-all placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!naturalQueryInput.trim() || isInvestigating}
          className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask Agent</span>
        </button>
      </form>

      {/* Natural Language Example Prompt Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
        <span className="text-slate-400 font-medium">Try asking:</span>
        <button
          type="button"
          onClick={() => {
            setTranscript("Check whether the ₹40 payment on October 16, 2026, at 11 AM is fake.");
            handleInvestigateQuery("Check whether the ₹40 payment on October 16, 2026, at 11 AM is fake.");
          }}
          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          “Check whether ₹40 payment on Oct 16 is fake”
        </button>

        <button
          type="button"
          onClick={() => {
            setTranscript("Verify the ₹500 payment to Divya from yesterday.");
            handleInvestigateQuery("Verify the ₹500 payment to Divya from yesterday.");
          }}
          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          “Verify ₹500 payment to Divya from yesterday”
        </button>

        <button
          type="button"
          onClick={() => {
            setTranscript("Check this screenshot and explain anything suspicious.");
            handleInvestigateQuery("Check this screenshot and explain anything suspicious.");
          }}
          className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors font-medium"
        >
          “Check this screenshot and explain suspicious”
        </button>

        <button
          type="button"
          onClick={() => {
            setTranscript("Find the previous analysis for this transaction.");
            handleInvestigateQuery("Find the previous analysis for this transaction.");
          }}
          className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors"
        >
          “Find previous analysis”
        </button>

        <button
          type="button"
          onClick={() => {
            setTranscript("Explain the result in Hindi.");
            handleInvestigateQuery("Explain the result in Hindi.");
          }}
          className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-colors"
        >
          “Explain result in Hindi”
        </button>
      </div>
    </div>
  );
}
