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

    # 3. ProofPay: Merchants
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS proofpay_merchants (
        merchant_id TEXT PRIMARY KEY,
        merchant_name TEXT NOT NULL,
        registered_vpa TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # 4. ProofPay: ChallengePay Merchant Orders
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS proofpay_orders (
        order_id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        customer_name TEXT,
        expected_amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        recipient_vpa TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        confirmed_reference TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_merchant ON proofpay_orders(merchant_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON proofpay_orders(status)")

    # 5. ProofPay: Authoritative Simulated Merchant Payment Ledger
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS proofpay_ledger (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        merchant_id TEXT NOT NULL,
        recipient_vpa TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        transaction_reference TEXT UNIQUE,
        transaction_timestamp TEXT NOT NULL,
        payment_status TEXT NOT NULL,
        settled_at TEXT,
        payment_provider TEXT NOT NULL,
        simulation_mode INTEGER DEFAULT 1
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_ref ON proofpay_ledger(transaction_reference)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_order ON proofpay_ledger(order_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_merchant ON proofpay_ledger(merchant_id)")

    # 6. ProofPay: Verifications & ReplayGuard Vault
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS proofpay_verifications (
        verification_id TEXT PRIMARY KEY,
        order_id TEXT,
        merchant_id TEXT NOT NULL,
        sha256_hash TEXT NOT NULL,
        phash TEXT NOT NULL,
        claimed_amount REAL,
        claimed_status TEXT,
        claimed_reference TEXT,
        claimed_sender TEXT,
        claimed_receiver TEXT,
        payment_app TEXT,
        visual_integrity TEXT NOT NULL,
        payment_verification TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        findings_json TEXT NOT NULL,
        anomaly_regions_json TEXT NOT NULL,
        forensic_metrics_json TEXT NOT NULL,
        explanation TEXT NOT NULL,
        tamper_audit_token TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_verif_sha ON proofpay_verifications(sha256_hash)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_verif_phash ON proofpay_verifications(phash)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_verif_ref ON proofpay_verifications(claimed_reference)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_verif_order ON proofpay_verifications(order_id)")
    
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

def seed_proofpay_data(reset: bool = False):
    conn = get_connection()
    cursor = conn.cursor()

    if reset:
        cursor.execute("DELETE FROM proofpay_merchants")
        cursor.execute("DELETE FROM proofpay_orders")
        cursor.execute("DELETE FROM proofpay_ledger")
        cursor.execute("DELETE FROM proofpay_verifications")

    # 1. Demo Merchants
    merchants = [
        ("MERCH-SBUX-01", "Starbucks Coffee India", "starbucks.pay@hdfcbank", "2026-10-01T08:00:00Z"),
        ("MERCH-CHAI-02", "Chai Point Bangalore", "chaipoint@yesbank", "2026-10-01T08:00:00Z"),
        ("MERCH-TECH-03", "Apex Digital Electronics", "apextech@icici", "2026-10-01T08:00:00Z")
    ]
    for m in merchants:
        cursor.execute("""
        INSERT OR REPLACE INTO proofpay_merchants (merchant_id, merchant_name, registered_vpa, created_at)
        VALUES (?, ?, ?, ?)
        """, m)

    # 2. ChallengePay Merchant Orders
    orders = [
        ("ORD-882391", "MERCH-SBUX-01", "Rahul Sharma", 8500.0, "INR", "starbucks.pay@hdfcbank", "PENDING", None, "2026-10-15T10:00:00Z", "2026-10-15T12:00:00Z"),
        ("ORD-771201", "MERCH-SBUX-01", "Vikram Malhotra", 8500.0, "INR", "starbucks.pay@hdfcbank", "CONFIRMED", "428910293841", "2026-10-14T11:00:00Z", "2026-10-14T13:00:00Z"),
        ("ORD-554109", "MERCH-SBUX-01", "Anita Desai", 8500.0, "INR", "starbucks.pay@hdfcbank", "PENDING", None, "2026-10-15T10:30:00Z", "2026-10-15T12:30:00Z"),
        ("ORD-332918", "MERCH-CHAI-02", "Priya Rao", 140.0, "INR", "chaipoint@yesbank", "PENDING", None, "2026-10-15T11:00:00Z", "2026-10-15T13:00:00Z")
    ]
    for o in orders:
        cursor.execute("""
        INSERT OR REPLACE INTO proofpay_orders 
        (order_id, merchant_id, customer_name, expected_amount, currency, recipient_vpa, status, confirmed_reference, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, o)

    # 3. Authoritative Simulated Merchant Ledger Entries
    ledger_entries = [
        # Scenario B ledger record (Yesterday's real fulfilled payment)
        ("LEDGER-TX-B201", "ORD-771201", "MERCH-SBUX-01", "starbucks.pay@hdfcbank", 8500.0, "INR", "428910293841", "2026-10-14T11:15:22Z", "SUCCESS", "2026-10-14T11:15:25Z", "HDFC_MERCHANT_RAIL", 1),
        
        # Scenario D ledger record (Genuine match for ORD-882391)
        ("LEDGER-TX-D401", "ORD-882391", "MERCH-SBUX-01", "starbucks.pay@hdfcbank", 8500.0, "INR", "429981273910", "2026-10-15T10:14:02Z", "SUCCESS", "2026-10-15T10:14:05Z", "HDFC_MERCHANT_RAIL", 1),
        
        # Scenario E ledger record (Pending settlement)
        ("LEDGER-TX-E501", "ORD-554109", "MERCH-SBUX-01", "starbucks.pay@hdfcbank", 8500.0, "INR", "429981273955", "2026-10-15T10:31:18Z", "PENDING", None, "HDFC_MERCHANT_RAIL", 1),
        
        # Scenario A ledger record (Merchant only received ₹850, not ₹8,500!)
        ("LEDGER-TX-A101", "ORD-110294", "MERCH-SBUX-01", "starbucks.pay@hdfcbank", 850.0, "INR", "429981273988", "2026-10-15T09:45:10Z", "SUCCESS", "2026-10-15T09:45:12Z", "HDFC_MERCHANT_RAIL", 1)
    ]
    for le in ledger_entries:
        cursor.execute("""
        INSERT OR REPLACE INTO proofpay_ledger 
        (id, order_id, merchant_id, recipient_vpa, amount, currency, transaction_reference, transaction_timestamp, payment_status, settled_at, payment_provider, simulation_mode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, le)

    # 4. Seed an existing verification proof for ReplayGuard demo (Scenario B)
    cursor.execute("SELECT COUNT(*) FROM proofpay_verifications WHERE claimed_reference = '428910293841'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO proofpay_verifications 
        (verification_id, order_id, merchant_id, sha256_hash, phash, claimed_amount, claimed_status, claimed_reference, claimed_sender, claimed_receiver, payment_app, visual_integrity, payment_verification, recommended_action, findings_json, anomaly_regions_json, forensic_metrics_json, explanation, tamper_audit_token, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "VRF-HIST-20261014-001",
            "ORD-771201",
            "MERCH-SBUX-01",
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "a1b2c3d4e5f60718",
            8500.0,
            "SUCCESS",
            "428910293841",
            "Vikram Malhotra",
            "Starbucks Coffee",
            "Google Pay",
            "NO_OBVIOUS_ANOMALIES",
            "CONFIRMED",
            "FULFILL_ORDER",
            json.dumps([{"engine": "merchant_ledger", "severity": "info", "message": "Matched ledger record LEDGER-TX-B201"}]),
            json.dumps([]),
            json.dumps({"ela_max_delta": 4.2, "noise_variance": 12.1}),
            "Authentic transaction confirmed yesterday against order ORD-771201.",
            "SHA256:PROOFAUDIT_HASHCHAIN_771201",
            "2026-10-14T11:16:00Z"
        ))

    conn.commit()
    conn.close()
    print("ProofPay demo merchants, orders, and ledger entries seeded successfully.")

if __name__ == "__main__":
    init_db()
    seed_merchants()
    seed_proofpay_data()
