"""
PaySentriX Multilingual Message Intelligence Service.
Analyzes SMS, WhatsApp, and Telegram payment messages across English, Hindi, and Hinglish.
Combines Calibrated NLP ML Pipeline with psychological manipulation heuristics.
"""

import os
import re
import joblib
from typing import Dict, Any, List

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "models")
NLP_PATH = os.path.join(MODELS_DIR, "nlp_pipeline.joblib")

class MultilingualNLPService:
    def __init__(self):
        self.pipeline = None
        self._load_pipeline()
        
    def _load_pipeline(self):
        if os.path.exists(NLP_PATH):
            try:
                self.pipeline = joblib.load(NLP_PATH)
                print("NLP pipeline loaded successfully.")
            except Exception as e:
                print(f"Error loading NLP pipeline: {e}")
                self.pipeline = None

    def analyze_message(self, text: str) -> Dict[str, Any]:
        text_clean = text.strip()
        lower = text_clean.lower()
        
        # 1. ML Classifier Prediction
        ml_prob = 0.5
        if self.pipeline is not None:
            try:
                ml_prob = float(self.pipeline.predict_proba([text_clean])[0][1])
            except Exception as e:
                print(f"NLP prediction error: {e}")
                ml_prob = 0.5
        else:
            # Fallback keyword scoring
            suspicious_kw = ["block", "kyc", "pan", "disconnect", "bijli", "arrest", "lottery", "cashback", "urgent", "turant"]
            matches = sum(1 for kw in suspicious_kw if kw in lower)
            ml_prob = min(0.95, matches * 0.25)

        # 2. Heuristic Social Engineering Extraction
        tactics = []
        indicators = []
        highlighted_words = []
        
        # Fear & Intimidation
        fear_terms = ["arrest", "police", "cbi", "crime", "court", "warrant", "block", "deactivated", "band", "seize", "custody", "illegal"]
        matched_fear = [w for w in fear_terms if w in lower]
        if matched_fear:
            tactics.append("Authority Impersonation & Legal Intimidation (Fear Vector)")
            indicators.append({
                "type": "Fear / Coercion",
                "detail": f"Threatens victim with severe legal or banking repercussions ({', '.join(matched_fear[:3])}).",
                "severity": "CRITICAL"
            })
            highlighted_words.extend(matched_fear)

        # Artificial Urgency
        urgency_terms = ["immediately", "turant", "jaldi", "tonight", "24 hours", "aaj raat", "9:30 pm", "15 mins", "urgent", "hurry", "expire"]
        matched_urgency = [w for w in urgency_terms if w in lower]
        if matched_urgency:
            tactics.append("Artificial Urgency & Time Pressure")
            indicators.append({
                "type": "Time Pressure",
                "detail": f"Manufactures false deadline to bypass critical rational thinking ({', '.join(matched_urgency[:2])}).",
                "severity": "HIGH"
            })
            highlighted_words.extend(matched_urgency)

        # Financial Lure / Greed
        greed_terms = ["won", "prize", "cashback", "lottery", "earn", "daily payout", "work from home", "scratch card", "redeem", "free"]
        matched_greed = [w for w in greed_terms if w in lower]
        if matched_greed:
            tactics.append("Unrealistic Financial Rewards (Greed Vector)")
            indicators.append({
                "type": "Reward Bait",
                "detail": f"Promises unearned cashback or high income ({', '.join(matched_greed[:2])}).",
                "severity": "HIGH"
            })
            highlighted_words.extend(matched_greed)

        # Payment Manipulation / Reverse Debit
        payment_terms = ["pin", "qr", "refund", "wapas", "collect request", "approve request", "quicksupport", "anydesk", "teamviewer"]
        matched_pay = [w for w in payment_terms if w in lower]
        if matched_pay:
            tactics.append("Payment Instrument Manipulation")
            indicators.append({
                "type": "Reverse Debit / Credential Harvest",
                "detail": f"Solicits UPI PIN or remote screen sharing software ({', '.join(matched_pay[:2])}).",
                "severity": "CRITICAL"
            })
            highlighted_words.extend(matched_pay)

        # URL or Phone number presence
        urls = re.findall(r'https?://[^\s]+|upi://[^\s]+', text_clean)
        phones = re.findall(r'\b(?:\+91|91)?[6-9]\d{9}\b', text_clean)
        if urls:
            indicators.append({
                "type": "Embedded Link",
                "detail": f"Contains unverified external link ({urls[0][:35]}...).",
                "severity": "HIGH"
            })
        if phones:
            indicators.append({
                "type": "Direct Contact Trap",
                "detail": f"Directs victim to call personal mobile {phones[0]} instead of verified toll-free helpline.",
                "severity": "MEDIUM"
            })

        # Language Detection
        is_hindi = any(w in lower for w in ["aapka", "karein", "kare", "hai", "raat", "bijli", "khata", "turant", "pichhla", "paisa", "rupaye", "wapas"])
        language = "Hinglish / Hindi" if is_hindi else "English"

        # Determine Primary Category
        if any(w in lower for w in ["bijli", "electricity", "power cut", "power will be disconnected"]):
            category = "Electricity Disconnection Phishing"
        elif any(w in lower for w in ["kyc", "pan", "aadhar", "sbi yono", "netbanking", "account block"]):
            category = "Fake KYC / Account Suspension Scam"
        elif any(w in lower for w in ["arrest", "cbi", "police", "trai", "money laundering", "customs"]):
            category = "Digital Arrest / Authority Impersonation"
        elif any(w in lower for w in ["refund", "meesho", "amazon refund", "flipkart return", "wapas"]):
            category = "Reverse-Debit Refund Scam"
        elif any(w in lower for w in ["earn", "work from home", "part time", "telegram", "rating"]):
            category = "Job / Task Recruitment Fraud"
        elif any(w in lower for w in ["lottery", "cashback", "reward", "scratch card", "won"]):
            category = "Cashback & Lottery Bait"
        elif any(w in lower for w in ["otp", "swiggy", "salary", "credited with inr", "uber", "doctor"]):
            category = "Legitimate Notification"
        else:
            category = "General Communication"

        # Fused Risk Score (ML + Heuristics)
        heuristic_score = len(tactics) * 22.0 + len(indicators) * 12.0
        final_risk = min(99.0, max(2.0, (ml_prob * 65.0) + (heuristic_score * 0.35)))
        
        # If genuine indicators found (e.g. Swiggy delivery, salary credit, bank statement narration)
        if category == "Legitimate Notification" or (len(tactics) == 0 and not urls and not matched_urgency):
            final_risk = min(final_risk, 12.0)
            
        risk_score = round(final_risk, 1)
        
        if risk_score >= 80:
            risk_tier = "CRITICAL"
            verdict = "Fraudulent Scam"
            advice = "DO NOT CLICK ANY LINKS OR CALL ANY NUMBERS. Block sender immediately."
        elif risk_score >= 50:
            risk_tier = "HIGH"
            verdict = "Suspicious Threat"
            advice = "Verify through official bank or service website directly. Do not follow instructions."
        elif risk_score >= 25:
            risk_tier = "MEDIUM"
            verdict = "Potential Risk"
            advice = "Exercise caution. Check sender identity before taking any financial action."
        else:
            risk_tier = "SAFE"
            verdict = "Legitimate"
            advice = "No common cyber threat or deception patterns identified."

        return {
            "risk_score": risk_score,
            "risk_tier": risk_tier,
            "prediction": verdict,
            "category": category,
            "detected_language": language,
            "ml_confidence": round(ml_prob * 100, 1),
            "tactics": tactics,
            "indicators": indicators,
            "highlighted_tokens": list(set(highlighted_words)),
            "safety_guidance": advice,
            "summary": (
                f"PaySentriX NLP Engine classified this {language} message as '{category}'. "
                f"Identified {len(tactics)} psychological deception vectors: {', '.join(tactics) if tactics else 'None'}. "
                f"Risk assessment: {risk_score}/100 ({risk_tier})."
            )
        }

nlp_service = MultilingualNLPService()
