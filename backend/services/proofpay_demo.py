"""
ProofPay CyberCup 6.0 Demo Lab & Synthetic Test Fixture Generator.
Generates realistic programmatic payment receipts for the 5 official demonstration scenarios:
- Scenario A: Fake Amount Screenshot (Claimed ₹8,500 vs Ledger ₹850)
- Scenario B: Genuine Screenshot Replay (Legitimate ₹8,500 proof re-used for new order)
- Scenario C: Wrong Merchant (Payment routed to incorrect beneficiary)
- Scenario D: Genuine Successful Payment (All parameters match authoritative ledger)
- Scenario E: Pending Settlement (Screenshot claims success but ledger is PENDING)
"""

import io
import base64
from typing import Dict, Any, List
from PIL import Image, ImageDraw, ImageFont


def create_synthetic_upi_receipt(
    status: str = "Paid Successfully",
    amount_str: str = "₹8,500.00",
    utr: str = "429981273910",
    receiver_name: str = "Starbucks Coffee India",
    receiver_vpa: str = "starbucks.pay@hdfcbank",
    app_brand: str = "Google Pay",
    timestamp_str: str = "15 Oct 2026, 10:14 AM",
    inject_artifact: bool = False
) -> bytes:
    """Generates a clean synthetic UPI payment receipt image using Pillow."""
    width, height = 480, 720
    # Background: clean mobile dark/light navy
    img = Image.new("RGB", (width, height), color=(14, 22, 41))
    draw = ImageDraw.Draw(img)

    # Top app branding bar
    draw.rectangle([(0, 0), (width, 60)], fill=(20, 31, 56))
    draw.text((24, 20), f"{app_brand} • Payment Receipt", fill=(147, 197, 253))

    # Center Card
    draw.rounded_rectangle([(24, 80), (width - 24, height - 40)], radius=18, fill=(23, 37, 68), outline=(59, 130, 246), width=1)

    # Success checkmark circle
    circle_center = (width // 2, 140)
    circle_color = (16, 185, 129) if "Success" in status or "Paid" in status else (245, 158, 11)
    draw.ellipse([(circle_center[0] - 32, circle_center[1] - 32), (circle_center[0] + 32, circle_center[1] + 32)], fill=circle_color)
    draw.text((circle_center[0] - 12, circle_center[1] - 14), "✓", fill=(255, 255, 255))

    # Status text
    draw.text((width // 2 - 65, 190), status, fill=(255, 255, 255))

    # Amount (Prominent)
    draw.text((width // 2 - 75, 230), amount_str, fill=(255, 255, 255))

    # Divider
    draw.line([(50, 290), (width - 50, 290)], fill=(40, 60, 100), width=1)

    # Details rows
    details = [
        ("To", receiver_name),
        ("UPI ID", receiver_vpa),
        ("Date & Time", timestamp_str),
        ("UPI Ref No (UTR)", utr),
        ("Payment Mode", "UPI Direct Bank Debit"),
        ("Bank Response", "Transaction Approved by Beneficiary")
    ]

    y_cursor = 310
    for label, val in details:
        draw.text((50, y_cursor), label, fill=(148, 163, 184))
        draw.text((50, y_cursor + 20), val, fill=(255, 255, 255))
        y_cursor += 55

    # Embed metadata comment in JPEG for deterministic local fallback extractors
    import json
    clean_amt = 8500.0
    try:
        clean_amt = float(amount_str.replace("₹", "").replace(",", "").strip())
    except Exception:
        pass

    comment_payload = json.dumps({
        "utr": utr,
        "amount": clean_amt,
        "receiver_name": receiver_name,
        "receiver_vpa": receiver_vpa,
        "status": "SUCCESS" if ("Success" in status or "Paid" in status) else "PENDING",
        "app_brand": app_brand,
        "timestamp": timestamp_str
    })

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92, comment=comment_payload)
    return buf.getvalue()


class ProofPayDemoScenarios:
    def get_all_scenarios(self) -> List[Dict[str, Any]]:
        """Returns the 5 official CyberCup demonstration scenarios."""
        # Scenario A: Fake Amount (Claimed ₹8,500, but ledger has ₹850)
        img_a = create_synthetic_upi_receipt(
            amount_str="₹8,500.00",
            utr="429981273988",
            inject_artifact=True
        )

        # Scenario B: Genuine Screenshot Replay (Yesterday's UTR 428910293841)
        img_b = create_synthetic_upi_receipt(
            amount_str="₹8,500.00",
            utr="428910293841",
            timestamp_str="14 Oct 2026, 11:15 AM"
        )

        # Scenario C: Wrong Merchant (Paid to fraudster.mule@ybl)
        img_c = create_synthetic_upi_receipt(
            amount_str="₹8,500.00",
            receiver_name="Personal Account Raju",
            receiver_vpa="fraudster.mule@ybl",
            utr="429981273977"
        )

        # Scenario D: Genuine Successful Payment (Matches ledger ORD-882391)
        img_d = create_synthetic_upi_receipt(
            amount_str="₹8,500.00",
            utr="429981273910",
            receiver_name="Starbucks Coffee India",
            receiver_vpa="starbucks.pay@hdfcbank"
        )

        # Scenario E: Pending Payment (Ledger indicates PENDING)
        img_e = create_synthetic_upi_receipt(
            status="Payment Processing",
            amount_str="₹8,500.00",
            utr="429981273955"
        )

        return [
            {
                "id": "scenario_a_fake_amount",
                "title": "Scenario A: Fake Amount Screenshot",
                "description": "Customer edited a payment screenshot to claim ₹8,500 was paid. Authoritative merchant ledger only received ₹850.",
                "expected_visual": "SUSPICIOUS_ANOMALIES / INCONCLUSIVE",
                "expected_ledger": "MISMATCHED / NOT_FOUND",
                "order_id": "ORD-882391",
                "expected_amount": 8500.0,
                "recipient_vpa": "starbucks.pay@hdfcbank",
                "claimed_amount": 8500.0,
                "image_base64": f"data:image/jpeg;base64,{base64.b64encode(img_a).decode()}",
                "tag": "Tampered Amount"
            },
            {
                "id": "scenario_b_replay_attack",
                "title": "Scenario B: Genuine Screenshot Replay",
                "description": "Customer shows an authentic ₹8,500 receipt from yesterday (Order ORD-771201) to falsely claim a new purchase today.",
                "expected_visual": "NO_OBVIOUS_ANOMALIES",
                "expected_ledger": "UNVERIFIED (REPLAYGUARD BLOCKED)",
                "order_id": "ORD-882391",
                "expected_amount": 8500.0,
                "recipient_vpa": "starbucks.pay@hdfcbank",
                "claimed_amount": 8500.0,
                "image_base64": f"data:image/jpeg;base64,{base64.b64encode(img_b).decode()}",
                "tag": "Replay Attack"
            },
            {
                "id": "scenario_c_wrong_merchant",
                "title": "Scenario C: Wrong Merchant Beneficiary",
                "description": "Screenshot claims ₹8,500 was sent, but funds were routed to 'fraudster.mule@ybl' instead of the enrolled merchant VPA.",
                "expected_visual": "NO_OBVIOUS_ANOMALIES",
                "expected_ledger": "MISMATCHED (RECIPIENT MISMATCH)",
                "order_id": "ORD-882391",
                "expected_amount": 8500.0,
                "recipient_vpa": "starbucks.pay@hdfcbank",
                "claimed_amount": 8500.0,
                "image_base64": f"data:image/jpeg;base64,{base64.b64encode(img_c).decode()}",
                "tag": "Recipient Mismatch"
            },
            {
                "id": "scenario_d_genuine_verified",
                "title": "Scenario D: Genuine Successful Payment",
                "description": "Legitimate payment: order, amount (₹8,500), recipient VPA, and UTR reference match the merchant's authoritative ledger.",
                "expected_visual": "NO_OBVIOUS_ANOMALIES",
                "expected_ledger": "CONFIRMED",
                "order_id": "ORD-882391",
                "expected_amount": 8500.0,
                "recipient_vpa": "starbucks.pay@hdfcbank",
                "claimed_amount": 8500.0,
                "image_base64": f"data:image/jpeg;base64,{base64.b64encode(img_d).decode()}",
                "tag": "Legitimate"
            },
            {
                "id": "scenario_e_pending_settlement",
                "title": "Scenario E: Pending Bank Settlement",
                "description": "Customer shows a receipt claiming success, but the merchant bank rail reports payment settlement is still PENDING.",
                "expected_visual": "NO_OBVIOUS_ANOMALIES",
                "expected_ledger": "PENDING (HOLD GOODS)",
                "order_id": "ORD-554109",
                "expected_amount": 8500.0,
                "recipient_vpa": "starbucks.pay@hdfcbank",
                "claimed_amount": 8500.0,
                "image_base64": f"data:image/jpeg;base64,{base64.b64encode(img_e).decode()}",
                "tag": "Pending Clearing"
            }
        ]

demo_scenarios_provider = ProofPayDemoScenarios()
