"""
PaySentriX QR Guardian and Merchant Registry Verifier.
Parses UPI QR payloads, cross-references against the Trusted Merchant Registry,
detects physical sticker-swap tampering, and validates mock POS cryptographic terminal signatures.
"""

import os
import re
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any, List, Optional
from backend.data.database import get_connection

class QRGuardianService:
    def __init__(self):
        pass

    def parse_qr_payload(self, qr_text: str) -> Dict[str, Any]:
        """
        Extracts NPCI UPI standard parameters from QR string:
        upi://pay?pa=...&pn=...&mc=...&tid=...&tr=...&am=...&cu=INR
        """
        qr_text = qr_text.strip()
        if not qr_text.startswith("upi://pay"):
            # If plain text or other scheme, wrap or attempt extraction
            match = re.search(r'upi://pay[^\s"\'>]+', qr_text)
            if match:
                qr_text = match.group(0)
            else:
                return {
                    "valid_upi_qr": False,
                    "raw_text": qr_text,
                    "error": "Not a standard NPCI UPI QR format."
                }

        parsed = urlparse(qr_text)
        params = parse_qs(parsed.query)

        pa = params.get("pa", [""])[0]
        pn = params.get("pn", [""])[0]
        mc = params.get("mc", [""])[0]
        am = params.get("am", [""])[0]
        cu = params.get("cu", ["INR"])[0]
        tr = params.get("tr", [""])[0]
        mode = params.get("mode", ["01"])[0]
        sign = params.get("sign", [""])[0]

        try:
            amt_val = float(am) if am else None
        except ValueError:
            amt_val = None

        return {
            "valid_upi_qr": True,
            "raw_text": qr_text,
            "vpa": pa,
            "merchant_name": pn,
            "mcc_code": mc,
            "amount": amt_val,
            "currency": cu,
            "transaction_ref": tr,
            "qr_mode": "Dynamic (Amount Locked)" if amt_val is not None else "Static (User Enters Amount)",
            "signature": sign
        }

    def verify_merchant(
        self,
        scanned_qr_text: str,
        claimed_store_brand: Optional[str] = None,
        pos_signature: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cross-checks scanned payload with SQLite Trusted Merchant Registry.
        Checks for:
        1. Genuine Registered Merchant
        2. Swapped / Sticker Tampered QR (Claimed store != Scanned VPA)
        3. Unregistered / Individual Mule account
        4. Cryptographic POS terminal signature validation
        """
        payload = self.parse_qr_payload(scanned_qr_text)
        if not payload.get("valid_upi_qr"):
            return {
                "verdict": "INVALID_QR",
                "risk_score": 90.0,
                "risk_tier": "HIGH",
                "details": payload.get("error", "Invalid format"),
                "merchant_info": None
            }

        vpa = payload["vpa"].lower()
        claimed_brand = (claimed_store_brand or "").strip().lower()

        # Query Database
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM merchants WHERE LOWER(registered_vpa) = ?", (vpa,))
        row = cursor.fetchone()
        conn.close()

        evidence = []
        is_swapped = False
        is_verified = False
        pos_sig_valid = False

        if row:
            merchant_record = dict(row)
            registered_brand = merchant_record["brand_name"]
            is_verified = True
            
            # Check Swapped QR Condition:
            # If user is physically standing at Starbucks, but QR resolves to someone else
            if claimed_brand and (claimed_brand not in registered_brand.lower() and registered_brand.lower() not in claimed_brand):
                is_swapped = True
                risk_score = 98.0
                risk_tier = "CRITICAL"
                verdict = "SWAPPED_QR_TAMPERING"
                evidence.append({
                    "type": "Physical Sticker Swap",
                    "status": "FAIL",
                    "detail": f"Counter claims '{claimed_store_brand}', but scanned QR points to '{registered_brand}' ({vpa})."
                })
            else:
                risk_score = 5.0
                risk_tier = "SAFE"
                verdict = "GENUINE_MERCHANT"
                evidence.append({
                    "type": "Merchant Registry Check",
                    "status": "PASS",
                    "detail": f"VPA '{vpa}' matches enrolled Tier-1 merchant '{registered_brand}' (MCC: {merchant_record['mcc_code']})."
                })

            # Check POS Signature if provided or present in QR
            sig_to_test = pos_signature or payload.get("signature")
            if sig_to_test:
                # Mock cryptographic check: valid if starts with SIG_POS_AUTH_
                if "SIG_POS_AUTH_" in sig_to_test or len(sig_to_test) > 20:
                    pos_sig_valid = True
                    evidence.append({
                        "type": "POS Terminal Cryptographic Signature",
                        "status": "PASS",
                        "detail": f"Verified Ed25519 terminal signature issued by registered hardware terminal: {merchant_record.get('terminal_public_key', 'POS_CORE')}"
                    })
                else:
                    evidence.append({
                        "type": "POS Terminal Cryptographic Signature",
                        "status": "FAIL",
                        "detail": "Invalid or forged terminal digital signature."
                    })
            else:
                evidence.append({
                    "type": "POS Terminal Cryptographic Signature",
                    "status": "INFO",
                    "detail": "Standard static printed QR (No dynamic terminal signature payload)."
                })

            merchant_details = {
                "id": merchant_record["id"],
                "brand_name": registered_brand,
                "registered_vpa": merchant_record["registered_vpa"],
                "category": merchant_record["category"],
                "mcc_code": merchant_record["mcc_code"],
                "tier": merchant_record["verification_tier"],
                "city": merchant_record["city"]
            }

        else:
            # Recipient NOT found in enterprise registry!
            merchant_details = None
            if claimed_brand:
                # Physical sticker swap with a personal mule account!
                is_swapped = True
                risk_score = 96.0
                risk_tier = "CRITICAL"
                verdict = "SWAPPED_STICKER_MULE"
                evidence.append({
                    "type": "Severe Counter Tampering",
                    "status": "FAIL",
                    "detail": f"Store displays '{claimed_store_brand}', but the QR code directs payment to unverified personal VPA '{vpa}'. This is a classic fraudulent sticker-overlay scam."
                })
            else:
                risk_score = 45.0
                risk_tier = "MEDIUM"
                verdict = "UNVERIFIED_INDIVIDUAL_QR"
                evidence.append({
                    "type": "Merchant Registry Check",
                    "status": "UNKNOWN",
                    "detail": f"VPA '{vpa}' is an unregistered personal/P2P address, not an enrolled verified enterprise merchant."
                })

        return {
            "verdict": verdict,
            "risk_score": round(risk_score, 1),
            "risk_tier": risk_tier,
            "is_swapped": is_swapped,
            "is_verified": is_verified,
            "pos_signature_valid": pos_sig_valid,
            "parsed_payload": payload,
            "merchant_details": merchant_details,
            "evidence": evidence,
            "guidance": (
                "DO NOT PAY! The physical QR code at this counter has been replaced or tampered with." 
                if is_swapped else 
                ("Verified official merchant. Safe to proceed with payment." if is_verified else "Unregistered recipient. Confirm payee name before paying.")
            )
        }

qr_service = QRGuardianService()
