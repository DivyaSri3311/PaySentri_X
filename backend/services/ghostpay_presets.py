"""
PaySentriX GhostPay Demo Presets & Synthetic Test Fixtures.
Provides realistic payment confirmation screenshots and test scenarios
for instant interactive testing and demonstrations.
"""

import io
import base64
from typing import Dict, Any, List
from PIL import Image, ImageDraw, ImageFont


def _generate_synthetic_receipt_image(
    app_brand: str = "PhonePe",
    status_text: str = "Payment Successful",
    amount_str: str = "₹ 350.00",
    recipient_name: str = "Chai Point Mountain Trail",
    recipient_vpa: str = "chaipoint@yesbank",
    utr_str: str = "UPI Ref ID: 430198274192",
    date_str: str = "15 Oct 2026, 07:15 PM",
    is_spoof: bool = False,
    is_blurry: bool = False
) -> str:
    """
    Generates a realistic mobile payment confirmation graphic in base64.
    """
    # Dimensions typical of smartphone receipt card
    width, height = 380, 680
    bg_color = "#f8fafc" if not is_blurry else "#475569"
    img = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    if is_blurry:
        # Generate noisy/unreadable fragment
        for i in range(0, width, 10):
            draw.line([(i, 0), (i, height)], fill="#64748b", width=3)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=20)
        return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"

    # Header banner color by app
    header_color = "#5f259f" if app_brand == "PhonePe" else ("#00b9f5" if app_brand == "Paytm" else "#1a73e8")
    if is_spoof:
        header_color = "#dc2626"

    # Header
    draw.rectangle([(0, 0), (width, 140)], fill=header_color)

    # App brand pill
    draw.rectangle([(24, 24), (140, 52)], fill="#ffffff")
    draw.text((36, 32), app_brand, fill="#0f172a")

    # Status
    draw.text((24, 75), status_text, fill="#ffffff")
    draw.text((24, 105), date_str, fill="#e2e8f0")

    # Card Body
    draw.rectangle([(16, 155), (width - 16, height - 30)], fill="#ffffff", outline="#e2e8f0", width=1)

    # Checkmark circle
    check_color = "#10b981" if not is_spoof else "#ef4444"
    draw.ellipse([(width // 2 - 28, 175), (width // 2 + 28, 231)], fill=check_color)
    draw.text((width // 2 - 6, 193), "✓" if not is_spoof else "!", fill="#ffffff")

    # Amount
    draw.text((width // 2 - 60, 250), amount_str, fill="#0f172a")

    # Divider
    draw.line([(32, 305), (width - 32, 305)], fill="#f1f5f9", width=2)

    # Details
    draw.text((32, 325), "Paid to:", fill="#64748b")
    draw.text((32, 348), recipient_name[:30], fill="#0f172a")
    draw.text((32, 372), f"UPI ID: {recipient_vpa}", fill="#64748b")

    draw.line([(32, 410), (width - 32, 410)], fill="#f1f5f9", width=2)

    draw.text((32, 430), "Transaction Details", fill="#64748b")
    draw.text((32, 455), utr_str, fill="#0f172a")
    draw.text((32, 480), "Payment Mode: UPI Application", fill="#64748b")

    if is_spoof:
        draw.rectangle([(32, 520), (width - 32, 560)], fill="#fef2f2", outline="#fecaca")
        draw.text((42, 532), "Demo Spoof Watermark: PixelLab v4.2", fill="#b91c1c")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"


GHOSTPAY_PRESETS = [
    {
        "id": "preset-paytm-spoof",
        "title": "Fake Paytm Spoof App (Amount & Recipient Mismatch)",
        "tag": "Spoof App Fraud",
        "badge": "Critical Risk",
        "description": "Customer presents a simulated payment screenshot for ₹1,200 to an arbitrary payee, but shopkeeper expected ₹1,800 to 'Chai Point'.",
        "expected_amount": 1800.0,
        "expected_recipient_name": "Chai Point Mountain Trail",
        "expected_vpa": "chaipoint@yesbank",
        "expected_utr": "428900112233",
        "approx_payment_time": "15 Oct 2026, 07:15 PM",
        "merchant_confirmed_credit": False,
        "image_base64": _generate_synthetic_receipt_image(
            app_brand="Paytm",
            status_text="Paid Successfully",
            amount_str="₹ 1,200.00",
            recipient_name="Sharma Tea Corner (Unverified)",
            recipient_vpa="sharma99@paytm",
            utr_str="UPI Ref: 99128374",  # Malformed 8-digit UTR
            is_spoof=True
        )
    },
    {
        "id": "preset-recycled-utr",
        "title": "Recycled UTR / Replay Attack",
        "tag": "Duplicate Screenshot",
        "badge": "High Risk",
        "description": "Customer re-displays a real-looking screenshot whose UTR reference (428901234567) was already logged in a prior transaction.",
        "expected_amount": 450.0,
        "expected_recipient_name": "Chai Point Mountain Trail",
        "expected_vpa": "chaipoint@yesbank",
        "expected_utr": "428901234567",
        "approx_payment_time": "15 Oct 2026, 06:45 PM",
        "merchant_confirmed_credit": False,
        "image_base64": _generate_synthetic_receipt_image(
            app_brand="Google Pay",
            status_text="Paid to Chai Point",
            amount_str="₹ 450.00",
            recipient_name="Chai Point Mountain Trail",
            recipient_vpa="chaipoint@yesbank",
            utr_str="UPI Ref: 428901234567"
        )
    },
    {
        "id": "preset-unsettled-claim",
        "title": "Authentic PhonePe Screenshot (Unsettled Claim)",
        "tag": "Unverified Claim",
        "badge": "Unverified",
        "description": "Legitimate-looking screenshot with matching ₹350 and valid 12-digit UTR, but shopkeeper has not yet verified fund credit in their bank.",
        "expected_amount": 350.0,
        "expected_recipient_name": "Chai Point Mountain Trail",
        "expected_vpa": "chaipoint@yesbank",
        "expected_utr": "430198274192",
        "approx_payment_time": "15 Oct 2026, 07:15 PM",
        "merchant_confirmed_credit": False,
        "image_base64": _generate_synthetic_receipt_image(
            app_brand="PhonePe",
            status_text="Payment Successful",
            amount_str="₹ 350.00",
            recipient_name="Chai Point Mountain Trail",
            recipient_vpa="chaipoint@yesbank",
            utr_str="UPI Ref ID: 430198274192"
        )
    },
    {
        "id": "preset-merchant-settled",
        "title": "Bank-Confirmed Settlement",
        "tag": "Verified Settlement",
        "badge": "Verified Safe",
        "description": "Payment receipt where the shopkeeper has cross-referenced their bank SMS / soundbox and checked 'Independently Confirmed Credit'.",
        "expected_amount": 500.0,
        "expected_recipient_name": "Tata Starbucks Pvt Ltd",
        "expected_vpa": "starbucks.pay@hdfcbank",
        "expected_utr": "431200984112",
        "approx_payment_time": "15 Oct 2026, 07:20 PM",
        "merchant_confirmed_credit": True,
        "image_base64": _generate_synthetic_receipt_image(
            app_brand="Google Pay",
            status_text="Paid to Tata Starbucks",
            amount_str="₹ 500.00",
            recipient_name="Tata Starbucks Pvt Ltd",
            recipient_vpa="starbucks.pay@hdfcbank",
            utr_str="UPI Ref: 431200984112"
        )
    },
    {
        "id": "preset-blurry-camera",
        "title": "Unreadable Low-Light Camera Photo",
        "tag": "Camera Anomaly",
        "badge": "Insufficient Evidence",
        "description": "Heavily blurred or corrupted camera capture where text cannot be extracted with confidence.",
        "expected_amount": 250.0,
        "expected_recipient_name": "Chai Point Mountain Trail",
        "expected_vpa": "chaipoint@yesbank",
        "expected_utr": "",
        "approx_payment_time": "15 Oct 2026",
        "merchant_confirmed_credit": False,
        "image_base64": _generate_synthetic_receipt_image(is_blurry=True)
    }
]

PRESET_EXTRACTIONS = {
    "preset-paytm-spoof": {
        "is_payment_screen": True,
        "payment_status": "SUCCESS",
        "amount": 1200.0,
        "currency": "INR",
        "recipient_name": "Sharma Tea Corner (Unverified)",
        "recipient_vpa": "sharma99@paytm",
        "sender_name": "Customer",
        "sender_vpa": "cust8812@paytm",
        "utr_number": "99128374",  # Non-standard 8-digit UTR
        "payment_app": "Paytm Spoof",
        "timestamp_text": "15 Oct 2026, 07:15 PM",
        "visual_anomalies": [
            "Non-standard 8-digit UPI reference number (standard is 12 digits)",
            "PixelLab v4.2 editing software signature detected",
            "Font weight in amount field deviates from official Paytm app guidelines"
        ],
        "ocr_confidence": 0.94,
        "forensic_notes": "Signs of simulated spoof APK interface with mismatched payee and invalid UTR length."
    },
    "preset-recycled-utr": {
        "is_payment_screen": True,
        "payment_status": "SUCCESS",
        "amount": 450.0,
        "currency": "INR",
        "recipient_name": "Chai Point Mountain Trail",
        "recipient_vpa": "chaipoint@yesbank",
        "sender_name": "Customer",
        "sender_vpa": "cust9912@oksbi",
        "utr_number": "428901234567",
        "payment_app": "Google Pay",
        "timestamp_text": "15 Oct 2026, 06:45 PM",
        "visual_anomalies": [],
        "ocr_confidence": 0.96,
        "forensic_notes": "Screenshot visual syntax is clean, but UTR matches an already logged transaction."
    },
    "preset-unsettled-claim": {
        "is_payment_screen": True,
        "payment_status": "SUCCESS",
        "amount": 350.0,
        "currency": "INR",
        "recipient_name": "Chai Point Mountain Trail",
        "recipient_vpa": "chaipoint@yesbank",
        "sender_name": "Customer",
        "sender_vpa": "payer77@ybl",
        "utr_number": "430198274192",
        "payment_app": "PhonePe",
        "timestamp_text": "15 Oct 2026, 07:15 PM",
        "visual_anomalies": [],
        "ocr_confidence": 0.98,
        "forensic_notes": "Visually genuine PhonePe receipt. However, no direct bank settlement confirmation is attached."
    },
    "preset-merchant-settled": {
        "is_payment_screen": True,
        "payment_status": "SUCCESS",
        "amount": 500.0,
        "currency": "INR",
        "recipient_name": "Tata Starbucks Pvt Ltd",
        "recipient_vpa": "starbucks.pay@hdfcbank",
        "sender_name": "Verified Customer",
        "sender_vpa": "cust.corp@okhdfc",
        "utr_number": "431200984112",
        "payment_app": "Google Pay",
        "timestamp_text": "15 Oct 2026, 07:20 PM",
        "visual_anomalies": [],
        "ocr_confidence": 0.99,
        "forensic_notes": "Valid Google Pay confirmation, cross-referenced with merchant-confirmed bank deposit."
    },
    "preset-blurry-camera": {
        "is_payment_screen": False,
        "payment_status": "UNKNOWN",
        "amount": None,
        "currency": "INR",
        "recipient_name": None,
        "recipient_vpa": None,
        "sender_name": None,
        "sender_vpa": None,
        "utr_number": None,
        "payment_app": "Unknown",
        "timestamp_text": None,
        "visual_anomalies": [
            "Severe optical blur and camera sensor noise",
            "Insufficient edge definition to extract alphanumeric characters"
        ],
        "ocr_confidence": 0.12,
        "forensic_notes": "Image resolution and contrast insufficient for defensible forensic determination."
    }
}


def get_ghostpay_presets() -> List[Dict[str, Any]]:
    return GHOSTPAY_PRESETS
