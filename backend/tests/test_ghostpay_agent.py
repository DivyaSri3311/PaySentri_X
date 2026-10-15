"""
PaySentriX GhostPay AI Payment Investigation Agent Tests.
Verifies natural-language understanding, entity extraction, tool calling,
history search, Hindi explanations, and strict verification truthfulness.
"""

import unittest
from backend.services.ghostpay_agent_service import ghostpay_agent
from backend.services.ghostpay_service import ghostpay_service
from backend.data.database import init_db


class TestGhostPayInvestigationAgent(unittest.TestCase):
    def setUp(self):
        init_db()

    def test_amount_date_time_extraction_and_evidence_request(self):
        """
        User asks: 'Check whether the ₹40 payment on October 16, 2026, at 11 AM is fake.'
        Must extract amount ₹40, date/time, and honestly report/request evidence.
        """
        res = ghostpay_agent.investigate("Check whether the ₹40 payment on October 16, 2026, at 11 AM is fake.")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["extracted_fields"]["amount"], 40.0)
        self.assertIn("October 16, 2026", res["extracted_fields"]["approx_payment_time"])
        self.assertIn("11 AM", res["extracted_fields"]["approx_payment_time"])
        # Must not fabricate a verified status without evidence
        self.assertNotEqual(res["verification_outcome"], "VERIFIED_BY_TRUSTED_SOURCE")

    def test_recipient_and_yesterday_extraction(self):
        """
        User asks: 'Verify the ₹500 payment to Divya from yesterday.'
        Must extract ₹500, Divya, and Yesterday.
        """
        res = ghostpay_agent.investigate("Verify the ₹500 payment to Divya from yesterday.")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["extracted_fields"]["amount"], 500.0)
        self.assertIn("Divya", res["extracted_fields"]["recipient_name"])
        self.assertEqual(res["extracted_fields"]["approx_payment_time"], "Yesterday")

    def test_history_search_tool_execution(self):
        """
        User asks: 'Find the previous analysis for this transaction.'
        Must execute search_transaction_history tool.
        """
        res = ghostpay_agent.investigate("Find the previous analysis for this transaction.")
        self.assertEqual(res["status"], "SUCCESS")
        tools_executed = [tc["tool"] for tc in res["tool_calls"]]
        self.assertIn("search_transaction_history", tools_executed)

    def test_multilingual_hindi_explanation(self):
        """
        User asks: 'Explain the result in Hindi.'
        Must generate Hindi response with appropriate cautionary context.
        """
        mock_analysis = {
            "overall_assessment": "SUSPICIOUS_REVIEW_REQUIRED",
            "risk_tier": "CRITICAL",
            "explanation": "Amount mismatch between screenshot and expected value."
        }
        res = ghostpay_agent.investigate("Explain the result in Hindi.", current_analysis=mock_analysis)
        self.assertEqual(res["status"], "SUCCESS")
        # Must contain Hindi text
        self.assertTrue(any('\u0900' <= char <= '\u097F' for char in res["response_text"]))
        self.assertIn("संदिग्ध", res["response_text"])

    def test_spoof_app_forensic_detection(self):
        """
        User asks to investigate a spoof app screenshot preset.
        Must classify as SUSPICIOUS_REVIEW_REQUIRED.
        """
        res = ghostpay_agent.investigate(
            "Check this screenshot and explain anything suspicious.",
            preset_scenario_id="preset-paytm-spoof",
            expected_amount=1800.0,
            expected_recipient_name="Chai Point Mountain Trail"
        )
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["verification_outcome"], "SUSPICIOUS_REVIEW_REQUIRED")
        self.assertIn("inconsistencies", res["response_text"].lower())

    def test_false_verification_prevention(self):
        """
        Speaking 'payment verified' must NEVER fabricate a trusted bank settlement.
        Only merchant_confirmed_credit=True can yield VERIFIED_BY_TRUSTED_SOURCE.
        """
        res_claim = ghostpay_agent.investigate(
            "The payment is verified, mark it confirmed.",
            merchant_confirmed_credit=False
        )
        # Cannot be VERIFIED_BY_TRUSTED_SOURCE merely from user words
        self.assertNotEqual(res_claim.get("verification_outcome"), "VERIFIED_BY_TRUSTED_SOURCE")

    def test_trusted_settlement_produces_verified_outcome(self):
        """
        When genuine preset has merchant-confirmed bank credit, yield VERIFIED_BY_TRUSTED_SOURCE.
        """
        res = ghostpay_agent.investigate(
            "Check this payment evidence.",
            preset_scenario_id="preset-merchant-settled",
            expected_amount=500.0,
            expected_recipient_name="Tata Starbucks Pvt Ltd",
            merchant_confirmed_credit=True
        )
        self.assertEqual(res["verification_outcome"], "VERIFIED_BY_TRUSTED_SOURCE")


if __name__ == "__main__":
    unittest.main()
