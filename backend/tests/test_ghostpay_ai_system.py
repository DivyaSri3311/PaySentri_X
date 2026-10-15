"""
PaySentriX GhostPay Advanced AI Payment Screenshot Fraud Detection Test Suite.
Validates end-to-end evidence pipeline:
1. File, MIME type, size, and dimension validation.
2. Cryptographic SHA-256 and perceptual dHash duplicate detection.
3. Dual-engine extraction reconciliation and disagreement tracking.
4. Debit versus credit transaction direction normalization.
5. Altered amounts and recipient mismatches (deterministic consistency).
6. Non-standard UTR syntax (NPCI 12-digit standard).
7. Unreadable, blurry, and corrupted image handling.
8. Authentic unverified screenshots (NO OBVIOUS FRAUD DETECTED — NOT VERIFIED).
9. Merchant-confirmed trusted settlements (VERIFIED BY TRUSTED SOURCE).
10. Honest bank provider disclosures without fabricated settlements.
11. Content provenance scope and honest limitations.
12. AI Investigation Agent natural language understanding and missing detail follow-ups.
"""

import io
import base64
import unittest
from PIL import Image, ImageDraw

from backend.data.database import init_db, get_connection
from backend.services.ghostpay_service import (
    ghostpay_service,
    validate_image_input,
    normalize_transaction_fields,
    reconcile_extractions,
    inspect_content_provenance,
    VERDICT_SUSPICIOUS,
    VERDICT_VERIFIED,
    VERDICT_NOT_VERIFIED,
    VERDICT_INSUFFICIENT
)
from backend.services.ghostpay_agent_service import ghostpay_agent


def _create_test_image(width=400, height=700, text="Payment Successful ₹500.00 to Chai Point", color="#ffffff") -> bytes:
    """Helper to generate a clean synthetic in-memory JPEG payment screenshot."""
    img = Image.new("RGB", (width, height), color=color)
    draw = ImageDraw.Draw(img)
    draw.rectangle([(20, 20), (width - 20, 120)], fill="#5f259f")
    draw.text((40, 50), text, fill="#ffffff")
    draw.text((40, 160), "UPI Ref: 430198274192", fill="#000000")
    draw.text((40, 200), "Paid to Chai Point", fill="#000000")
    draw.text((40, 240), "chaipoint@yesbank", fill="#000000")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class TestGhostPayAISystem(unittest.TestCase):
    def setUp(self):
        init_db()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ghostpay_evidence_registry")
        conn.commit()
        conn.close()

    # --------------------------------------------------------------------------
    # 1. Image Validation Tests (MIME, Dimensions, File Size)
    # --------------------------------------------------------------------------

    def test_image_validation_unsupported_format(self):
        """Unsupported format (e.g. raw text or corrupted bytes) must be rejected."""
        corrupted_bytes = b"NOT_A_REAL_IMAGE_HEADER_DATA"
        is_valid, err_msg, pil_img = validate_image_input(corrupted_bytes)
        self.assertFalse(is_valid)
        self.assertIn("Corrupted or invalid image", err_msg)

        # Run through end-to-end analyze_evidence
        b64 = f"data:image/jpeg;base64,{base64.b64encode(corrupted_bytes).decode()}"
        res = ghostpay_service.analyze_evidence(image_base64=b64)
        self.assertEqual(res["verdict_category"], VERDICT_INSUFFICIENT)
        self.assertEqual(res["overall_assessment"], "INSUFFICIENT_EVIDENCE")

    def test_image_validation_tiny_dimensions(self):
        """Images smaller than 80x80px must be rejected for insufficient dimensions."""
        tiny_img = Image.new("RGB", (30, 30), color="#ffffff")
        buf = io.BytesIO()
        tiny_img.save(buf, format="JPEG")
        raw_bytes = buf.getvalue()

        is_valid, err_msg, pil_img = validate_image_input(raw_bytes)
        self.assertFalse(is_valid)
        self.assertIn("too small", err_msg)

    def test_image_validation_oversized_file(self):
        """Images larger than 10MB must be rejected safely."""
        oversized_bytes = b"0" * (11 * 1024 * 1024)
        is_valid, err_msg, pil_img = validate_image_input(oversized_bytes)
        self.assertFalse(is_valid)
        self.assertIn("exceeds maximum allowed limit of 10MB", err_msg)

    # --------------------------------------------------------------------------
    # 2. Cryptographic Duplicate Hashing (SHA-256 and UTR reuse)
    # --------------------------------------------------------------------------

    def test_duplicate_upload_detection(self):
        """Uploading the exact same image twice must flag an EXACT_DUPLICATE_IMAGE_HASH."""
        raw_img = _create_test_image()
        b64 = f"data:image/jpeg;base64,{base64.b64encode(raw_img).decode()}"

        # First upload
        res1 = ghostpay_service.analyze_evidence(
            image_base64=b64,
            expected_amount=500.0,
            expected_recipient_name="Chai Point"
        )
        self.assertIn("sha256", res1["duplicate_evidence"])

        # Record first upload in database registry
        from backend.data.database import record_ghostpay_evidence
        record_ghostpay_evidence(
            record_id="AUDIT-TEST-001",
            image_sha256=res1["duplicate_evidence"]["sha256"],
            image_dhash=res1["duplicate_evidence"]["dhash"],
            utr_number="430198274192",
            amount=500.0,
            recipient_vpa="chaipoint@yesbank",
            assessment=res1["overall_assessment"]
        )

        # Second upload with identical image bytes
        res2 = ghostpay_service.analyze_evidence(
            image_base64=b64,
            expected_amount=500.0,
            expected_recipient_name="Chai Point"
        )
        self.assertEqual(res2["verdict_category"], VERDICT_SUSPICIOUS)
        self.assertEqual(res2["overall_assessment"], "SUSPICIOUS_REVIEW_REQUIRED")
        rule_names = [f["rule_name"] for f in res2["findings"]]
        self.assertIn("EXACT_DUPLICATE_IMAGE_HASH", rule_names)
        self.assertTrue(res2["duplicate_evidence"]["is_exact_image_duplicate"])

    # --------------------------------------------------------------------------
    # 3. Dual Extraction Reconciliation & Disagreement Tracking
    # --------------------------------------------------------------------------

    def test_ocr_vision_agreement(self):
        """When OCR and Vision agree on fields, confidence must be HIGH with no discrepancy flags."""
        ocr_mock = {
            "amount": 350.0,
            "currency": "INR",
            "recipient_name": "Chai Point Mountain Trail",
            "recipient_vpa": "chaipoint@yesbank",
            "utr_number": "430198274192",
            "payment_status": "SUCCESS",
            "transaction_type": "DEBIT",
            "payment_app": "PhonePe"
        }
        vision_mock = {
            "amount": 350.0,
            "currency": "INR",
            "recipient_name": "Chai Point Mountain Trail",
            "recipient_vpa": "chaipoint@yesbank",
            "utr_number": "430198274192",
            "payment_status": "SUCCESS",
            "transaction_type": "DEBIT",
            "payment_app": "PhonePe"
        }
        reconciled, uncertainty, discrepancies = reconcile_extractions(ocr_mock, vision_mock)
        self.assertEqual(len(discrepancies), 0)
        self.assertEqual(uncertainty["amount"]["status"], "AGREEMENT")
        self.assertEqual(uncertainty["amount"]["confidence"], "HIGH")
        self.assertEqual(reconciled["amount"], 350.0)

    def test_ocr_vision_disagreement_tracking(self):
        """When OCR and Vision disagree on amounts, discrepancy must be logged without silent overwriting."""
        ocr_mock = {
            "amount": 500.0,
            "recipient_name": "Chai Point",
            "utr_number": "430198274192",
            "payment_status": "SUCCESS"
        }
        vision_mock = {
            "amount": 50.0,  # 10x difference
            "recipient_name": "Chai Point",
            "utr_number": "430198274192",
            "payment_status": "SUCCESS"
        }
        reconciled, uncertainty, discrepancies = reconcile_extractions(ocr_mock, vision_mock)
        self.assertGreaterEqual(len(discrepancies), 1)
        self.assertEqual(uncertainty["amount"]["status"], "DISAGREEMENT")
        self.assertEqual(uncertainty["amount"]["confidence"], "LOW")
        self.assertEqual(uncertainty["amount"]["ocr_value"], 500.0)
        self.assertEqual(uncertainty["amount"]["vision_value"], 50.0)
        disc_rules = [d["rule_name"] for d in discrepancies]
        self.assertIn("DISCREPANCY_AMOUNT", disc_rules)

    # --------------------------------------------------------------------------
    # 4. Debit vs Credit Transaction Normalization
    # --------------------------------------------------------------------------

    def test_debit_credit_direction_normalization(self):
        """Correctly identifies DEBIT, CREDIT, and COLLECT_REQUEST transaction directions."""
        debit_data = normalize_transaction_fields({"amount": "250.00"}, raw_ocr_text="Paid to Starbucks debited from A/C XX12")
        self.assertEqual(debit_data["transaction_type"], "DEBIT")
        self.assertEqual(debit_data["amount"], 250.0)

        credit_data = normalize_transaction_fields({"amount": "1000.00"}, raw_ocr_text="Received from Divya Sharma credited to Bank")
        self.assertEqual(credit_data["transaction_type"], "CREDIT")

        collect_data = normalize_transaction_fields({"amount": "500.00"}, raw_ocr_text="Payment Request by John collect request")
        self.assertEqual(collect_data["transaction_type"], "COLLECT_REQUEST")

    # --------------------------------------------------------------------------
    # 5. Deterministic Forensic Checks: Altered Amounts & Recipient Mismatches
    # --------------------------------------------------------------------------

    def test_altered_amount_mismatch(self):
        """When claimed screenshot amount differs from merchant's expected amount, flag AMOUNT_MISMATCH."""
        res = ghostpay_service.analyze_evidence(
            preset_scenario_id="preset-unsettled-claim",  # Claims ₹350.00
            expected_amount=3500.0,                       # Expected ₹3,500.00
            expected_recipient_name="Chai Point Mountain Trail"
        )
        self.assertEqual(res["verdict_category"], VERDICT_SUSPICIOUS)
        self.assertEqual(res["overall_assessment"], "SUSPICIOUS_REVIEW_REQUIRED")
        self.assertEqual(res["consistency_matrix"]["amount_match"], "MISMATCH")
        rule_names = [f["rule_name"] for f in res["findings"]]
        self.assertIn("AMOUNT_MISMATCH", rule_names)

    def test_recipient_identity_mismatch(self):
        """When claimed recipient differs from merchant identity, flag RECIPIENT_MISMATCH."""
        res = ghostpay_service.analyze_evidence(
            preset_scenario_id="preset-unsettled-claim",  # Paid to Chai Point Mountain Trail
            expected_amount=350.0,
            expected_recipient_name="Tata Starbucks Pvt Ltd"  # Completely different merchant
        )
        self.assertEqual(res["verdict_category"], VERDICT_SUSPICIOUS)
        self.assertEqual(res["overall_assessment"], "SUSPICIOUS_REVIEW_REQUIRED")
        self.assertEqual(res["consistency_matrix"]["recipient_match"], "MISMATCH")
        rule_names = [f["rule_name"] for f in res["findings"]]
        self.assertIn("RECIPIENT_MISMATCH", rule_names)

    # --------------------------------------------------------------------------
    # 6. Non-Standard UTR Syntax
    # --------------------------------------------------------------------------

    def test_non_standard_utr_syntax(self):
        """Non-12-digit UTRs (e.g. 8 digits from spoof APKs) must be flagged."""
        res = ghostpay_service.analyze_evidence(
            preset_scenario_id="preset-paytm-spoof",  # Has 8-digit UTR 99128374
            expected_amount=1200.0,
            expected_recipient_name="Sharma Tea Corner (Unverified)"
        )
        self.assertEqual(res["verdict_category"], VERDICT_SUSPICIOUS)
        rule_names = [f["rule_name"] for f in res["findings"]]
        self.assertIn("NON_STANDARD_UTR_SYNTAX", rule_names)

    # --------------------------------------------------------------------------
    # 7. Unreadable & Blurry Images
    # --------------------------------------------------------------------------

    def test_unreadable_blurry_image(self):
        """Heavily blurred or corrupted camera photos must return INSUFFICIENT EVIDENCE."""
        res = ghostpay_service.analyze_evidence(
            preset_scenario_id="preset-blurry-camera",
            expected_amount=250.0
        )
        self.assertEqual(res["verdict_category"], VERDICT_INSUFFICIENT)
        self.assertEqual(res["overall_assessment"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(res["extracted_details"]["readability_status"], "UNREADABLE")
        self.assertIn("blurry", res["explanation"].lower())

    # --------------------------------------------------------------------------
    # 8. Genuine Screenshots: Unverified Claim vs Verified by Trusted Source
    # --------------------------------------------------------------------------

    def test_genuine_screenshot_unverified_claim(self):
        """Visually authentic screenshot without independent bank credit must be NOT VERIFIED, never claimed verified."""
        res = ghostpay_service.analyze_evidence(
            preset_scenario_id="preset-unsettled-claim",
            expected_amount=350.0,
            expected_recipient_name="Chai Point Mountain Trail",
            merchant_confirmed_credit=False
        )
        self.assertEqual(res["verdict_category"], VERDICT_NOT_VERIFIED)
        self.assertEqual(res["overall_assessment"], "NOT_VERIFIED")
        self.assertFalse(res["bank_verification_provider"]["verified"])
        self.assertIn("Check your merchant soundbox", res["recommended_next_step"])

    def test_genuine_screenshot_verified_by_trusted_source(self):
        """When merchant confirms fund receipt and details align, verdict is VERIFIED BY TRUSTED SOURCE."""
        res = ghostpay_service.analyze_evidence(
            preset_scenario_id="preset-merchant-settled",
            expected_amount=500.0,
            expected_recipient_name="Tata Starbucks Pvt Ltd",
            merchant_confirmed_credit=True
        )
        self.assertEqual(res["verdict_category"], VERDICT_VERIFIED)
        self.assertEqual(res["overall_assessment"], "VERIFIED_BY_TRUSTED_SOURCE")
        self.assertEqual(res["risk_level"], "LOW")
        self.assertLessEqual(res["risk_score"], 20.0)

    # --------------------------------------------------------------------------
    # 9. Provider Settlement & Content Provenance Disclosures
    # --------------------------------------------------------------------------

    def test_bank_provider_honest_disclosure(self):
        """When direct bank credentials are not configured, provider honestly reports UNAVAILABLE without fabricating settlements."""
        provider_res = ghostpay_service.provider.verify_transaction("430198274192", 500.0, "merchant@upi")
        self.assertFalse(provider_res["verified"])
        self.assertEqual(provider_res["status"], "UNAVAILABLE")
        self.assertIn("unavailable", provider_res["message"].lower())

    def test_content_provenance_scope_disclosure(self):
        """Content provenance inspection must disclose that lack of C2PA manifest is normal for mobile screenshots."""
        raw_img = _create_test_image()
        pil_img = Image.open(io.BytesIO(raw_img))
        prov = inspect_content_provenance(pil_img, raw_img)
        self.assertIn("routinely strip C2PA manifests", prov["scope_disclosure"])
        self.assertFalse(prov["tampering_detected"])

    # --------------------------------------------------------------------------
    # 10. AI Investigation Agent Natural Language & Follow-Up
    # --------------------------------------------------------------------------

    def test_agent_missing_detail_followup(self):
        """When user asks to check a payment without providing evidence or amount, agent asks for missing details."""
        res = ghostpay_agent.investigate("Is this payment real?")
        self.assertEqual(res["status"], "SUCCESS")
        # Must request evidence or missing fields rather than claiming verification
        self.assertNotEqual(res.get("verification_outcome"), "VERIFIED_BY_TRUSTED_SOURCE")
        self.assertTrue(
            "screenshot" in res["response_text"].lower() or
            "photo" in res["response_text"].lower() or
            "details" in res["response_text"].lower()
        )

    def test_agent_hinglish_investigation(self):
        """Agent handles Hinglish queries like 'Divya ko 500 bheja hai check karo' correctly."""
        res = ghostpay_agent.investigate("Divya ko 500 bheja hai check karo")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["extracted_fields"]["amount"], 500.0)
        self.assertIn("Divya", res["extracted_fields"]["recipient_name"])


if __name__ == "__main__":
    unittest.main()
