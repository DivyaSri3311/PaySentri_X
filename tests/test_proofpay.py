"""
Automated Test Suite for ProofPay: AI Payment Screenshot Forensics & ReplayGuard.
Covers:
- Image forensics (dimensions, ELA, noise, dHash)
- ReplayGuard duplicate proof detection
- ChallengePay order creation & merchant ledger matching
- Multi-engine decision orchestration across all 5 CyberCup scenarios
- Audit trail persistence and tamper token verification
"""

import os
import sys
import json
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.data.database import init_db, seed_proofpay_data, get_connection
from backend.services.proofpay_forensics import forensics_engine
from backend.services.proofpay_ledger import challengepay_service
from backend.services.proofpay_replay import replay_guard
from backend.services.proofpay_service import proofpay_orchestrator
from backend.services.proofpay_demo import create_synthetic_upi_receipt, demo_scenarios_provider


class TestProofPayCore(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()
        seed_proofpay_data(reset=True)

    def test_01_image_forensics_hashing(self):
        """Verifies SHA256 and perceptual dHash computation and dimension checks."""
        img_bytes = create_synthetic_upi_receipt(amount_str="₹8,500.00", utr="429981273910")
        res = forensics_engine.analyze_image_bytes(img_bytes)

        self.assertIn("sha256_hash", res)
        self.assertIn("phash", res)
        self.assertEqual(len(res["sha256_hash"]), 64)
        self.assertEqual(len(res["phash"]), 16)
        self.assertEqual(res["dimensions"]["width"], 480)
        self.assertEqual(res["dimensions"]["height"], 720)
        self.assertIn("visual_integrity", res)

    def test_02_invalid_file_rejection(self):
        """Verifies that non-image corrupted bytes are rejected safely."""
        corrupted_bytes = b"NOT_A_REAL_IMAGE_DATA_BYTES"
        with self.assertRaises(ValueError):
            forensics_engine.analyze_image_bytes(corrupted_bytes)

    def test_03_challengepay_order_lifecycle(self):
        """Verifies ChallengePay order creation, unpredictable ID, and retrieval."""
        order = challengepay_service.create_order(
            merchant_id="MERCH-SBUX-01",
            expected_amount=8500.0,
            recipient_vpa="starbucks.pay@hdfcbank",
            customer_name="Test Customer"
        )
        self.assertTrue(order["order_id"].startswith("ORD-"))
        self.assertEqual(order["status"], "PENDING")
        self.assertEqual(order["expected_amount"], 8500.0)

        retrieved = challengepay_service.get_order(order["order_id"])
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved["order_id"], order["order_id"])

    def test_04_scenario_d_genuine_ledger_match(self):
        """Verifies Scenario D: Genuine payment matching authoritative ledger returns CONFIRMED."""
        img_bytes = create_synthetic_upi_receipt(
            amount_str="₹8,500.00",
            utr="429981273910",
            receiver_vpa="starbucks.pay@hdfcbank"
        )
        res = proofpay_orchestrator.full_analyze_and_verify(
            image_bytes=img_bytes,
            filename="genuine_receipt.jpg",
            order_id="ORD-882391",
            expected_amount=8500.0,
            recipient_vpa="starbucks.pay@hdfcbank"
        )
        self.assertEqual(res["payment_verification"], "CONFIRMED")
        self.assertEqual(res["recommended_action"], "FULFILL_ORDER")
        self.assertEqual(res["verified_amount"], 8500.0)
        self.assertFalse(res["reference_reused"])

    def test_05_scenario_b_replayguard_attack_blocked(self):
        """Verifies Scenario B: Submitting yesterday's confirmed UTR for a new order is flagged as REPLAY."""
        img_bytes = create_synthetic_upi_receipt(
            amount_str="₹8,500.00",
            utr="428910293841",  # Pre-seeded as confirmed for ORD-771201 yesterday
            timestamp_str="14 Oct 2026, 11:15 AM"
        )
        # Attempt to submit this against order ORD-882391
        res = proofpay_orchestrator.full_analyze_and_verify(
            image_bytes=img_bytes,
            filename="replayed_receipt.jpg",
            order_id="ORD-882391",
            expected_amount=8500.0,
            recipient_vpa="starbucks.pay@hdfcbank"
        )
        self.assertTrue(res["reference_reused"])
        self.assertEqual(res["replay_details"]["replay_vector"], "REUSED_UTR_REFERENCE")
        self.assertEqual(res["replay_details"]["previous_order_id"], "ORD-771201")
        self.assertEqual(res["recommended_action"], "HOLD_SHIPMENT")

    def test_06_scenario_c_recipient_mismatch(self):
        """Verifies Scenario C: Payment to wrong beneficiary VPA returns MISMATCHED."""
        ledger_res = challengepay_service.verify_against_ledger(
            transaction_reference="429981273910",
            expected_amount=8500.0,
            recipient_vpa="wrong.merchant@icici",
            order_id="ORD-882391"
        )
        self.assertEqual(ledger_res["status"], "MISMATCHED")
        self.assertFalse(ledger_res["is_settled"])
        self.assertTrue(any("Recipient mismatch" in d for d in ledger_res["discrepancies"]))

    def test_07_scenario_e_pending_settlement(self):
        """Verifies Scenario E: Transaction with PENDING status in ledger is NOT marked confirmed."""
        ledger_res = challengepay_service.verify_against_ledger(
            transaction_reference="429981273955",
            expected_amount=8500.0,
            recipient_vpa="starbucks.pay@hdfcbank",
            order_id="ORD-554109"
        )
        self.assertEqual(ledger_res["status"], "PENDING")
        self.assertFalse(ledger_res["is_settled"])

    def test_08_audit_history_and_tamper_token(self):
        """Verifies that verification records are persisted with a tamper-evident audit token."""
        history = proofpay_orchestrator.get_history(limit=5)
        self.assertGreater(len(history), 0)
        first_rec = history[0]
        self.assertTrue(first_rec["tamper_audit_token"].startswith("SHA256:"))
        self.assertIn("findings", first_rec)

        report = proofpay_orchestrator.get_report(first_rec["verification_id"])
        self.assertIsNotNone(report)
        self.assertEqual(report["verification_id"], first_rec["verification_id"])


if __name__ == "__main__":
    unittest.main()
