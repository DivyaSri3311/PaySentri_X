"""
ProofPay ChallengePay: Order-Bound Payment Verification & Merchant Ledger Engine.
Provides authoritative settlement checking against the independent merchant ledger.
Includes PaymentVerificationProvider interface for future real bank/aggregator API integration.
"""

import os
import random
import string
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from backend.data.database import get_connection


class PaymentVerificationProvider(ABC):
    """Abstract interface for checking payment settlement against an authoritative source."""

    @abstractmethod
    def verify_payment(
        self,
        transaction_reference: Optional[str],
        expected_amount: Optional[float],
        recipient_vpa: Optional[str],
        order_id: Optional[str]
    ) -> Dict[str, Any]:
        pass


class SimulatedMerchantLedgerProvider(PaymentVerificationProvider):
    """
    Authoritative local simulated merchant ledger provider for CyberCup demonstration.
    Inspects persistent database records to verify whether funds actually cleared.
    """

    def verify_payment(
        self,
        transaction_reference: Optional[str],
        expected_amount: Optional[float],
        recipient_vpa: Optional[str],
        order_id: Optional[str]
    ) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Search by Transaction Reference (UTR)
        matched_row = None
        if transaction_reference and len(transaction_reference.strip()) >= 6:
            cursor.execute("""
            SELECT * FROM proofpay_ledger
            WHERE transaction_reference = ?
            LIMIT 1
            """, (transaction_reference.strip(),))
            matched_row = cursor.fetchone()

        # 2. If not matched by UTR, search by Order ID if provided
        if not matched_row and order_id:
            cursor.execute("""
            SELECT * FROM proofpay_ledger
            WHERE order_id = ?
            LIMIT 1
            """, (order_id.strip(),))
            matched_row = cursor.fetchone()

        conn.close()

        if not matched_row:
            return {
                "status": "NOT_FOUND",
                "is_settled": False,
                "verified_record": None,
                "discrepancies": ["No matching transaction record found in the merchant's authoritative ledger."],
                "provider_mode": "Demo Ledger (Simulated Merchant Rail)"
            }

        rec = dict(matched_row)
        discrepancies = []

        # Check Amount
        if expected_amount is not None:
            amt_diff = abs(float(rec["amount"]) - float(expected_amount))
            if amt_diff > 0.5:
                discrepancies.append(
                    f"Amount mismatch: Ledger received ₹{float(rec['amount']):,.2f}, but expected ₹{float(expected_amount):,.2f}."
                )

        # Check Recipient VPA
        if recipient_vpa and rec.get("recipient_vpa"):
            if recipient_vpa.strip().lower() != rec["recipient_vpa"].strip().lower():
                discrepancies.append(
                    f"Recipient mismatch: Funds routed to '{rec['recipient_vpa']}', expected '{recipient_vpa}'."
                )

        # Check Settlement Status
        if rec["payment_status"] != "SUCCESS":
            discrepancies.append(
                f"Settlement incomplete: Payment status in merchant ledger is '{rec['payment_status']}'."
            )

        # Formulate authoritative conclusion
        if discrepancies:
            # Distinguish between pending settlement and mismatch
            if rec["payment_status"] == "PENDING":
                final_status = "PENDING"
            elif any("Amount mismatch" in d for d in discrepancies) or any("Recipient mismatch" in d for d in discrepancies):
                final_status = "MISMATCHED"
            else:
                final_status = "MISMATCHED"
            is_settled = False
        else:
            final_status = "CONFIRMED"
            is_settled = True

        return {
            "status": final_status,
            "is_settled": is_settled,
            "verified_record": {
                "ledger_id": rec["id"],
                "order_id": rec["order_id"],
                "merchant_id": rec["merchant_id"],
                "recipient_vpa": rec["recipient_vpa"],
                "settled_amount": float(rec["amount"]),
                "transaction_reference": rec["transaction_reference"],
                "timestamp": rec["transaction_timestamp"],
                "payment_status": rec["payment_status"],
                "payment_provider": rec["payment_provider"]
            },
            "discrepancies": discrepancies,
            "provider_mode": "Demo Ledger (Simulated Merchant Rail)"
        }


class ChallengePayOrderService:
    def __init__(self, provider: Optional[PaymentVerificationProvider] = None):
        self.provider = provider or SimulatedMerchantLedgerProvider()

    def create_order(
        self,
        merchant_id: str,
        expected_amount: float,
        recipient_vpa: str,
        customer_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generates an unpredictable merchant order ID and stores it in the database."""
        order_num = "".join(random.choices(string.digits, k=6))
        order_id = f"ORD-{order_num}"
        created_at = datetime.utcnow().isoformat() + "Z"
        expires_at = (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z"

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO proofpay_orders 
        (order_id, merchant_id, customer_name, expected_amount, currency, recipient_vpa, status, created_at, expires_at)
        VALUES (?, ?, ?, ?, 'INR', ?, 'PENDING', ?, ?)
        """, (order_id, merchant_id, customer_name or "Walk-in Customer", expected_amount, recipient_vpa, created_at, expires_at))
        conn.commit()
        conn.close()

        return {
            "order_id": order_id,
            "merchant_id": merchant_id,
            "customer_name": customer_name or "Walk-in Customer",
            "expected_amount": expected_amount,
            "currency": "INR",
            "recipient_vpa": recipient_vpa,
            "status": "PENDING",
            "created_at": created_at,
            "expires_at": expires_at
        }

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves order information from database."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM proofpay_orders WHERE order_id = ?", (order_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def list_orders(self, merchant_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        if merchant_id:
            cursor.execute("SELECT * FROM proofpay_orders WHERE merchant_id = ? ORDER BY created_at DESC LIMIT ?", (merchant_id, limit))
        else:
            cursor.execute("SELECT * FROM proofpay_orders ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def verify_against_ledger(
        self,
        transaction_reference: Optional[str],
        expected_amount: Optional[float],
        recipient_vpa: Optional[str],
        order_id: Optional[str]
    ) -> Dict[str, Any]:
        """Queries the authoritative provider to verify settlement."""
        return self.provider.verify_payment(
            transaction_reference=transaction_reference,
            expected_amount=expected_amount,
            recipient_vpa=recipient_vpa,
            order_id=order_id
        )

challengepay_service = ChallengePayOrderService()
