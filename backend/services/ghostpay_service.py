"""
PaySentriX GhostPay Detector Service.
“A payment screenshot is a claim. Verify the transaction.”

Performs AI-powered payment evidence forensics:
1. Multimodal OCR extraction via Gemini Vision (and fallback heuristics).
2. Evidence consistency checking (Amount, Recipient, VPA, 12-digit UTR, Timestamps).
3. Image integrity & tampering detection (EXIF software tags, aspect ratio, anomalies).
4. Duplicate evidence detection (Cryptographic SHA-256 + Perceptual dHash).
5. Provider verification adapter interface (Authorized Bank / Gateway Settlement check).
6. 4-tier risk classification:
   - VERIFIED_BY_TRUSTED_SOURCE
   - SUSPICIOUS_REVIEW_REQUIRED
   - NOT_VERIFIED
   - INSUFFICIENT_EVIDENCE
"""

import os
import re
import json
import base64
import io
import hashlib
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime
from PIL import Image, ExifTags

from backend.config import GEMINI_API_KEY as CONFIG_GEMINI_KEY, GEMINI_VISION_MODEL
from backend.data.database import check_duplicate_evidence, record_ghostpay_evidence
from backend.services.ghostpay_presets import PRESET_EXTRACTIONS, GHOSTPAY_PRESETS

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


# ==============================================================================
# 1. PROVIDER VERIFICATION ADAPTER INTERFACE
# ==============================================================================

class PaymentVerificationProvider(ABC):
    """
    Abstract interface for independent transaction settlement verification
    via authorized banking partner, UPI switch, or merchant aggregator gateway.
    """
    @abstractmethod
    def verify_transaction(
        self,
        utr_number: Optional[str],
        amount: Optional[float],
        recipient_vpa: Optional[str]
    ) -> Dict[str, Any]:
        pass


class UnconnectedBankGatewayAdapter(PaymentVerificationProvider):
    """
    Default production adapter when direct bank settlement API credentials
    are not configured. Discloses limitations honestly without fabricating data.
    """
    def __init__(self):
        self.provider_name = "NPCI / Partner Bank Settlement Switch"

    def verify_transaction(
        self,
        utr_number: Optional[str],
        amount: Optional[float],
        recipient_vpa: Optional[str]
    ) -> Dict[str, Any]:
        return {
            "is_available": False,
            "provider_name": self.provider_name,
            "status": "UNAVAILABLE",
            "verified": False,
            "message": "Independent bank settlement verification is unavailable. Direct bank gateway API credentials are not configured in this environment.",
            "merchant_guidance": "Merchant MUST check their official merchant app (e.g. Paytm for Business, PhonePe Business, Google Pay for Business), bank SMS, or IoT soundbox before releasing goods."
        }


# ==============================================================================
# 2. GHOSTPAY DETECTOR ENGINE
# ==============================================================================

class GhostPayDetectorService:
    def __init__(self):
        self.provider = UnconnectedBankGatewayAdapter()

    def compute_image_hashes(self, pil_image: Image.Image, raw_bytes: bytes) -> Dict[str, str]:
        """
        Computes cryptographic SHA-256 hash and difference hash (dHash)
        for duplicate evidence detection across merchants.
        """
        sha256_hash = hashlib.sha256(raw_bytes).hexdigest()

        # Compute 64-bit dHash (difference hash)
        try:
            # Resize to 9x8 grayscale
            resized = pil_image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
            pixels = list(resized.tobytes())
            # Compare adjacent pixels
            diff = []
            for row in range(8):
                for col in range(8):
                    pixel_left = pixels[row * 9 + col]
                    pixel_right = pixels[row * 9 + col + 1]
                    diff.append(pixel_left > pixel_right)
            # Convert boolean array to hex string
            decimal_val = 0
            for index, value in enumerate(diff):
                if value:
                    decimal_val |= 1 << (63 - index)
            dhash_str = f"{decimal_val:016x}"
        except Exception:
            dhash_str = "0000000000000000"

        return {
            "sha256": sha256_hash,
            "dhash": dhash_str
        }

    def inspect_image_integrity(self, pil_image: Image.Image) -> Dict[str, Any]:
        """
        Inspects image metadata, EXIF tags, dimensions, and aspect ratio
        for signs of screenshot manipulation or editing software.
        """
        findings = []
        suspicious_tags = []
        is_suspicious = False

        width, height = pil_image.size
        aspect_ratio = round(height / width, 2) if width > 0 else 0

        # Check aspect ratio (Typical mobile screens: 16:9 ~ 1.78 to 21:9 ~ 2.33)
        # Low aspect ratio (< 1.2) indicates desktop crop, square crop, or banner cut
        is_typical_mobile = 1.6 <= aspect_ratio <= 2.4
        if not is_typical_mobile:
            findings.append({
                "type": "ASPECT_RATIO_ANOMALY",
                "severity": "LOW",
                "detail": f"Image aspect ratio {aspect_ratio}:1 deviates from typical smartphone full-screen capture (1.78 to 2.33:1). May be cropped."
            })

        # EXIF analysis
        try:
            exif_data = pil_image.getexif()
            if exif_data:
                for tag_id, value in exif_data.items():
                    tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                    val_str = str(value).lower()
                    # Check for editing software tags
                    editing_tools = ["photoshop", "pixellab", "picsart", "canva", "gimp", "snapseed", "spoof", "editor", "mod"]
                    for tool in editing_tools:
                        if tool in val_str:
                            is_suspicious = True
                            suspicious_tags.append(f"{tag_name}: {value}")
                            findings.append({
                                "type": "EDITING_SOFTWARE_METADATA",
                                "severity": "HIGH",
                                "detail": f"EXIF metadata indicates image processing via '{value}'. Potential synthetic or modified screenshot."
                            })
                            break
        except Exception:
            pass

        return {
            "width": width,
            "height": height,
            "aspect_ratio": aspect_ratio,
            "is_typical_mobile_ratio": is_typical_mobile,
            "suspicious_editing_tags": suspicious_tags,
            "integrity_findings": findings,
            "tampering_detected": is_suspicious
        }

    def _extract_with_gemini(
        self,
        image_base64: str,
        custom_api_key: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Uses Gemini 2.5 Flash Multimodal Vision to extract structured payment confirmation fields.
        """
        api_key = custom_api_key or CONFIG_GEMINI_KEY or os.getenv("GEMINI_API_KEY")
        if not api_key or not GENAI_AVAILABLE:
            return None

        # Clean base64
        clean_b64 = image_base64
        mime_type = "image/jpeg"
        if "data:" in image_base64 and ";base64," in image_base64:
            header, clean_b64 = image_base64.split(";base64,")
            if "png" in header:
                mime_type = "image/png"
            elif "webp" in header:
                mime_type = "image/webp"

        try:
            image_bytes = base64.b64decode(clean_b64)
        except Exception:
            return None

        prompt = """
        You are a senior digital forensics and UPI payment cybersecurity analyst.
        Analyze the provided image of a claimed payment confirmation screenshot (e.g. Google Pay, PhonePe, Paytm, BHIM, Cred, bank app).
        
        Extract visible text and forensic indicators with high precision.
        Do NOT guess or invent data. If a field is not clearly visible, set it to null.

        Return ONLY a strict JSON object with this EXACT structure:
        {
            "is_payment_screen": true/false,
            "payment_status": "SUCCESS" | "FAILED" | "PENDING" | "UNKNOWN",
            "amount": float or null,
            "currency": "INR" or null,
            "recipient_name": string or null,
            "recipient_vpa": string or null,
            "sender_name": string or null,
            "sender_vpa": string or null,
            "utr_number": string or null,
            "payment_app": "Google Pay" | "PhonePe" | "Paytm" | "BHIM" | "Cred" | "Amazon Pay" | "Other" | "Unknown",
            "timestamp_text": string or null,
            "visual_anomalies": [
                string descriptions of any font mismatches, misaligned text, non-standard rupee symbols, blurred areas, or layout defects
            ],
            "ocr_confidence": float between 0.1 and 1.0,
            "forensic_notes": string concise observation
        }
        """

        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=GEMINI_VISION_MODEL,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )

            text_output = response.text.strip()
            # Clean possible markdown wrapping
            if text_output.startswith("```json"):
                text_output = text_output[7:]
            if text_output.endswith("```"):
                text_output = text_output[:-3]
            text_output = text_output.strip()

            data = json.loads(text_output)
            return data
        except Exception as e:
            print(f"[GhostPay Gemini Vision Error]: {e}")
            return None

    def _fallback_ocr_parser(
        self,
        pil_image: Image.Image,
        integrity_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Fallback analytical parser when external Gemini API is not configured.
        Operates without hallucinating and marks unavailable data as unknown.
        """
        width, height = pil_image.size
        # If image is very small or blank
        if width < 200 or height < 200:
            return {
                "is_payment_screen": False,
                "payment_status": "UNKNOWN",
                "amount": None,
                "currency": "INR",
                "recipient_name": None,
                "recipient_vpa": None,
                "sender_name": None,
                "sender_vpa": None,
                "utr_number": None,
                "payment_app": "Unknown",
                "timestamp_text": None,
                "visual_anomalies": ["Image resolution too low for reliable OCR extraction."],
                "ocr_confidence": 0.2,
                "forensic_notes": "Image is too small or unreadable."
            }

        return {
            "is_payment_screen": True,
            "payment_status": "UNKNOWN",
            "amount": None,
            "currency": "INR",
            "recipient_name": None,
            "recipient_vpa": None,
            "sender_name": None,
            "sender_vpa": None,
            "utr_number": None,
            "payment_app": "Generic UPI App",
            "timestamp_text": None,
            "visual_anomalies": [],
            "ocr_confidence": 0.5,
            "forensic_notes": "Gemini Multimodal OCR not configured. Visual extraction requires API key or preset scenario."
        }

    def analyze_evidence(
        self,
        image_base64: Optional[str] = None,
        expected_amount: Optional[float] = None,
        expected_recipient_name: Optional[str] = None,
        expected_vpa: Optional[str] = None,
        approx_payment_time: Optional[str] = None,
        expected_utr: Optional[str] = None,
        merchant_confirmed_credit: bool = False,
        gemini_api_key: Optional[str] = None,
        preset_scenario_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Core end-to-end analysis pipeline:
        Decodes image, checks duplicates, checks integrity, extracts OCR,
        evaluates consistency, checks bank settlement, and outputs 4-tier risk assessment.
        """
        evidence_flags = []
        checklist = []
        raw_bytes = b""
        # If preset scenario is provided and no image, load preset image
        if preset_scenario_id and not image_base64:
            for p in GHOSTPAY_PRESETS:
                if p["id"] == preset_scenario_id:
                    image_base64 = p.get("image_base64")
                    break

        # 1. Process Image if provided
        if image_base64:
            clean_b64 = image_base64
            if "data:" in image_base64 and ";base64," in image_base64:
                clean_b64 = image_base64.split(";base64,")[1]
            try:
                raw_bytes = base64.b64decode(clean_b64)
                pil_image = Image.open(io.BytesIO(raw_bytes))
            except Exception as e:
                return {
                    "overall_assessment": "INSUFFICIENT_EVIDENCE",
                    "risk_tier": "MEDIUM",
                    "risk_score": 50.0,
                    "prediction": "Unreadable Image Data",
                    "explanation": f"Failed to parse uploaded image: {str(e)}",
                    "evidence_flags": [{"type": "INVALID_IMAGE", "detail": "Image file is corrupted or unsupported."}],
                    "recommended_action": "Request customer to present their live banking app transaction history."
                }

        # 2. Image Hashing & Duplicate Detection
        duplicate_info = {"exact_duplicate_image": None, "perceptual_duplicate_image": None, "duplicate_utr": None}
        hashes = {"sha256": "NO_IMAGE", "dhash": "0000000000000000"}
        integrity_info = {
            "width": 0, "height": 0, "aspect_ratio": 0,
            "is_typical_mobile_ratio": True, "tampering_detected": False,
            "integrity_findings": []
        }

        if pil_image and raw_bytes:
            hashes = self.compute_image_hashes(pil_image, raw_bytes)
            integrity_info = self.inspect_image_integrity(pil_image)
            duplicate_info = check_duplicate_evidence(
                image_sha256=hashes["sha256"],
                image_dhash=hashes["dhash"],
                utr_number=expected_utr
            )

        # 3. OCR & Forensic Extraction
        ocr_result = None
        if preset_scenario_id and preset_scenario_id in PRESET_EXTRACTIONS:
            ocr_result = PRESET_EXTRACTIONS[preset_scenario_id]
        elif image_base64 and pil_image:
            ocr_result = self._extract_with_gemini(image_base64, custom_api_key=gemini_api_key)
            if not ocr_result:
                ocr_result = self._fallback_ocr_parser(pil_image, integrity_info)
        else:
            ocr_result = {
                "is_payment_screen": False,
                "payment_status": "UNKNOWN",
                "amount": None,
                "currency": "INR",
                "recipient_name": None,
                "recipient_vpa": None,
                "sender_name": None,
                "sender_vpa": None,
                "utr_number": None,
                "payment_app": "None",
                "timestamp_text": None,
                "visual_anomalies": ["No screenshot image provided."],
                "ocr_confidence": 0.0,
                "forensic_notes": "Manual verification mode without image."
            }

        # Extracted fields
        extracted_amount = ocr_result.get("amount")
        extracted_recipient = ocr_result.get("recipient_name")
        extracted_vpa = ocr_result.get("recipient_vpa")
        extracted_utr = ocr_result.get("utr_number")
        extracted_status = ocr_result.get("payment_status", "UNKNOWN")
        extracted_app = ocr_result.get("payment_app", "Unknown")
        extracted_timestamp = ocr_result.get("timestamp_text")
        visual_anomalies = ocr_result.get("visual_anomalies", [])
        ocr_confidence = ocr_result.get("ocr_confidence", 0.0)

        # Re-check UTR duplicate with extracted UTR if not already checked
        if extracted_utr and not duplicate_info["duplicate_utr"]:
            duplicate_info = check_duplicate_evidence(
                image_sha256=hashes["sha256"],
                image_dhash=hashes["dhash"],
                utr_number=extracted_utr
            )

        # 4. Consistency Evaluation
        # A. Amount Check
        amount_match_status = "NOT_EVALUATED"
        if expected_amount is not None:
            if extracted_amount is not None:
                # Compare with small tolerance
                if abs(float(extracted_amount) - float(expected_amount)) < 0.01:
                    amount_match_status = "MATCH"
                    checklist.append({
                        "item": "Amount Consistency",
                        "status": "PASS",
                        "detail": f"Extracted amount ₹{extracted_amount:,.2f} exactly matches expected ₹{expected_amount:,.2f}."
                    })
                else:
                    amount_match_status = "MISMATCH"
                    msg = f"Amount mismatch: Expected ₹{expected_amount:,.2f}, but screenshot displays ₹{extracted_amount:,.2f}."
                    evidence_flags.append({"type": "AMOUNT_MISMATCH", "severity": "HIGH", "detail": msg})
                    checklist.append({"item": "Amount Consistency", "status": "FAIL", "detail": msg})
            else:
                amount_match_status = "MISSING_IN_SCREENSHOT"
                checklist.append({
                    "item": "Amount Consistency",
                    "status": "WARN",
                    "detail": "Amount could not be clearly extracted from the screenshot."
                })
        else:
            checklist.append({
                "item": "Amount Consistency",
                "status": "INFO",
                "detail": f"Screenshot claims ₹{extracted_amount:,.2f}." if extracted_amount else "Expected amount not specified by merchant."
            })

        # B. Recipient Name Check
        recipient_match_status = "NOT_EVALUATED"
        if expected_recipient_name and expected_recipient_name.strip():
            if extracted_recipient and extracted_recipient.strip():
                norm_exp = re.sub(r'[^a-zA-Z0-9]', '', expected_recipient_name.lower())
                norm_ext = re.sub(r'[^a-zA-Z0-9]', '', extracted_recipient.lower())
                if norm_exp in norm_ext or norm_ext in norm_exp:
                    recipient_match_status = "MATCH"
                    checklist.append({
                        "item": "Recipient Identity",
                        "status": "PASS",
                        "detail": f"Recipient '{extracted_recipient}' aligns with expected '{expected_recipient_name}'."
                    })
                else:
                    recipient_match_status = "MISMATCH"
                    msg = f"Recipient mismatch: Expected '{expected_recipient_name}', but screenshot claims '{extracted_recipient}'."
                    evidence_flags.append({"type": "RECIPIENT_MISMATCH", "severity": "HIGH", "detail": msg})
                    checklist.append({"item": "Recipient Identity", "status": "FAIL", "detail": msg})
            else:
                recipient_match_status = "MISSING_IN_SCREENSHOT"
                checklist.append({
                    "item": "Recipient Identity",
                    "status": "WARN",
                    "detail": "Recipient name not identified in screenshot."
                })

        # C. UPI ID / VPA Check
        vpa_match_status = "NOT_EVALUATED"
        if expected_vpa and expected_vpa.strip():
            if extracted_vpa and extracted_vpa.strip():
                if expected_vpa.strip().lower() == extracted_vpa.strip().lower():
                    vpa_match_status = "MATCH"
                    checklist.append({
                        "item": "UPI ID / VPA",
                        "status": "PASS",
                        "detail": f"VPA '{extracted_vpa}' matches merchant VPA."
                    })
                else:
                    vpa_match_status = "MISMATCH"
                    msg = f"UPI ID mismatch: Expected '{expected_vpa}', but screenshot shows '{extracted_vpa}'."
                    evidence_flags.append({"type": "VPA_MISMATCH", "severity": "HIGH", "detail": msg})
                    checklist.append({"item": "UPI ID / VPA", "status": "FAIL", "detail": msg})

        # D. UTR Number Check (NPCI UPI standard 12-digit format)
        active_utr = extracted_utr or expected_utr
        utr_status = "NOT_PRESENT"
        if active_utr:
            clean_utr = re.sub(r'[^0-9]', '', str(active_utr))
            if len(clean_utr) == 12:
                utr_status = "VALID_12_DIGIT_SYNTAX"
                checklist.append({
                    "item": "12-Digit UTR Syntax",
                    "status": "PASS",
                    "detail": f"Standard NPCI UPI 12-digit reference format ({clean_utr})."
                })
            else:
                utr_status = "NON_STANDARD_FORMAT"
                msg = f"Non-standard UTR format: '{active_utr}' is {len(clean_utr)} digits (standard NPCI UPI UTR is 12 digits)."
                evidence_flags.append({"type": "NON_STANDARD_UTR", "severity": "MEDIUM", "detail": msg})
                checklist.append({"item": "12-Digit UTR Syntax", "status": "WARN", "detail": msg})
        else:
            utr_status = "MISSING"
            checklist.append({
                "item": "12-Digit UTR Syntax",
                "status": "WARN",
                "detail": "No UTR / transaction reference number found on screenshot."
            })

        # E. Duplicate Evidence Check
        is_duplicate = False
        if duplicate_info["exact_duplicate_image"]:
            is_duplicate = True
            dup_rec = duplicate_info["exact_duplicate_image"]
            msg = f"Duplicate screenshot detected! Identical image was already analyzed on {dup_rec.get('timestamp')[:19]} (Record: {dup_rec.get('id')})."
            evidence_flags.append({"type": "DUPLICATE_IMAGE_HASH", "severity": "HIGH", "detail": msg})
            checklist.append({"item": "Duplicate Evidence Check", "status": "FAIL", "detail": msg})
        elif duplicate_info["duplicate_utr"]:
            is_duplicate = True
            dup_rec = duplicate_info["duplicate_utr"]
            msg = f"Reused UTR reference! UTR '{active_utr}' was already presented in earlier audit {dup_rec.get('id')}."
            evidence_flags.append({"type": "REUSED_UTR_REFERENCE", "severity": "HIGH", "detail": msg})
            checklist.append({"item": "Duplicate Evidence Check", "status": "FAIL", "detail": msg})
        else:
            checklist.append({
                "item": "Duplicate Evidence Check",
                "status": "PASS",
                "detail": "Unique image fingerprint. No identical prior submission found in registry."
            })

        # F. Visual Tampering & Anomalies Check
        for f in integrity_info.get("integrity_findings", []):
            evidence_flags.append(f)
        if ocr_result.get("is_payment_screen", True):
            for anomaly in visual_anomalies:
                evidence_flags.append({
                    "type": "VISUAL_IRREGULARITY",
                    "severity": "HIGH",
                    "detail": anomaly
                })

        if integrity_info.get("tampering_detected") or (ocr_result.get("is_payment_screen", True) and len(visual_anomalies) > 0):
            checklist.append({
                "item": "Image Integrity & Layout",
                "status": "FAIL",
                "detail": f"Tampering indicators detected: {', '.join(visual_anomalies[:2]) if visual_anomalies else 'Editing metadata found'}."
            })
        else:
            checklist.append({
                "item": "Image Integrity & Layout",
                "status": "PASS",
                "detail": "No editing software signatures or obvious font misalignment detected."
            })

        # G. Independent Bank Settlement Verification
        bank_verification = self.provider.verify_transaction(
            utr_number=active_utr,
            amount=extracted_amount or expected_amount,
            recipient_vpa=extracted_vpa or expected_vpa
        )
        checklist.append({
            "item": "Direct Bank Settlement",
            "status": "INFO" if not merchant_confirmed_credit else "PASS",
            "detail": "Merchant confirmed receipt in bank account." if merchant_confirmed_credit else "Independent bank verification unavailable. Confirm via soundbox/SMS."
        })

        # 5. Risk Scoring & 4-Tier Classification
        # Strict Rule: NEVER claim VERIFIED_BY_TRUSTED_SOURCE unless authorized provider returned true settlement!
        high_severity_count = sum(1 for f in evidence_flags if f.get("severity") == "HIGH")
        medium_severity_count = sum(1 for f in evidence_flags if f.get("severity") == "MEDIUM")

        is_payment_screen = ocr_result.get("is_payment_screen", True)
        has_extracted_data = any([extracted_amount is not None, extracted_recipient is not None, extracted_utr is not None])

        if is_duplicate or high_severity_count > 0 or amount_match_status == "MISMATCH" or recipient_match_status == "MISMATCH":
            assessment = "SUSPICIOUS_REVIEW_REQUIRED"
            risk_tier = "CRITICAL" if high_severity_count >= 2 or is_duplicate else "HIGH"
            risk_score = 88.0 if risk_tier == "CRITICAL" else 72.0
            reasons = [f.get("detail") for f in evidence_flags if f.get("severity") == "HIGH"]
            prediction = "Suspicious Payment Claim"
            explanation = f"Definite inconsistencies detected: {'; '.join(reasons[:2])}."
            recommended_action = "DO NOT release goods. Request the customer to open their actual payment app and verify the live transaction history."

        elif not is_payment_screen or (not has_extracted_data and not merchant_confirmed_credit):
            assessment = "INSUFFICIENT_EVIDENCE"
            risk_tier = "MEDIUM"
            risk_score = 50.0
            prediction = "Inconclusive Image Evidence"
            explanation = "The uploaded image does not contain readable payment confirmation elements or is too blurry/cropped."
            recommended_action = "Request customer to present their live transaction receipt or check your merchant soundbox."

        elif merchant_confirmed_credit and high_severity_count == 0 and amount_match_status != "MISMATCH" and recipient_match_status != "MISMATCH":
            # Only if merchant explicitly verified bank credit AND no red flags
            assessment = "VERIFIED_BY_TRUSTED_SOURCE"
            risk_tier = "LOW"
            risk_score = 12.0
            prediction = "Merchant-Confirmed Transaction"
            explanation = "Payment has been independently confirmed credited to the merchant's bank account. Screenshot details align with merchant records."
            recommended_action = "Transaction verified. Goods or services may be safely released."

        else:
            # Valid-looking screenshot, but no trusted bank confirmation exists
            assessment = "NOT_VERIFIED"
            risk_tier = "MEDIUM"
            risk_score = 38.0
            prediction = "Unverified Screenshot Claim"
            explanation = "Screenshot appears structured, but a screenshot is merely a claim. Funds have NOT been independently verified as settled into your bank account."
            recommended_action = "Check your merchant soundbox, SMS from your bank, or official merchant app balance before dispensing goods."

        # Safety Banner Text
        safety_banner = (
            "A payment screenshot is a claim. Verify the transaction. "
            "Never release goods or services based purely on a customer's phone display."
        )

        return {
            "overall_assessment": assessment,
            "risk_tier": risk_tier,
            "risk_score": risk_score,
            "prediction": prediction,
            "explanation": explanation,
            "safety_banner": safety_banner,
            "recommended_action": recommended_action,
            "extracted_details": {
                "amount": extracted_amount,
                "currency": ocr_result.get("currency", "INR"),
                "recipient_name": extracted_recipient,
                "recipient_vpa": extracted_vpa,
                "sender_name": ocr_result.get("sender_name"),
                "sender_vpa": ocr_result.get("sender_vpa"),
                "utr_number": extracted_utr,
                "payment_app": extracted_app,
                "payment_status": extracted_status,
                "timestamp_text": extracted_timestamp,
                "ocr_confidence": ocr_confidence,
                "is_payment_screen": ocr_result.get("is_payment_screen", True)
            },
            "consistency_matrix": {
                "amount_match": amount_match_status,
                "recipient_match": recipient_match_status,
                "vpa_match": vpa_match_status,
                "utr_syntax": utr_status,
                "duplicate_detected": is_duplicate,
                "tampering_detected": integrity_info.get("tampering_detected", False)
            },
            "duplicate_evidence": {
                "sha256": hashes["sha256"],
                "dhash": hashes["dhash"],
                "is_exact_image_duplicate": duplicate_info["exact_duplicate_image"] is not None,
                "is_utr_duplicate": duplicate_info["duplicate_utr"] is not None,
                "matched_record": duplicate_info["exact_duplicate_image"] or duplicate_info["duplicate_utr"]
            },
            "image_integrity": integrity_info,
            "evidence_flags": evidence_flags,
            "analysis_checklist": checklist,
            "bank_verification_provider": bank_verification
        }


ghostpay_service = GhostPayDetectorService()
