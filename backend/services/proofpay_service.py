"""
ProofPay Multi-Engine Decision Orchestrator.
Combines Gemini multimodal extraction, image forensics, ReplayGuard proof replay detection,
and authoritative merchant ledger matching to produce a defensible dual-verdict assessment.
"""

import os
import json
import uuid
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.data.database import get_connection
from backend.services.proofpay_forensics import forensics_engine
from backend.services.proofpay_gemini import proofpay_gemini_extractor
from backend.services.proofpay_replay import replay_guard
from backend.services.proofpay_ledger import challengepay_service

class ProofPayOrchestrator:
    def __init__(self):
        pass

    def full_analyze_and_verify(
        self,
        image_bytes: bytes,
        filename: str = "screenshot.jpg",
        order_id: Optional[str] = None,
        expected_amount: Optional[float] = None,
        recipient_vpa: Optional[str] = None,
        merchant_id: Optional[str] = None,
        custom_gemini_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end analysis across all 4 sub-engines:
        1. Forensics Engine (ELA, noise, EXIF, hashes)
        2. Gemini 2.5 Flash Multimodal Extractor (or fallback)
        3. ReplayGuard (duplicate hash & UTR vault check)
        4. ChallengePay Ledger Verifier (authoritative settlement match)
        """
        # Step 1: Image Forensics
        forensics_res = forensics_engine.analyze_image_bytes(image_bytes)
        sha256 = forensics_res["sha256_hash"]
        phash = forensics_res["phash"]
        visual_integrity = forensics_res["visual_integrity"]

        # Step 2: Gemini Multimodal Extraction
        extracted_data = proofpay_gemini_extractor.extract_with_gemini(
            image_bytes=image_bytes,
            custom_api_key=custom_gemini_key
        )
        if not extracted_data:
            extracted_data = proofpay_gemini_extractor.fallback_extract(image_bytes, filename)

        claimed_amount = extracted_data.amount
        claimed_ref = extracted_data.reference_number
        claimed_status = extracted_data.claimed_status

        # If order_id was provided, resolve order details from database
        bound_order = None
        if order_id:
            bound_order = challengepay_service.get_order(order_id)
            if bound_order:
                if expected_amount is None:
                    expected_amount = float(bound_order["expected_amount"])
                if recipient_vpa is None:
                    recipient_vpa = bound_order["recipient_vpa"]
                if merchant_id is None:
                    merchant_id = bound_order["merchant_id"]

        merchant_id = merchant_id or "MERCH-SBUX-01"

        # Step 3: ReplayGuard Check
        replay_res = replay_guard.check_replay(
            sha256_hash=sha256,
            phash=phash,
            claimed_reference=claimed_ref,
            current_order_id=order_id,
            current_merchant_id=merchant_id
        )

        # Step 4: ChallengePay Authoritative Ledger Verification
        ledger_res = challengepay_service.verify_against_ledger(
            transaction_reference=claimed_ref,
            expected_amount=expected_amount or claimed_amount,
            recipient_vpa=recipient_vpa or extracted_data.receiver_vpa,
            order_id=order_id
        )

        payment_verification = ledger_res["status"]
        verified_amount = ledger_res["verified_record"]["settled_amount"] if ledger_res["verified_record"] else None

        # Step 5: Multi-Engine Findings Aggregation
        findings = []

        # Add Forensics findings
        for f in forensics_res["findings"]:
            findings.append(f)

        # Add Gemini visual observations
        for obs in extracted_data.visual_observations:
            findings.append({
                "engine": "gemini_multimodal_vision",
                "severity": "medium" if any(w in obs.lower() for w in ["mismatch", "artifact", "paste", "edit"]) else "info",
                "message": obs
            })

        # Add ReplayGuard findings
        if replay_res["is_replayed"]:
            findings.append({
                "engine": "replay_guard",
                "severity": "high",
                "message": replay_res["message"]
            })

        # Add Ledger findings
        if payment_verification == "CONFIRMED":
            findings.append({
                "engine": "merchant_ledger",
                "severity": "info",
                "message": f"Payment of ₹{verified_amount:,.2f} confirmed settled in merchant ledger via {ledger_res['verified_record']['payment_provider']}."
            })
        elif payment_verification == "PENDING":
            findings.append({
                "engine": "merchant_ledger",
                "severity": "medium",
                "message": "Payment record found in merchant ledger, but settlement status is currently PENDING. Bank processing incomplete."
            })
        elif payment_verification == "MISMATCHED":
            for disc in ledger_res["discrepancies"]:
                findings.append({
                    "engine": "merchant_ledger",
                    "severity": "high",
                    "message": disc
                })
        else:
            findings.append({
                "engine": "merchant_ledger",
                "severity": "high",
                "message": "No matching payment record found in the connected merchant transaction ledger."
            })

        # Determine Recommended Action
        if payment_verification == "CONFIRMED" and not replay_res["is_replayed"]:
            recommended_action = "FULFILL_ORDER"
            action_guidance = "Authoritative payment verification passed. Safe to dispatch merchandise or complete service."
        elif replay_res["is_replayed"]:
            recommended_action = "HOLD_SHIPMENT"
            action_guidance = "Do NOT fulfill. This payment proof or transaction reference was already redeemed for a previous order."
        elif payment_verification == "PENDING":
            recommended_action = "WAIT_FOR_SETTLEMENT"
            action_guidance = "Funds have not cleared merchant bank rail. Wait for payment gateway status webhook before releasing goods."
        elif payment_verification == "MISMATCHED":
            recommended_action = "REJECT_CLAIMED_PROOF"
            action_guidance = "Payment amount or beneficiary VPA does not match order contract. Ask customer to verify destination UPI ID."
        else:
            recommended_action = "VERIFY_BEFORE_FULFILLMENT"
            action_guidance = "Payment proof is not verified against merchant records. Verify citizen's actual bank account credit before fulfilling."

        # Generate Human-Readable Forensic Explanation
        explanation_lines = [
            f"ProofPay Forensic Audit: Claimed ₹{claimed_amount or 0:,.2f} via {extracted_data.payment_app} with status '{claimed_status}'.",
            f"1. Visual Integrity: {visual_integrity} (ELA Delta: {forensics_res['ela_metrics']['mean_delta']}, Editor signature: {forensics_res['exif_metadata']['editor_detected']}).",
            f"2. ReplayGuard: {'REPLAY DETECTED' if replay_res['is_replayed'] else 'No prior submission detected'}.",
            f"3. Merchant Ledger: {payment_verification} against demo rail ({ledger_res['provider_mode']}).",
            f"Recommended Protocol: {recommended_action} — {action_guidance}"
        ]
        full_explanation = " ".join(explanation_lines)

        # Generate Tamper-Evident Audit Token
        verification_id = f"VRF-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        audit_payload = f"{verification_id}|{sha256}|{claimed_ref}|{payment_verification}|{datetime.utcnow().isoformat()}"
        tamper_token = f"SHA256:{hashlib.sha256(audit_payload.encode()).hexdigest()[:32].upper()}"

        # Combine Anomaly Regions (Forensics ELA patches + Gemini text bounding boxes)
        all_regions = []
        for reg in forensics_res.get("anomaly_regions", []):
            all_regions.append(reg)
        for box in getattr(extracted_data, "suspicious_text_regions", []):
            all_regions.append({
                "box": box,
                "label": "Suspicious Text Box",
                "confidence": 0.85
            })

        # Save to persistent database
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO proofpay_verifications 
        (verification_id, order_id, merchant_id, sha256_hash, phash, claimed_amount, claimed_status, claimed_reference, claimed_sender, claimed_receiver, payment_app, visual_integrity, payment_verification, recommended_action, findings_json, anomaly_regions_json, forensic_metrics_json, explanation, tamper_audit_token, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            verification_id,
            order_id,
            merchant_id,
            sha256,
            phash,
            claimed_amount,
            claimed_status,
            claimed_ref,
            extracted_data.sender_name,
            extracted_data.receiver_name or extracted_data.receiver_vpa,
            extracted_data.payment_app,
            visual_integrity,
            payment_verification,
            recommended_action,
            json.dumps(findings),
            json.dumps(all_regions),
            json.dumps({
                "ela": forensics_res["ela_metrics"],
                "noise": forensics_res["noise_metrics"],
                "exif": forensics_res["exif_metadata"],
                "dimensions": forensics_res["dimensions"]
            }),
            full_explanation,
            tamper_token,
            datetime.utcnow().isoformat() + "Z"
        ))

        # If confirmed, update order status
        if payment_verification == "CONFIRMED" and order_id and bound_order:
            cursor.execute("""
            UPDATE proofpay_orders
            SET status = 'CONFIRMED', confirmed_reference = ?
            WHERE order_id = ?
            """, (claimed_ref, order_id))

        conn.commit()
        conn.close()

        return {
            "verification_id": verification_id,
            "order_id": order_id,
            "merchant_id": merchant_id,
            "visual_integrity": visual_integrity,
            "payment_verification": payment_verification,
            "claimed_amount": claimed_amount,
            "verified_amount": verified_amount,
            "reference_reused": replay_res["is_replayed"],
            "replay_details": replay_res,
            "extracted_fields": extracted_data.model_dump(),
            "findings": findings,
            "anomaly_regions": all_regions,
            "forensics_metrics": {
                "file_size_kb": forensics_res["file_size_kb"],
                "format": forensics_res["format"],
                "dimensions": forensics_res["dimensions"],
                "sha256": sha256,
                "phash": phash,
                "ela": forensics_res["ela_metrics"],
                "noise": forensics_res["noise_metrics"],
                "exif": forensics_res["exif_metadata"]
            },
            "ledger_result": ledger_res,
            "recommended_action": recommended_action,
            "action_guidance": action_guidance,
            "explanation": full_explanation,
            "tamper_audit_token": tamper_token,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

    def get_history(self, limit: int = 30) -> List[Dict[str, Any]]:
        """Retrieves paginated verification history."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM proofpay_verifications
        ORDER BY created_at DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()

        records = []
        for r in rows:
            d = dict(r)
            try: d["findings"] = json.loads(d["findings_json"])
            except: d["findings"] = []
            try: d["anomaly_regions"] = json.loads(d["anomaly_regions_json"])
            except: d["anomaly_regions"] = []
            try: d["forensics_metrics"] = json.loads(d["forensic_metrics_json"])
            except: d["forensics_metrics"] = {}
            records.append(d)

        return records

    def get_report(self, verification_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single verification audit record."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM proofpay_verifications WHERE verification_id = ?", (verification_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        d = dict(row)
        try: d["findings"] = json.loads(d["findings_json"])
        except: d["findings"] = []
        try: d["anomaly_regions"] = json.loads(d["anomaly_regions_json"])
        except: d["anomaly_regions"] = []
        try: d["forensics_metrics"] = json.loads(d["forensic_metrics_json"])
        except: d["forensics_metrics"] = {}
        return d

proofpay_orchestrator = ProofPayOrchestrator()
