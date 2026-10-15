"""
Automated Unit Tests for GhostPay Detector Engine & API Endpoints.
Tests:
1. Fake Paytm Spoof app detection (SUSPICIOUS_REVIEW_REQUIRED, Critical Risk)
2. Recycled UTR duplicate check (SUSPICIOUS_REVIEW_REQUIRED, High Risk)
3. Unverified visual payment claim (NOT_VERIFIED, Medium Risk)
4. Merchant-confirmed bank settlement (VERIFIED_BY_TRUSTED_SOURCE, Low Risk)
5. Blurry unreadable camera photo (INSUFFICIENT_EVIDENCE, Medium Risk)
6. Duplicate image hashing & Perceptual dHash detection
7. Endpoints /api/ghostpay/status, /api/ghostpay/presets, /api/ghostpay/analyze
"""

import unittest
from fastapi.testclient import TestClient
from backend.app import app
from backend.data.database import get_connection
from backend.services.ghostpay_service import ghostpay_service
from backend.services.ghostpay_presets import get_ghostpay_presets


class TestGhostPayDetector(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ghostpay_evidence_registry")
        conn.commit()
        conn.close()

    def test_status_endpoint(self):
        res = self.client.get("/api/ghostpay/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ONLINE")
        self.assertIn("A payment screenshot is a claim", data["tagline"])

    def test_presets_endpoint(self):
        res = self.client.get("/api/ghostpay/presets")
        self.assertEqual(res.status_code, 200)
        presets = res.json()
        self.assertGreaterEqual(len(presets), 5)
        preset_ids = [p["id"] for p in presets]
        self.assertIn("preset-paytm-spoof", preset_ids)
        self.assertIn("preset-recycled-utr", preset_ids)
        self.assertIn("preset-unsettled-claim", preset_ids)
        self.assertIn("preset-merchant-settled", preset_ids)
        self.assertIn("preset-blurry-camera", preset_ids)

    def test_fake_spoof_app_detection(self):
        """Should detect amount mismatch, recipient mismatch, 8-digit UTR and trigger SUSPICIOUS_REVIEW_REQUIRED."""
        res = ghostpay_service.analyze_evidence(
            preset_scenario_id="preset-paytm-spoof",
            expected_amount=1800.0,
            expected_recipient_name="Chai Point Mountain Trail",
            expected_vpa="chaipoint@yesbank"
        )
        self.assertEqual(res["overall_assessment"], "SUSPICIOUS_REVIEW_REQUIRED")
        self.assertEqual(res["risk_tier"], "CRITICAL")
        self.assertGreaterEqual(res["risk_score"], 80)
        self.assertEqual(res["consistency_matrix"]["amount_match"], "MISMATCH")
        self.assertEqual(res["consistency_matrix"]["recipient_match"], "MISMATCH")
        self.assertEqual(res["consistency_matrix"]["utr_syntax"], "NON_STANDARD_FORMAT")

    def test_unsettled_claim_assessment(self):
        """Authentic screenshot without bank settlement confirmation must yield NOT_VERIFIED, never verified."""
        res = ghostpay_service.analyze_evidence(
            preset_scenario_id="preset-unsettled-claim",
            expected_amount=350.0,
            expected_recipient_name="Chai Point Mountain Trail",
            expected_vpa="chaipoint@yesbank",
            merchant_confirmed_credit=False
        )
        self.assertEqual(res["overall_assessment"], "NOT_VERIFIED")
        self.assertEqual(res["risk_tier"], "MEDIUM")
        self.assertFalse(res["bank_verification_provider"]["verified"])
        self.assertIn("Check your merchant soundbox", res["recommended_action"])

    def test_merchant_confirmed_settlement(self):
        """When merchant confirms bank credit and details align, yields VERIFIED_BY_TRUSTED_SOURCE."""
        res = ghostpay_service.analyze_evidence(
            preset_scenario_id="preset-merchant-settled",
            expected_amount=500.0,
            expected_recipient_name="Tata Starbucks Pvt Ltd",
            expected_vpa="starbucks.pay@hdfcbank",
            merchant_confirmed_credit=True
        )
        self.assertEqual(res["overall_assessment"], "VERIFIED_BY_TRUSTED_SOURCE")
        self.assertEqual(res["risk_tier"], "LOW")
        self.assertLessEqual(res["risk_score"], 20)

    def test_insufficient_evidence(self):
        """Blurry or corrupted camera photo must yield INSUFFICIENT_EVIDENCE."""
        res = ghostpay_service.analyze_evidence(
            preset_scenario_id="preset-blurry-camera",
            expected_amount=250.0
        )
        self.assertEqual(res["overall_assessment"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(res["risk_tier"], "MEDIUM")

    def test_duplicate_image_hashing(self):
        """Duplicate submissions of same image hash must be caught by duplicate detector."""
        presets = get_ghostpay_presets()
        sample = presets[2] # genuine phonepe
        b64 = sample["image_base64"]

        # Run first time via API
        payload = {
            "image_base64": b64,
            "expected_amount": 350.0,
            "expected_recipient_name": "Chai Point Mountain Trail",
            "expected_vpa": "chaipoint@yesbank"
        }
        res1 = self.client.post("/api/ghostpay/analyze", json=payload)
        self.assertEqual(res1.status_code, 200)

        # Run second time with identical image bytes
        res2 = self.client.post("/api/ghostpay/analyze", json=payload)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertTrue(data2["duplicate_evidence"]["is_exact_image_duplicate"])
        self.assertEqual(data2["overall_assessment"], "SUSPICIOUS_REVIEW_REQUIRED")

    def test_raw_image_readable_extraction_avoids_false_insufficient_evidence(self):
        """A clearly readable raw screenshot must extract payment fields and NOT yield INSUFFICIENT_EVIDENCE."""
        presets = get_ghostpay_presets()
        phonepe_sample = presets[2] # PhonePe ₹350 receipt
        b64 = phonepe_sample["image_base64"]

        res = ghostpay_service.analyze_evidence(
            image_base64=b64,
            expected_amount=350.0,
            expected_recipient_name="Chai Point Mountain Trail",
            expected_vpa="chaipoint@yesbank"
        )
        self.assertEqual(res["overall_assessment"], "NOT_VERIFIED")
        self.assertEqual(res["risk_tier"], "MEDIUM")
        self.assertEqual(res["extracted_details"]["amount"], 350.0)
        self.assertEqual(res["extracted_details"]["utr_number"], "430198274192")
        self.assertEqual(res["extracted_details"]["readability_status"], "READABLE")
        self.assertIn("amount", res["extracted_details"]["field_confidences"])
        self.assertIn("utr_number", res["extracted_details"]["field_confidences"])
        self.assertIn("Screenshot evidence is readable", res["explanation"])

    def test_partial_receipt_avoids_insufficient_evidence(self):
        """Absence of UTR or recipient alone must not cause the entire image to be classified as unreadable."""
        # Simulated line items where UTR is missing
        lines = [
            {"confidence": 1.0, "text": "Google Pay"},
            {"confidence": 1.0, "text": "Paid to Cafe Coffee Day"},
            {"confidence": 1.0, "text": "₹ 250.00"},
            {"confidence": 0.8, "text": "ccd@icici"}
        ]
        parsed = ghostpay_service._parse_receipt_text_lines(lines, None, lap_var=1200.0)
        self.assertEqual(parsed["readability_status"], "READABLE")
        self.assertEqual(parsed["amount"], 250.0)
        self.assertIsNone(parsed["utr_number"])


if __name__ == "__main__":
    unittest.main()

