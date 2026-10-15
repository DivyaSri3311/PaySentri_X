"""
PaySentriX SQLite Database Manager.
Manages persistent storage for:
1. Trusted Merchant Registry & enrolled POS keys
2. Audit History & security incident reports
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "paysentrix.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Trusted Merchant Registry
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        brand_name TEXT NOT NULL,
        registered_vpa TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        mcc_code TEXT NOT NULL,
        verification_tier TEXT NOT NULL,
        terminal_public_key TEXT,
        city TEXT,
        created_at TEXT
    )
    """)
    
    # 2. Audit History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_records (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        input_summary TEXT NOT NULL,
        full_payload TEXT NOT NULL,
        risk_score REAL NOT NULL,
        risk_tier TEXT NOT NULL,
        prediction TEXT NOT NULL,
        category TEXT NOT NULL,
        contract_verdict TEXT NOT NULL,
        explanation TEXT NOT NULL,
        evidence_flags TEXT NOT NULL,
        police_draft TEXT
    )
    """)

    # 3. GhostPay Evidence Registry (Duplicate detection & image hash tracking)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ghostpay_evidence_registry (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        image_sha256 TEXT NOT NULL,
        image_dhash TEXT NOT NULL,
        utr_number TEXT,
        amount REAL,
        recipient_vpa TEXT,
        assessment TEXT NOT NULL
    )
    """)
    
    conn.commit()
    conn.close()

def check_duplicate_evidence(image_sha256: str, image_dhash: str, utr_number: Optional[str] = None) -> Dict[str, Any]:
    """
    Checks if identical image hash or identical UTR has been previously analyzed.
    Ignores placeholder / empty image hashes.
    """
    if not image_sha256 or image_sha256 in ("NO_IMAGE", "NONE", "0000000000000000"):
        return {
            "exact_duplicate_image": None,
            "perceptual_duplicate_image": None,
            "duplicate_utr": None,
        }

    conn = get_connection()
    cursor = conn.cursor()

    # 1. Exact SHA-256 match
    cursor.execute("SELECT * FROM ghostpay_evidence_registry WHERE image_sha256 = ? ORDER BY timestamp DESC LIMIT 1", (image_sha256,))
    exact_hash = cursor.fetchone()

    # 2. Perceptual dHash match (exact match on 16-char hex)
    cursor.execute("SELECT * FROM ghostpay_evidence_registry WHERE image_dhash = ? AND image_sha256 != ? ORDER BY timestamp DESC LIMIT 1", (image_dhash, image_sha256))
    perceptual_hash = cursor.fetchone()

    # 3. UTR duplicate check
    utr_match = None
    if utr_number and len(utr_number) >= 8:
        cursor.execute("SELECT * FROM ghostpay_evidence_registry WHERE utr_number = ? ORDER BY timestamp DESC LIMIT 1", (utr_number,))
        utr_match = cursor.fetchone()

    conn.close()

    return {
        "exact_duplicate_image": dict(exact_hash) if exact_hash else None,
        "perceptual_duplicate_image": dict(perceptual_hash) if perceptual_hash else None,
        "duplicate_utr": dict(utr_match) if utr_match else None,
    }

def record_ghostpay_evidence(
    record_id: str,
    image_sha256: str,
    image_dhash: str,
    utr_number: Optional[str],
    amount: Optional[float],
    recipient_vpa: Optional[str],
    assessment: str
):
    """
    Stores evidence fingerprint for duplicate detection without persisting full screenshot.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO ghostpay_evidence_registry
    (id, timestamp, image_sha256, image_dhash, utr_number, amount, recipient_vpa, assessment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record_id,
        datetime.utcnow().isoformat() + "Z",
        image_sha256,
        image_dhash,
        utr_number,
        amount,
        recipient_vpa,
        assessment
    ))
    conn.commit()
    conn.close()

def seed_merchants():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Initial trusted merchants
    merchants = [
        ("MERCH-ZOMATO-001", "Zomato India Ltd", "zomato@icici", "Food & Dining", "5812", "VERIFIED_TIER1", "ED25519:ZOMATO_IND_PUBK_8912", "All India"),
        ("MERCH-SWIGGY-002", "Swiggy Bundl Tech", "swiggy@axisbank", "Food & Grocery", "5812", "VERIFIED_TIER1", "ED25519:SWIGGY_BLR_PUBK_3490", "All India"),
        ("MERCH-STARBUCKS-003", "Tata Starbucks Pvt Ltd", "starbucks.pay@hdfcbank", "Beverages & Cafe", "5814", "VERIFIED_TIER1", "ED25519:TATA_SBUX_PUBK_9901", "Mumbai / Bangalore"),
        ("MERCH-RELIANCE-004", "Reliance Smart Superstore", "reliancesmart@icici", "Supermarkets", "5411", "VERIFIED_TIER1", "ED25519:RIL_SMART_PUBK_4123", "All India"),
        ("MERCH-BMRC-005", "Namma Metro Bangalore BMRCL", "bmrc.transit@sbi", "Transit & Rail", "4111", "VERIFIED_TIER1", "ED25519:BMRCL_POS_PUBK_7718", "Bangalore"),
        ("MERCH-APOLLO-006", "Apollo Pharmacy Ltd", "apollopharmacy@hdfcbank", "Health & Pharmacy", "5912", "VERIFIED_TIER1", "ED25519:APOLLO_RX_PUBK_2831", "All India"),
        ("MERCH-CHAIPOINT-007", "Chai Point Mountain Trail", "chaipoint@yesbank", "Cafe & Quick Bite", "5814", "VERIFIED_SME", "ED25519:CHAI_POINT_PUBK_6619", "Bangalore"),
        ("MERCH-AMAZONPAY-008", "Amazon Seller Services India", "amazonpay@apl", "E-Commerce", "5311", "VERIFIED_TIER1", "ED25519:AMZN_IN_PUBK_1092", "All India")
    ]
    
    for m in merchants:
        cursor.execute("""
        INSERT OR REPLACE INTO merchants 
        (id, brand_name, registered_vpa, category, mcc_code, verification_tier, terminal_public_key, city, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (*m, datetime.utcnow().isoformat()))
        
    conn.commit()
    conn.close()
    print("Seeded trusted merchants registry into SQLite.")

def seed_initial_audit_records():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM audit_records")
    if cursor.fetchone()[0] == 0:
        initial_records = [
            (
                "PSX-CTR-20261015-849201",
                "2026-10-15T15:32:10Z",
                "CONTRACT",
                "Amazon ₹5,000 Refund Promise vs Outgoing DEBIT",
                json.dumps({
                    "promise": {"direction": "CREDIT", "amount": 5000, "purpose": "REFUND", "claimed_entity": "Amazon India"},
                    "execution": {"direction": "DEBIT", "amount": 5000, "recipient_vpa": "amz.refund.desk@ybl"}
                }),
                98.5,
                "CRITICAL",
                "Fraudulent",
                "Reverse-Debit Collect Scam",
                "FAIL",
                "Direction Parity Check failed: Claimed ₹5,000 refund credit but execution was outgoing debit.",
                json.dumps([{"check": "Direction Parity", "status": "FAIL"}, {"check": "Merchant Registry", "status": "FAIL"}]),
                "Cybercrime Report Draft: Reverse-debit collect request fraud targeting Amazon refund."
            ),
            (
                "PSX-TXN-20261015-773192",
                "2026-10-15T16:04:45Z",
                "TRANSACTION",
                "Rapid Velocity Transfer ₹24,999 to Unverified VPA",
                json.dumps({"amount": 24999, "sender_avg": 800, "ratio": 31.2, "device_new": 1}),
                92.4,
                "CRITICAL",
                "Fraudulent",
                "Mule Velocity Laundering",
                "N/A",
                "XGBoost model identified 31x amount deviation spike from new device.",
                json.dumps([{"feature": "Amount Deviation", "weight": 35.0}]),
                None
            ),
            (
                "PSX-MSG-20261015-661029",
                "2026-10-15T16:18:22Z",
                "MESSAGE",
                "Electricity Disconnection Notice: Aaj raat 9:30 baje bijli cut...",
                json.dumps({"text": "Dear consumer your electricity power will be disconnected tonight...", "language": "Hinglish"}),
                94.0,
                "CRITICAL",
                "Fraudulent",
                "Electricity Disconnection Phishing",
                "N/A",
                "Identified high-urgency psychological coercion vector and unauthorized helpline number.",
                json.dumps([{"tactic": "Artificial Urgency"}, {"tactic": "Fear Intimidation"}]),
                None
            ),
            (
                "PSX-QRG-20261015-559103",
                "2026-10-15T16:45:00Z",
                "QR",
                "Starbucks Counter QR Swapped with Mule VPA",
                json.dumps({"claimed": "Tata Starbucks", "scanned_vpa": "raju.kumar78@okaxis"}),
                96.0,
                "CRITICAL",
                "Fraudulent",
                "Swapped QR Sticker Scam",
                "N/A",
                "Physical QR sticker swap detected: Brand claimed Starbucks but QR paid personal mule.",
                json.dumps([{"check": "Merchant Registry Mismatch", "status": "FAIL"}]),
                None
            ),
            (
                "PSX-TXN-20261015-339182",
                "2026-10-15T17:01:12Z",
                "TRANSACTION",
                "Chai Point Afternoon Payment ₹140.00",
                json.dumps({"amount": 140, "merchant": "Chai Point", "direction": "DEBIT"}),
                4.2,
                "SAFE",
                "Legitimate",
                "Normal Legitimate Payment",
                "PASS",
                "Normal payment behavior to enrolled merchant Chai Point Bangalore.",
                json.dumps([{"feature": "Amount Alignment", "weight": -18.0}]),
                None
            )
        ]
        cursor.executemany("""
        INSERT OR REPLACE INTO audit_records
        (id, timestamp, analysis_type, input_summary, full_payload, risk_score, risk_tier, prediction, category, contract_verdict, explanation, evidence_flags, police_draft)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_records)
        conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    seed_merchants()
