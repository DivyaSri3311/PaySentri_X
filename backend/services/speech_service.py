"""
PaySentriX GhostPay Neural Speech Recognition Service.
Supports OpenAI Whisper API when configured, with seamless offline local inference
via faster-whisper on CPU/arm64.
Zero external network dependencies required for baseline operation.
Transcribes English, Hindi, and Hinglish for UPI payment verification.
"""

import os
import io
import tempfile
import threading
from typing import Dict, Any, Optional

from backend.config import OPENAI_API_KEY as CONFIG_OPENAI_KEY

try:
    from faster_whisper import WhisperModel
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class GhostPaySpeechService:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.model: Optional[WhisperModel] = None
        self.model_name = "tiny"
        self._init_model()

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def _init_model(self):
        if not WHISPER_AVAILABLE:
            print("[SpeechService] faster-whisper not installed.")
            return
        try:
            # Load tiny model with int8 quantization for ultra-fast local inference
            self.model = WhisperModel(self.model_name, device="cpu", compute_type="int8")
            print("[SpeechService] Local Whisper Neural STT loaded successfully.")
        except Exception as e:
            print(f"[SpeechService] Error loading Whisper model: {e}")
            self.model = None

    def transcribe_audio_bytes(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        openai_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribes audio bytes to text.
        First tries OpenAI Whisper API if key is available, then falls back to local faster-whisper.
        """
        api_key = openai_api_key or CONFIG_OPENAI_KEY or os.getenv("OPENAI_API_KEY", "")

        # 1. Try OpenAI Whisper API if API key is present
        if OPENAI_AVAILABLE and api_key:
            try:
                client = openai.OpenAI(api_key=api_key)
                file_obj = io.BytesIO(audio_bytes)
                file_obj.name = filename or "audio.webm"
                
                resp = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=file_obj
                )
                text = resp.text.strip()
                return {
                    "status": "SUCCESS",
                    "engine": "OpenAI Whisper Cloud API",
                    "transcript": text,
                    "detected_language": "auto",
                    "language_probability": 0.99,
                    "duration": 0.0
                }
            except Exception as e:
                print(f"[SpeechService] OpenAI Whisper API error ({e}). Falling back to local Whisper model.")

        # 2. Local Whisper Neural Inference (faster-whisper)
        if not self.model:
            return {
                "status": "ERROR",
                "transcript": "",
                "error": "Whisper speech recognition model is not loaded on server."
            }

        suffix = os.path.splitext(filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            segments, info = self.model.transcribe(
                tmp_path,
                beam_size=1,
                best_of=1,
                temperature=0.0,
                condition_on_previous_text=False
            )
            transcript_parts = [segment.text.strip() for segment in segments]
            full_transcript = " ".join(transcript_parts).strip()

            return {
                "status": "SUCCESS",
                "engine": "PaySentriX Local Whisper Neural STT",
                "transcript": full_transcript,
                "detected_language": info.language if info else "en",
                "language_probability": round(info.language_probability, 3) if info else 1.0,
                "duration": round(info.duration, 2) if info else 0.0
            }
        except Exception as e:
            print(f"[SpeechService] Local transcription error: {e}")
            return {
                "status": "ERROR",
                "transcript": "",
                "error": str(e)
            }
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
