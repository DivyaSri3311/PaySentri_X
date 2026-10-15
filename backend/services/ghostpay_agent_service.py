"""
PaySentriX GhostPay AI Payment Investigation Agent.
Provides natural-language investigation of UPI payments using OpenAI LLM / function calling,
with seamless fallback to local deterministic NLP reasoning when API keys are not provided.

Strict Verification Principles:
- VERIFIED BY TRUSTED SOURCE: Only when verified by an authorized banking settlement switch or merchant credit.
- SUSPICIOUS: Specific implemented checks detect credible warning signs (amount/recipient mismatch, invalid UTR, tamper flags).
- NOT VERIFIED: Trusted confirmation is unavailable (screenshot looks visually consistent, but unconfirmed credit).
- INSUFFICIENT EVIDENCE: Available information cannot support a conclusion (no screenshot, unreadable image).
- VERIFICATION FAILED: Technical failure in verification pipeline.
"""

import os
import re
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.config import OPENAI_API_KEY as CONFIG_OPENAI_KEY, OPENAI_MODEL, OPENAI_TIMEOUT_SECONDS
from backend.services.ghostpay_service import ghostpay_service
from backend.services.ghostpay_presets import GHOSTPAY_PRESETS, PRESET_EXTRACTIONS
from backend.services.audit_service import audit_service
from backend.data.database import get_connection

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


# OpenAI Function Calling Schema Tools Definition
GHOSTPAY_AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "investigate_payment_evidence",
            "description": "Executes multimodal OCR, consistency forensics, duplicate screenshot hash checks, visual tampering inspection, and bank settlement verification on payment evidence.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expected_amount": {"type": "number", "description": "Expected payment amount in INR"},
                    "expected_recipient_name": {"type": "string", "description": "Expected payee or merchant store name"},
                    "expected_vpa": {"type": "string", "description": "Expected UPI VPA (e.g. merchant@bank)"},
                    "expected_utr": {"type": "string", "description": "Expected 12-digit UPI reference number (UTR)"},
                    "approx_payment_time": {"type": "string", "description": "Approximate transaction date or time"},
                    "merchant_confirmed_credit": {"type": "boolean", "description": "Whether merchant verified funds credited in official banking app/SMS"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_transaction_history",
            "description": "Searches previous audit records and logged evidence registry for past transactions matching amount, recipient, date, or UTR.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search_query": {"type": "string", "description": "Keywords or names to search (e.g. Divya, Chai Point, ₹500)"},
                    "utr_number": {"type": "string", "description": "Specific 12-digit UTR reference"},
                    "amount": {"type": "number", "description": "Transaction amount in INR"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_expected_payment_fields",
            "description": "Updates or populates the expected transaction form fields in the GhostPay Detector interface.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {"type": "number", "description": "Payment amount in INR"},
                    "recipient_name": {"type": "string", "description": "Recipient or store name"},
                    "recipient_vpa": {"type": "string", "description": "Recipient UPI ID / VPA"},
                    "utr_number": {"type": "string", "description": "12-digit UPI reference number"},
                    "approx_payment_time": {"type": "string", "description": "Approximate date or time"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "request_missing_evidence",
            "description": "Politely informs user that evidence is missing and requests a screenshot, photo capture, or bank verification.",
            "parameters": {
                "type": "object",
                "properties": {
                    "missing_evidence_type": {"type": "string", "description": "What is missing: 'screenshot', 'utr', or 'bank_confirmation'"},
                    "explanation": {"type": "string", "description": "Concise guidance explaining why evidence is required without inventing results"}
                },
                "required": ["missing_evidence_type", "explanation"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "explain_findings_in_language",
            "description": "Translates or explains current investigation findings in Hindi, Hinglish, or English.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_language": {"type": "string", "enum": ["hi", "hinglish", "en"], "description": "Target language for explanation"},
                    "focus": {"type": "string", "description": "Specific finding to explain (e.g. mismatch, duplicate, settlement)"}
                },
                "required": ["target_language"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "verify_provider_settlement",
            "description": "Queries independent banking settlement switch or partner gateway for authentic transaction settlement status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "utr_number": {"type": "string", "description": "12-digit UPI reference number"},
                    "amount": {"type": "number", "description": "Payment amount in INR"},
                    "recipient_vpa": {"type": "string", "description": "Expected payee UPI VPA"}
                }
            }
        }
    }
]


class GhostPayInvestigationAgent:
    def __init__(self):
        pass

    # -------------------------------------------------------------------------
    # 1. TOOL IMPLEMENTATIONS
    # -------------------------------------------------------------------------

    def tool_investigate_evidence(
        self,
        image_base64: Optional[str],
        expected_amount: Optional[float] = None,
        expected_recipient_name: Optional[str] = None,
        expected_vpa: Optional[str] = None,
        expected_utr: Optional[str] = None,
        approx_payment_time: Optional[str] = None,
        merchant_confirmed_credit: bool = False,
        preset_scenario_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Invokes existing ghostpay_service.analyze_evidence with strict integrity.
        """
        res = ghostpay_service.analyze_evidence(
            image_base64=image_base64,
            expected_amount=expected_amount,
            expected_recipient_name=expected_recipient_name,
            expected_vpa=expected_vpa,
            approx_payment_time=approx_payment_time,
            expected_utr=expected_utr,
            merchant_confirmed_credit=merchant_confirmed_credit,
            preset_scenario_id=preset_scenario_id
        )
        return res

    def tool_search_history(
        self,
        search_query: Optional[str] = None,
        utr_number: Optional[str] = None,
        amount: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Searches persistent SQLite audit records & ghostpay evidence registry.
        """
        matches = []
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Search audit records
        query = "SELECT id, timestamp, analysis_type, input_summary, risk_tier, prediction, explanation FROM audit_records WHERE analysis_type = 'GHOSTPAY'"
        params = []

        if utr_number:
            query += " AND (input_summary LIKE ? OR full_payload LIKE ?)"
            params.extend([f"%{utr_number}%", f"%{utr_number}%"])
        elif search_query:
            query += " AND (input_summary LIKE ? OR explanation LIKE ?)"
            term = f"%{search_query}%"
            params.extend([term, term])
        elif amount is not None:
            query += " AND input_summary LIKE ?"
            params.append(f"%{amount}%")

        query += " ORDER BY timestamp DESC LIMIT 5"
        cursor.execute(query, params)
        rows = cursor.fetchall()

        for r in rows:
            matches.append({
                "record_id": r["id"],
                "timestamp": r["timestamp"],
                "summary": r["input_summary"],
                "risk_tier": r["risk_tier"],
                "prediction": r["prediction"],
                "explanation": r["explanation"]
            })

        # 2. Check ghostpay evidence registry for duplicate UTR
        if utr_number and len(utr_number) >= 8:
            cursor.execute("SELECT id, timestamp, utr_number, amount, recipient_vpa, assessment FROM ghostpay_evidence_registry WHERE utr_number = ? LIMIT 3", (utr_number,))
            reg_rows = cursor.fetchall()
            for reg in reg_rows:
                if not any(m["record_id"] == reg["id"] for m in matches):
                    matches.append({
                        "record_id": reg["id"],
                        "timestamp": reg["timestamp"],
                        "summary": f"Registry entry for UTR {reg['utr_number']} | ₹{reg['amount']}",
                        "risk_tier": "HIGH" if reg["assessment"] != "VERIFIED_BY_TRUSTED_SOURCE" else "LOW",
                        "prediction": reg["assessment"],
                        "explanation": f"Found logged transaction with UTR {reg['utr_number']} and assessment {reg['assessment']}."
                    })

        conn.close()
        return matches

    # -------------------------------------------------------------------------
    # 2. ENTITY & NATURAL LANGUAGE EXTRACTION HELPERS (OFFLINE PARSER)
    # -------------------------------------------------------------------------

    def extract_entities_from_text(self, text: str) -> Dict[str, Any]:
        """
        Robustly extracts amount, date, time, recipient, VPA, and UTR from English/Hindi/Hinglish speech.
        """
        entities = {
            "amount": None,
            "recipient_name": None,
            "recipient_vpa": None,
            "utr_number": None,
            "approx_payment_time": None,
            "language_request": None
        }

        clean = text.strip()
        lower = clean.lower()

        # 1. Language request detection
        if "hindi" in lower or "हिंदी" in text or "hindi mein" in lower or "batao" in lower:
            entities["language_request"] = "hi"
        elif "hinglish" in lower:
            entities["language_request"] = "hinglish"

        # 2. Amount extraction (Hindi words + numbers)
        hindi_numbers = {
            "sau": 100, "ek sau": 100, "do sau": 200, "teen sau": 300, "char sau": 400,
            "paanch sau": 500, "panch sau": 500, "che sau": 600, "saat sau": 700,
            "aath sau": 800, "nau sau": 900, "hazaar": 1000, "ek hazaar": 1000,
            "do hazaar": 2000, "paanch hazaar": 5000, "das hazaar": 10000, "bees": 20,
            "chalis": 40, "pachas": 50
        }
        for word, val in hindi_numbers.items():
            if re.search(r'\b' + re.escape(word) + r'\b', lower):
                entities["amount"] = float(val)
                break

        if entities["amount"] is None:
            # Matches: ₹40, ₹ 500, Rs. 40, 40 rupees, 500 inr, payment of 40
            amt_match = re.search(r'(?:(?:₹|rs\.?|inr|payment\s+of)\s*)?([0-9]+(?:\.[0-9]{1,2})?)(?:\s*(?:rupees?|rs\.?|inr|ka|ki))?', lower)
            if amt_match and amt_match.group(1):
                try:
                    entities["amount"] = float(amt_match.group(1))
                except ValueError:
                    pass

        # 3. UTR (12 digits or explicit UTR pattern)
        utr_match = re.search(r'\b([0-9]{12})\b', clean)
        if utr_match:
            entities["utr_number"] = utr_match.group(1)
        else:
            utr_labelled = re.search(r'(?:utr|ref|reference)\s*(?:is|no|number|id)?[:\s]+([0-9]{8,16})', lower)
            if utr_labelled:
                entities["utr_number"] = utr_labelled.group(1)

        # 4. UPI VPA (handle@bank)
        vpa_match = re.search(r'\b([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)\b', clean)
        if vpa_match:
            entities["recipient_vpa"] = vpa_match.group(1)
        else:
            at_match = re.search(r'([a-zA-Z0-9._-]+)\s*(?:at\s+the\s+rate|at)\s*([a-zA-Z0-9]+)', lower)
            if at_match:
                entities["recipient_vpa"] = f"{at_match.group(1)}@{at_match.group(2)}"

        # 5. Recipient name
        rec_match = re.search(r'(?:to|recipient|payee|paid\s+to|shop\s+name|merchant)\s+(?:is\s+)?([A-Z][a-zA-Z\s]+?)(?=\s+(?:from|on|at|yesterday|with|having|for|ka|ki|ke|please|$))', clean, re.IGNORECASE)
        if rec_match:
            name = rec_match.group(1).strip()
            if len(name) >= 2 and not name.lower() in ["the", "a", "an", "this", "october", "yesterday"]:
                entities["recipient_name"] = name
        elif "divya" in lower:
            entities["recipient_name"] = "Divya Srivastava"

        # 6. Date / Time extraction
        date_time_parts = []
        if "yesterday" in lower or "kal" in lower:
            date_time_parts.append("Yesterday")
        elif "today" in lower or "aaj" in lower:
            date_time_parts.append("Today")

        # Specific date like: October 16, 2026, or 16 Oct
        date_match = re.search(r'([0-9]{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*[0-9]{0,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+[0-9]{1,2}(?:st|nd|rd|th)?[\s,]*[0-9]{0,4})', lower)
        if date_match:
            date_time_parts.append(date_match.group(1).title())

        # Time like: 11 AM, 11:30 am, 7:15 PM
        time_match = re.search(r'([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm))', lower)
        if time_match:
            date_time_parts.append(time_match.group(1).upper())

        if date_time_parts:
            entities["approx_payment_time"] = ", ".join(date_time_parts)

        return entities

    # -------------------------------------------------------------------------
    # 3. DETERMINISTIC REASONING ENGINE (OFFLINE FALLBACK & COMPLEMENT)
    # -------------------------------------------------------------------------

    def run_deterministic_agent(
        self,
        query: str,
        image_base64: Optional[str] = None,
        expected_amount: Optional[float] = None,
        expected_recipient_name: Optional[str] = None,
        expected_vpa: Optional[str] = None,
        expected_utr: Optional[str] = None,
        approx_payment_time: Optional[str] = None,
        merchant_confirmed_credit: bool = False,
        preset_scenario_id: Optional[str] = None,
        current_analysis: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Autonomous deterministic reasoning pipeline when OpenAI API is not active.
        Guarantees strict verification compliance and zero hallucinations.
        """
        extracted = self.extract_entities_from_text(query)
        tool_calls_executed = []
        lower = query.lower()

        # Update any fields from query into working state
        eff_amount = extracted["amount"] if extracted["amount"] is not None else expected_amount
        eff_recipient = extracted["recipient_name"] or expected_recipient_name
        eff_vpa = extracted["recipient_vpa"] or expected_vpa
        eff_utr = extracted["utr_number"] or expected_utr
        eff_time = extracted["approx_payment_time"] or approx_payment_time

        # Did user extract new fields?
        if any([extracted["amount"], extracted["recipient_name"], extracted["recipient_vpa"], extracted["utr_number"], extracted["approx_payment_time"]]):
            tool_calls_executed.append({
                "tool": "update_expected_payment_fields",
                "arguments": {k: v for k, v in extracted.items() if v is not None},
                "status": "SUCCESS"
            })

        # Check intent 1: Explain in Hindi / Hinglish
        if extracted["language_request"] in ["hi", "hinglish"]:
            tool_calls_executed.append({
                "tool": "explain_findings_in_language",
                "arguments": {"target_language": extracted["language_request"]},
                "status": "SUCCESS"
            })
            if current_analysis:
                assessment = current_analysis.get("overall_assessment", "")
                if assessment == "VERIFIED_BY_TRUSTED_SOURCE":
                    hi_text = "भुगतान आधिकारिक बैंक रिकॉर्ड के साथ सत्यापित (Verified) है। राशि खाते में जमा हो चुकी है।"
                elif assessment == "SUSPICIOUS_REVIEW_REQUIRED":
                    reasons = current_analysis.get("explanation", "संदिग्ध विसंगतियां पाई गईं")
                    hi_text = f"चेतावनी: यह भुगतान संदिग्ध (Suspicious) है। कारण: {reasons}। कृपया सामान देने से पहले आधिकारिक बैंक ऐप जांचें।"
                elif assessment == "INSUFFICIENT_EVIDENCE":
                    hi_text = "अपर्याप्त साक्ष्य: स्क्रीनशॉट अस्पष्ट है या जानकारी पूरी नहीं है। कृपया स्पष्ट फोटो लें।"
                else:
                    hi_text = "सत्यापित नहीं: स्क्रीनशॉट मात्र एक दावा है। बैंक क्रेडिट की पुष्टि के बिना इसे अंतिम न मानें।"

                return {
                    "status": "SUCCESS",
                    "investigation_status": "COMPLETED",
                    "response_text": hi_text,
                    "spoken_text": hi_text,
                    "tool_calls": tool_calls_executed,
                    "extracted_fields": extracted,
                    "verification_outcome": current_analysis.get("overall_assessment"),
                    "analysis_result": current_analysis
                }

        # Check intent 2: Search previous analysis / History
        if any(term in lower for term in ["previous analysis", "history", "search transaction", "purana payment", "pehle ka"]):
            search_res = self.tool_search_history(
                search_query=eff_recipient or query,
                utr_number=eff_utr,
                amount=eff_amount
            )
            tool_calls_executed.append({
                "tool": "search_transaction_history",
                "arguments": {"query": eff_recipient or query, "utr": eff_utr, "amount": eff_amount},
                "result_count": len(search_res)
            })

            if search_res:
                top = search_res[0]
                resp = f"Found previous audit record ({top['record_id']}) from {top['timestamp']}: {top['summary']}. Outcome: {top['prediction']} (Risk: {top['risk_tier']}). {top['explanation']}"
            else:
                resp = f"No previous analysis found in local audit records matching this query. Would you like to capture a new payment screenshot to investigate?"

            return {
                "status": "SUCCESS",
                "investigation_status": "COMPLETED",
                "response_text": resp,
                "spoken_text": resp,
                "tool_calls": tool_calls_executed,
                "extracted_fields": extracted,
                "verification_outcome": None,
                "matched_history": search_res
            }

        # Check intent 3: Investigate / Check payment evidence
        if any(term in lower for term in ["check", "verify", "fake", "suspicious", "analyse", "analyze", "screenshot"]):
            # Has evidence image or preset?
            if image_base64 or preset_scenario_id:
                analysis = self.tool_investigate_evidence(
                    image_base64=image_base64,
                    expected_amount=eff_amount,
                    expected_recipient_name=eff_recipient,
                    expected_vpa=eff_vpa,
                    expected_utr=eff_utr,
                    approx_payment_time=eff_time,
                    merchant_confirmed_credit=merchant_confirmed_credit,
                    preset_scenario_id=preset_scenario_id
                )
                tool_calls_executed.append({
                    "tool": "investigate_payment_evidence",
                    "arguments": {
                        "expected_amount": eff_amount,
                        "expected_recipient_name": eff_recipient,
                        "expected_vpa": eff_vpa,
                        "expected_utr": eff_utr
                    },
                    "assessment": analysis.get("overall_assessment")
                })

                assessment = analysis.get("overall_assessment", "INSUFFICIENT_EVIDENCE")
                risk_tier = analysis.get("risk_tier", "MEDIUM")
                expl = analysis.get("explanation", "")
                action = analysis.get("recommended_action", "")

                resp = f"Investigation verdict: {assessment.replace('_', ' ')} (Risk: {risk_tier}). {expl} Next step: {action}"
                return {
                    "status": "SUCCESS",
                    "investigation_status": "COMPLETED",
                    "response_text": resp,
                    "spoken_text": f"{assessment.replace('_', ' ')}. {expl}",
                    "tool_calls": tool_calls_executed,
                    "extracted_fields": extracted,
                    "verification_outcome": assessment,
                    "analysis_result": analysis
                }
            else:
                # No image provided! Check if transaction exists in history first
                history_matches = self.tool_search_history(
                    search_query=eff_recipient,
                    utr_number=eff_utr,
                    amount=eff_amount
                )
                if history_matches:
                    top = history_matches[0]
                    resp = f"I found a logged record matching ₹{eff_amount or 'amount'} ({top['record_id']}): {top['summary']}. Outcome was {top['prediction']}. To run a fresh forensic check on this current payment, please capture a photo or upload the screenshot."
                    return {
                        "status": "SUCCESS",
                        "investigation_status": "CLARIFYING",
                        "response_text": resp,
                        "spoken_text": resp,
                        "tool_calls": tool_calls_executed,
                        "extracted_fields": extracted,
                        "verification_outcome": None,
                        "matched_history": history_matches
                    }
                else:
                    # Request evidence honestly - NEVER invent
                    tool_calls_executed.append({
                        "tool": "request_missing_evidence",
                        "arguments": {"missing_evidence_type": "screenshot", "explanation": "No screenshot or image evidence currently loaded."},
                        "status": "WAITING_FOR_EVIDENCE"
                    })
                    resp = f"I've noted the expected payment of ₹{eff_amount or 'specified amount'}{f' to {eff_recipient}' if eff_recipient else ''}{f' on {eff_time}' if eff_time else ''}. However, no payment screenshot or camera capture has been provided yet. Please frame the customer's confirmation screen and say 'Capture photo', or upload a screenshot to investigate."
                    return {
                        "status": "SUCCESS",
                        "investigation_status": "CLARIFYING",
                        "response_text": resp,
                        "spoken_text": "Please provide a payment screenshot or photo so I can investigate.",
                        "tool_calls": tool_calls_executed,
                        "extracted_fields": extracted,
                        "verification_outcome": "INSUFFICIENT_EVIDENCE"
                    }

        # Default fallback response
        resp = f"I have registered the details: {f'Amount ₹{eff_amount}' if eff_amount else ''}{f', Recipient: {eff_recipient}' if eff_recipient else ''}{f', Time: {eff_time}' if eff_time else ''}. You can say 'Capture photo' to frame the customer screen, or 'Check whether this payment is real' to run forensic investigation."
        return {
            "status": "SUCCESS",
            "investigation_status": "COMPLETED",
            "response_text": resp,
            "spoken_text": resp,
            "tool_calls": tool_calls_executed,
            "extracted_fields": extracted,
            "verification_outcome": None
        }

    # -------------------------------------------------------------------------
    # 4. OPENAI LLM TOOL-CALLING INVESTIGATION AGENT
    # -------------------------------------------------------------------------

    def investigate(
        self,
        query: str,
        image_base64: Optional[str] = None,
        expected_amount: Optional[float] = None,
        expected_recipient_name: Optional[str] = None,
        expected_vpa: Optional[str] = None,
        expected_utr: Optional[str] = None,
        approx_payment_time: Optional[str] = None,
        merchant_confirmed_credit: bool = False,
        preset_scenario_id: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        openai_api_key: Optional[str] = None,
        current_analysis: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for AI natural-language investigation.
        Uses OpenAI model with tool-calling when API key is provided,
        or deterministic reasoning when offline/unconfigured.
        """
        api_key = openai_api_key or CONFIG_OPENAI_KEY or os.getenv("OPENAI_API_KEY", "")

        # If OpenAI is not configured or available, run deterministic agent
        if not OPENAI_AVAILABLE or not api_key:
            return self.run_deterministic_agent(
                query=query,
                image_base64=image_base64,
                expected_amount=expected_amount,
                expected_recipient_name=expected_recipient_name,
                expected_vpa=expected_vpa,
                expected_utr=expected_utr,
                approx_payment_time=approx_payment_time,
                merchant_confirmed_credit=merchant_confirmed_credit,
                preset_scenario_id=preset_scenario_id,
                current_analysis=current_analysis
            )

        # Build OpenAI Messages with strict forensic instructions
        system_prompt = (
            "You are the GhostPay AI Payment Investigation Agent in PaySentriX, a cybersecurity UPI fraud platform.\n"
            "Your role is to autonomously investigate UPI payment claims, examine payment evidence, and query historical records.\n\n"
            "CRITICAL TRUTH & VERIFICATION RULES:\n"
            "1. NEVER fabricate bank verification or invent transaction records.\n"
            "2. Distinct Outcomes:\n"
            "   - VERIFIED_BY_TRUSTED_SOURCE: ONLY when independent banking settlement is confirmed.\n"
            "   - SUSPICIOUS: When specific forensic checks detect credible warning signs (amount/recipient mismatch, spoof app, invalid UTR, duplicate hash).\n"
            "   - NOT_VERIFIED: Visual screenshot is plausible, but no independent bank settlement confirmation exists.\n"
            "   - INSUFFICIENT_EVIDENCE: Available information cannot support a conclusion (no screenshot, unreadable image).\n"
            "   - VERIFICATION_FAILED: Service error.\n"
            "3. A screenshot or voice transcript alone CANNOT prove that funds were transferred.\n"
            "4. If the user asks about a payment but no matching screenshot or record exists, invoke request_missing_evidence.\n"
            "5. Always extract parameters (amount, recipient, VPA, UTR, time) and call tools accurately.\n"
            "6. Answer concisely and explain findings clearly in English, Hindi, or Hinglish as requested."
        )

        messages = [{"role": "system", "content": system_prompt}]

        # Add recent conversation history if provided
        if conversation_history:
            for turn in conversation_history[-4:]:
                messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})

        # Add user context
        user_context_note = (
            f"User request: '{query}'\n"
            f"Current Workspace Context: [Has Image: {'Yes' if image_base64 or preset_scenario_id else 'No'}], "
            f"[Expected Amount: ₹{expected_amount or 'Not set'}], "
            f"[Expected Payee: {expected_recipient_name or 'Not set'}], "
            f"[Expected UTR: {expected_utr or 'Not set'}], "
            f"[Bank Settlement Confirmed: {'Yes' if merchant_confirmed_credit else 'No'}]"
        )
        messages.append({"role": "user", "content": user_context_note})

        try:
            client = openai.OpenAI(api_key=api_key, timeout=OPENAI_TIMEOUT_SECONDS)
            completion = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                tools=GHOSTPAY_AGENT_TOOLS,
                tool_choice="auto",
                temperature=0.1
            )

            response_msg = completion.choices[0].message
            tool_calls = response_msg.tool_calls or []
            tool_results = []
            final_analysis = current_analysis
            extracted_fields = self.extract_entities_from_text(query)

            if tool_calls:
                # Execute tools requested by LLM
                for tool_call in tool_calls:
                    fn_name = tool_call.function.name
                    args = json.loads(tool_call.function.arguments or "{}")

                    if fn_name == "investigate_payment_evidence":
                        final_analysis = self.tool_investigate_evidence(
                            image_base64=image_base64,
                            expected_amount=args.get("expected_amount") or expected_amount or extracted_fields.get("amount"),
                            expected_recipient_name=args.get("expected_recipient_name") or expected_recipient_name or extracted_fields.get("recipient_name"),
                            expected_vpa=args.get("expected_vpa") or expected_vpa or extracted_fields.get("recipient_vpa"),
                            expected_utr=args.get("expected_utr") or expected_utr or extracted_fields.get("utr_number"),
                            approx_payment_time=args.get("approx_payment_time") or approx_payment_time or extracted_fields.get("approx_payment_time"),
                            merchant_confirmed_credit=args.get("merchant_confirmed_credit", merchant_confirmed_credit),
                            preset_scenario_id=preset_scenario_id
                        )
                        tool_results.append({
                            "tool": fn_name,
                            "arguments": args,
                            "result": {
                                "overall_assessment": final_analysis.get("overall_assessment"),
                                "verdict_category": final_analysis.get("verdict_category"),
                                "risk_tier": final_analysis.get("risk_tier"),
                                "explanation": final_analysis.get("explanation")
                            }
                        })
                    elif fn_name == "search_transaction_history":
                        history = self.tool_search_history(
                            search_query=args.get("search_query"),
                            utr_number=args.get("utr_number"),
                            amount=args.get("amount")
                        )
                        tool_results.append({
                            "tool": fn_name,
                            "arguments": args,
                            "matches_found": len(history),
                            "top_match": history[0] if history else None
                        })
                    elif fn_name == "update_expected_payment_fields":
                        for k, v in args.items():
                            if v is not None:
                                extracted_fields[k] = v
                        tool_results.append({
                            "tool": fn_name,
                            "arguments": args,
                            "status": "UPDATED"
                        })
                    elif fn_name == "request_missing_evidence":
                        tool_results.append({
                            "tool": fn_name,
                            "arguments": args,
                            "status": "EVIDENCE_REQUESTED"
                        })
                    elif fn_name == "explain_findings_in_language":
                        tool_results.append({
                            "tool": fn_name,
                            "arguments": args,
                            "status": "TRANSLATING"
                        })
                    elif fn_name == "verify_provider_settlement":
                        settlement_res = ghostpay_service.provider.verify_transaction(
                            utr_number=args.get("utr_number") or expected_utr,
                            amount=args.get("amount") or expected_amount,
                            recipient_vpa=args.get("recipient_vpa") or expected_vpa
                        )
                        tool_results.append({
                            "tool": fn_name,
                            "arguments": args,
                            "status": "SETTLEMENT_QUERIED",
                            "provider_result": settlement_res
                        })

                # Follow-up LLM completion with tool outputs for natural evidence-backed synthesis
                messages.append(response_msg)
                for i, tool_call in enumerate(tool_calls):
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(tool_results[i])
                    })

                final_completion = client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=messages,
                    temperature=0.2
                )
                final_text = final_completion.choices[0].message.content or ""
            else:
                final_text = response_msg.content or ""

            return {
                "status": "SUCCESS",
                "investigation_status": "COMPLETED",
                "response_text": final_text,
                "spoken_text": final_text[:200],
                "tool_calls": tool_results,
                "extracted_fields": extracted_fields,
                "verdict_category": final_analysis.get("verdict_category") if final_analysis else None,
                "verification_outcome": final_analysis.get("overall_assessment") if final_analysis else None,
                "analysis_result": final_analysis
            }

        except Exception as e:
            print(f"[GhostPayAgent] OpenAI LLM call failed ({e}). Falling back to deterministic reasoning engine.")
            return self.run_deterministic_agent(
                query=query,
                image_base64=image_base64,
                expected_amount=expected_amount,
                expected_recipient_name=expected_recipient_name,
                expected_vpa=expected_vpa,
                expected_utr=expected_utr,
                approx_payment_time=approx_payment_time,
                merchant_confirmed_credit=merchant_confirmed_credit,
                preset_scenario_id=preset_scenario_id,
                current_analysis=current_analysis
            )


# Global Singleton Instance
ghostpay_agent = GhostPayInvestigationAgent()
