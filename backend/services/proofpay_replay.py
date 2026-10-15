"""
ProofPay ReplayGuard: Duplicate Payment Proof & Replay Detection Engine.
Detects when a customer re-submits an authentic or previously used payment screenshot
to claim a new purchase or separate order.
"""

from typing import Dict, Any, List, Optional
from backend.data.database import get_connection

class ProofPayReplayGuard:
    def __init__(self):
        pass

    def check_replay(
        self,
        sha256_hash: str,
        phash: str,
        claimed_reference: Optional[str] = None,
        current_order_id: Optional[str] = None,
        current_merchant_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Queries the persistent verification vault for identical cryptographic hashes,
        perceptual dHash near-duplicates (Hamming distance <= 4), and reused UPI reference numbers.
        """
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Exact Cryptographic Hash Match (Identical Image Bytes for a DIFFERENT order)
        if current_order_id:
            cursor.execute("""
            SELECT verification_id, order_id, merchant_id, claimed_amount, claimed_reference, created_at, payment_verification
            FROM proofpay_verifications
            WHERE sha256_hash = ? AND order_id != ?
            ORDER BY created_at ASC LIMIT 1
            """, (sha256_hash, current_order_id))
        else:
            cursor.execute("""
            SELECT verification_id, order_id, merchant_id, claimed_amount, claimed_reference, created_at, payment_verification
            FROM proofpay_verifications
            WHERE sha256_hash = ?
            ORDER BY created_at ASC LIMIT 1
            """, (sha256_hash,))
        exact_row = cursor.fetchone()

        if exact_row:
            row_dict = dict(exact_row)
            conn.close()
            return {
                "is_replayed": True,
                "replay_vector": "EXACT_IMAGE_HASH",
                "previous_order_id": row_dict["order_id"],
                "previous_verification_id": row_dict["verification_id"],
                "previous_timestamp": row_dict["created_at"],
                "previous_merchant_id": row_dict["merchant_id"],
                "claimed_reference": row_dict["claimed_reference"],
                "message": f"Identical image proof was previously submitted on {row_dict['created_at']} for Order {row_dict['order_id']}."
            }

        # 2. Reused 12-digit UPI Transaction Reference (UTR for a DIFFERENT order)
        if claimed_reference and len(claimed_reference.strip()) >= 8:
            clean_ref = claimed_reference.strip()
            if current_order_id:
                cursor.execute("""
                SELECT verification_id, order_id, merchant_id, claimed_amount, created_at, payment_verification
                FROM proofpay_verifications
                WHERE claimed_reference = ? AND order_id != ?
                ORDER BY created_at ASC LIMIT 1
                """, (clean_ref, current_order_id))
            else:
                cursor.execute("""
                SELECT verification_id, order_id, merchant_id, claimed_amount, created_at, payment_verification
                FROM proofpay_verifications
                WHERE claimed_reference = ?
                ORDER BY created_at ASC LIMIT 1
                """, (clean_ref,))
            ref_row = cursor.fetchone()

            if ref_row:
                ref_dict = dict(ref_row)
                conn.close()
                return {
                    "is_replayed": True,
                    "replay_vector": "REUSED_UTR_REFERENCE",
                    "previous_order_id": ref_dict["order_id"],
                    "previous_verification_id": ref_dict["verification_id"],
                    "previous_timestamp": ref_dict["created_at"],
                    "previous_merchant_id": ref_dict["merchant_id"],
                    "claimed_reference": clean_ref,
                    "message": f"Transaction reference (UTR {clean_ref}) was already registered on {ref_dict['created_at']} for Order {ref_dict['order_id']}."
                }

        # 3. Perceptual dHash Near-Duplicate Check (Cropped or re-compressed screenshots)
        if phash and phash != "0000000000000000":
            cursor.execute("""
            SELECT verification_id, order_id, merchant_id, phash, claimed_amount, claimed_reference, created_at
            FROM proofpay_verifications
            ORDER BY created_at ASC LIMIT 100
            """)
            rows = cursor.fetchall()

            for r in rows:
                if current_order_id and r["order_id"] == current_order_id:
                    continue
                candidate_phash = r["phash"]
                if candidate_phash and candidate_phash != "0000000000000000":
                    try:
                        # Bitwise Hamming Distance
                        val1 = int(phash, 16)
                        val2 = int(candidate_phash, 16)
                        dist = bin(val1 ^ val2).count("1")
                        # 64-bit dHash: distance <= 4 means visually near-identical screenshot
                        if dist <= 4:
                            conn.close()
                            return {
                                "is_replayed": True,
                                "replay_vector": "PERCEPTUAL_NEAR_DUPLICATE",
                                "hamming_distance": dist,
                                "previous_order_id": r["order_id"],
                                "previous_verification_id": r["verification_id"],
                                "previous_timestamp": r["created_at"],
                                "previous_merchant_id": r["merchant_id"],
                                "claimed_reference": r["claimed_reference"],
                                "message": f"Near-duplicate screenshot layout detected (Hamming distance: {dist}/64). Previously submitted for Order {r['order_id']}."
                            }
                    except Exception:
                        continue

        conn.close()
        return {
            "is_replayed": False,
            "replay_vector": "NONE",
            "previous_order_id": None,
            "previous_verification_id": None,
            "previous_timestamp": None,
            "previous_merchant_id": None,
            "claimed_reference": claimed_reference,
            "message": "No prior usage of this screenshot or reference detected in ReplayGuard vault."
        }

replay_guard = ProofPayReplayGuard()
