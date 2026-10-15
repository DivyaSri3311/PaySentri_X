"""
PaySentriX Synthetic UPI Fraud and Threat Intelligence Dataset Generator.
Generates realistic Indian UPI transaction patterns, reverse-debit lures,
multilingual (English, Hindi, Hinglish) fraud messages, and baseline evaluations.
"""

import os
import random
import json
import numpy as np
import pandas as pd

random.seed(42)
np.random.seed(42)

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_transaction_dataset(n_samples: int = 15000):
    """
    Generate synthetic UPI transactions with realistic statistical characteristics:
    Genuine payments vs. reverse-debit, collect request traps, mule laundering, etc.
    """
    records = []
    
    # 88% genuine, 12% fraud distribution (typical realistic UPI baseline)
    n_fraud = int(n_samples * 0.12)
    n_genuine = n_samples - n_fraud
    
    # 1. Genuine Transactions
    for _ in range(n_genuine):
        amount = round(float(np.random.exponential(scale=450) + 15), 2)
        if amount > 10000:
            amount = round(random.uniform(500, 3500), 2)
        
        hour_probs = np.array([
            0.01, 0.01, 0.01, 0.01, 0.01, 0.02, # 0-5 AM
            0.04, 0.06, 0.08, 0.09, 0.08, 0.08, # 6-11 AM
            0.07, 0.06, 0.06, 0.06, 0.07, 0.08, # 12-5 PM
            0.08, 0.08, 0.07, 0.05, 0.03, 0.02  # 6-11 PM
        ], dtype=float)
        hour_probs = hour_probs / hour_probs.sum()
        hour = int(np.random.choice(range(24), p=hour_probs))
        
        sender_prev_tx = random.randint(10, 450)
        sender_avg_amt = round(max(50.0, amount * random.uniform(0.6, 1.8)), 2)
        ratio = round(amount / sender_avg_amt, 3)
        recipient_is_new = 1 if random.random() < 0.22 else 0
        recipient_risk_flag = 0
        is_night = 1 if (hour >= 23 or hour <= 5) else 0
        is_quick_retry = 1 if random.random() < 0.03 else 0
        device_is_new = 1 if random.random() < 0.05 else 0
        device_rooted = 0
        direction_is_debit = 1 if random.random() < 0.65 else 0
        is_collect_request = 1 if (direction_is_debit == 0 and random.random() < 0.04) else 0
        merchant_mcc_risk = 0 if random.random() < 0.92 else 1
        urgency_note = 0
        
        records.append({
            "amount": amount,
            "hour_of_day": hour,
            "sender_prev_tx_count": sender_prev_tx,
            "sender_avg_amount": sender_avg_amt,
            "amount_to_avg_ratio": ratio,
            "recipient_is_new": recipient_is_new,
            "recipient_risk_flag": recipient_risk_flag,
            "is_night_transaction": is_night,
            "is_quick_retry": is_quick_retry,
            "device_is_new": device_is_new,
            "device_rooted": device_rooted,
            "direction_is_debit": direction_is_debit,
            "is_collect_request": is_collect_request,
            "merchant_mcc_risk": merchant_mcc_risk,
            "urgency_keyword_in_note": urgency_note,
            "label": 0,
            "fraud_type": "Legitimate"
        })
        
    # 2. Fraudulent Transactions
    fraud_types = [
        ("Reverse-Debit Collect Scam", 0.35),
        ("Fake KYC Account Takeover", 0.25),
        ("Electricity Bill Phishing", 0.15),
        ("Unverified Mule Velocity", 0.15),
        ("Swapped QR High-Value", 0.10)
    ]
    
    for ftype, weight in fraud_types:
        count = int(n_fraud * weight)
        for _ in range(count):
            if ftype == "Reverse-Debit Collect Scam":
                amount = round(random.choice([2000, 4999, 5000, 9999, 10000, 24999, 49999]), 2)
                hour = random.randint(8, 22)
                sender_prev_tx = random.randint(1, 20)
                sender_avg_amt = round(random.uniform(200, 1200), 2)
                ratio = round(amount / sender_avg_amt, 3)
                recipient_is_new = 1
                recipient_risk_flag = 1 if random.random() < 0.8 else 0
                is_night = 0
                is_quick_retry = 1 if random.random() < 0.4 else 0
                device_is_new = 1 if random.random() < 0.6 else 0
                device_rooted = 0
                direction_is_debit = 1 # Scam forces victim to DEBIT while promising refund
                is_collect_request = 1
                merchant_mcc_risk = 2
                urgency_note = 1
            elif ftype == "Fake KYC Account Takeover":
                amount = round(random.uniform(8000, 95000), 2)
                hour = random.choice([1, 2, 3, 4, 23, 14, 15])
                sender_prev_tx = random.randint(0, 5)
                sender_avg_amt = round(random.uniform(500, 2000), 2)
                ratio = round(amount / sender_avg_amt, 3)
                recipient_is_new = 1
                recipient_risk_flag = 1
                is_night = 1 if hour in [1, 2, 3, 4, 23] else 0
                is_quick_retry = 1
                device_is_new = 1
                device_rooted = 1 if random.random() < 0.35 else 0
                direction_is_debit = 1
                is_collect_request = 0
                merchant_mcc_risk = 2
                urgency_note = 1
            elif ftype == "Electricity Bill Phishing":
                amount = round(random.uniform(1500, 24000), 2)
                hour = random.choice([20, 21, 22, 23]) # Night disconnection panic
                sender_prev_tx = random.randint(15, 60)
                sender_avg_amt = round(random.uniform(300, 1500), 2)
                ratio = round(amount / sender_avg_amt, 3)
                recipient_is_new = 1
                recipient_risk_flag = 1
                is_night = 1 if hour in [22, 23] else 0
                is_quick_retry = 0
                device_is_new = 0
                device_rooted = 0
                direction_is_debit = 1
                is_collect_request = 0
                merchant_mcc_risk = 1
                urgency_note = 1
            elif ftype == "Swapped QR High-Value":
                amount = round(random.uniform(3000, 50000), 2)
                hour = random.randint(11, 21)
                sender_prev_tx = random.randint(25, 200)
                sender_avg_amt = round(random.uniform(250, 1000), 2)
                ratio = round(amount / sender_avg_amt, 3)
                recipient_is_new = 1
                recipient_risk_flag = 1
                is_night = 0
                is_quick_retry = 0
                device_is_new = 0
                device_rooted = 0
                direction_is_debit = 1
                is_collect_request = 0
                merchant_mcc_risk = 2
                urgency_note = 0
            else: # Mule Velocity
                amount = round(random.uniform(4900, 49999), 2)
                hour = random.randint(0, 23)
                sender_prev_tx = random.randint(1, 10)
                sender_avg_amt = round(random.uniform(400, 1500), 2)
                ratio = round(amount / sender_avg_amt, 3)
                recipient_is_new = 1
                recipient_risk_flag = 1
                is_night = 1 if (hour <= 5 or hour >= 23) else 0
                is_quick_retry = 1
                device_is_new = 1
                device_rooted = 0
                direction_is_debit = 1
                is_collect_request = 0
                merchant_mcc_risk = 2
                urgency_note = 1
                
            records.append({
                "amount": amount,
                "hour_of_day": hour,
                "sender_prev_tx_count": sender_prev_tx,
                "sender_avg_amount": sender_avg_amt,
                "amount_to_avg_ratio": ratio,
                "recipient_is_new": recipient_is_new,
                "recipient_risk_flag": recipient_risk_flag,
                "is_night_transaction": is_night,
                "is_quick_retry": is_quick_retry,
                "device_is_new": device_is_new,
                "device_rooted": device_rooted,
                "direction_is_debit": direction_is_debit,
                "is_collect_request": is_collect_request,
                "merchant_mcc_risk": merchant_mcc_risk,
                "urgency_keyword_in_note": urgency_note,
                "label": 1,
                "fraud_type": ftype
            })

    df = pd.DataFrame(records)
    # Shuffle
    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    df.to_csv(os.path.join(DATA_DIR, "synthetic_upi_transactions.csv"), index=False)
    print(f"Generated {len(df)} transactions -> Saved to synthetic_upi_transactions.csv")
    return df

def generate_multilingual_message_corpus():
    """
    Curated realistic Indian UPI threat corpus covering English, Hindi, and Hinglish.
    Covers KYC, Electricity, Digital Arrest, Refunds, Lottery, Jobs, and Genuine messages.
    """
    scam_messages = [
        # Hindi / Hinglish KYC
        ("Aapka SBI YONO account block ho gaya hai. Turant KYC update karein warna 24 ghante me band ho jayega: http://sbi-kyc-update.in", "Fake KYC", "Hinglish"),
        ("Priy Grahak, aapka bank khata aadhar se link nahi hai. Turant pan card update kare aur 1 rupaye verify kare: https://pnb-verify.xyz", "Fake KYC", "Hinglish"),
        ("Dear Customer, Your SBI NetBanking has been deactivated. Please update your PAN Card immediately to avoid block: https://sbi-pan-support.top", "Fake KYC", "English"),
        ("Aapka HDFC credit card reward points expire ho rahe hai. ₹9,450 redeem karne ke liye turant link kholein: https://hdfc-rewards-claim.club", "Lottery / Reward", "Hinglish"),
        
        # Electricity & Utility scams
        ("Dear consumer, your electricity power will be disconnected tonight at 9:30 PM from electricity office because your previous month bill was not updated. Please immediately contact our electricity officer at 9876543210. BESCOM", "Electricity Bill", "English"),
        ("Priya grahak, aaj raat 9:30 baje aapki bijli kaat di jayegi kyunki pichhla bill jama nahi hai. Turant call kare 8912345678 par: bijli vibhag", "Electricity Bill", "Hinglish"),
        ("Alert! Your Tata Power connection scheduled for disconnection in 2 hours. Pay pending dues of Rs 140 immediately or power cut. Officer: 9811223344", "Electricity Bill", "English"),
        ("Bijli bill pending hai. Turant pay kare aur disconnection roke. Contact electricity helpline 9765432109", "Electricity Bill", "Hinglish"),
        
        # Digital Arrest & Authority Impersonation
        ("TRAI & Delhi Cyber Police: Your Aadhaar linked mobile number is involved in 17 illegal money laundering cases. An arrest warrant has been issued. Press 1 to connect with DCP Officer immediately.", "Digital Arrest", "English"),
        ("Supreme Court of India & CBI Notice: You are found guilty under Section 420. Video call investigation begins in 15 mins. Do not disconnect or local police will reach your address.", "Digital Arrest", "English"),
        ("Mumbai Cyber Cell: Aapke aadhar par illegal SIM chal rahi hai. CBI case register ho chuka hai. Turant online verification ke liye hazir ho.", "Digital Arrest", "Hinglish"),
        ("Customs Department: An international courier containing narcotics and fake passports detained in your name. Pay clearing deposit immediately to avoid custody.", "Digital Arrest", "English"),
        
        # Reverse-Debit & Refund Scams
        ("Congratulations! Your Amazon refund of Rs 5,000 has been approved. Click here to receive the refund in your bank: upi://pay?pa=refund-agent98@ybl&am=5000", "Reverse-Debit", "English"),
        ("Sir aapka Meesho order cancel ho gaya tha, ₹1,850 refund pane ke liye phonepe par QR scan kare aur PIN dale.", "Reverse-Debit", "Hinglish"),
        ("Google Pay Scratch Card: You won ₹3,500 cashback! Tap here and enter your UPI PIN to claim money into your bank a/c.", "Reverse-Debit", "English"),
        ("OLX Buyer: I am sending ₹15,000 advance for your sofa. Scan this QR code and approve request to get payment in your account.", "Reverse-Debit", "English"),
        ("Flipkart return request: Aapko 4,200 rupaye wapas lene ke liye collect request approve karni hogi.", "Reverse-Debit", "Hinglish"),
        
        # Job / Part-time Task Fraud
        ("Work from home: Earn ₹3,000 to ₹8,000 daily by just liking YouTube videos and rating Google Maps hotels. Daily payout. WhatsApp now: 919876001122", "Job Scam", "English"),
        ("Amazon part time job offer. Roz 2 ghante mobile par kaam kare aur 5000 kamaye. Join our telegram channel t.me/amazon_parttime_tasks", "Job Scam", "Hinglish"),
        ("Pre-selected for overseas data entry job. Deposit ₹2,500 registration fee for laptop dispatch. 100% refund guarantee.", "Job Scam", "English"),
        
        # Fake Customer Care / Bank Call
        ("Dear SBI user, your debit card is blocked. Please share 6-digit OTP sent to your number to restore card operations instantly.", "Credential Phishing", "English"),
        ("Customer care calling from PhonePe. Aapka transaction fail ho gaya tha, hum helpline se bol rahe hai. TeamViewer QuickSupport app install kare.", "Remote Access", "Hinglish")
    ]
    
    genuine_messages = [
        ("Your A/c ending 4821 is credited with INR 3,200.00 on 14-Oct-26 by transfer from SHARMA R. Bal: INR 18,450.00 - HDFC Bank", "Bank Credit", "English"),
        ("Paid Rs 140.00 to Chai Point Bangalore on 15-Oct-26 via UPI. Ref No: 428910928374 - PhonePe", "Merchant Payment", "English"),
        ("Your OTP for Swiggy delivery login is 839201. Do not share your OTP with anyone, including delivery partners.", "OTP", "English"),
        ("Dear Customer, Your monthly broadband bill of Rs 825 for Account 10293847 is due on 22-Oct-26. Pay via Airtel Thanks App.", "Utility Reminder", "English"),
        ("Aapka Amazon package aaj deliver hone wala hai. Delivery agent contact: 9876501234. OTP ki zaroorat nahi hai.", "Delivery Update", "Hinglish"),
        ("Dear customer, Rs 50.00 debited from SBI A/c XX3910 on 15-Oct-26 towards Metro Card Recharge. Avail Bal Rs 12,300.00.", "Bank Debit", "English"),
        ("Your salary of INR 75,000.00 has been credited to your ICICI Bank A/c 0921 on 01-Oct-26. Narration: INFOSYS TECH LTD SAL.", "Salary Credit", "English"),
        ("Bhai maine party ka ₹450 Google Pay kar diya hai check kar lena.", "Peer-to-Peer", "Hinglish"),
        ("Your Uber ride fare is Rs 280.00. Receipt sent to your registered email. Thank you for riding with Uber.", "Transport Receipt", "English"),
        ("SBI Alert: An ATM withdrawal of Rs 2,000.00 was made on card ending 9012. If not you, call 1800111109 immediately.", "Bank Security", "English"),
        ("Doctor appointment confirmed with Dr. Mehta for tomorrow at 5:30 PM. Apollo Clinics Bangalore.", "Appointment", "English"),
        ("Mummy maine recharge kar diya hai 299 wala 1.5GB daily pack.", "Personal Message", "Hinglish")
    ]
    
    # Expand to a full corpus with variations
    corpus = []
    
    # Multipliers for robust training
    for text, cat, lang in scam_messages:
        for _ in range(35):
            # slight jitter / variants
            v_text = text
            if random.random() < 0.2:
                v_text = v_text.replace("immediate", "urgent").replace("turant", "jaldi")
            corpus.append({"text": v_text, "category": cat, "language": lang, "label": 1})
            
    for text, cat, lang in genuine_messages:
        for _ in range(60):
            v_text = text
            if random.random() < 0.3:
                v_text = v_text.replace("INR", "Rs").replace("14-Oct", "15-Oct")
            corpus.append({"text": v_text, "category": cat, "language": lang, "label": 0})
            
    df_msg = pd.DataFrame(corpus)
    df_msg = df_msg.sample(frac=1.0, random_state=42).reset_index(drop=True)
    df_msg.to_csv(os.path.join(DATA_DIR, "multilingual_message_corpus.csv"), index=False)
    print(f"Generated {len(df_msg)} multilingual messages -> Saved to multilingual_message_corpus.csv")
    return df_msg

if __name__ == "__main__":
    generate_transaction_dataset()
    generate_multilingual_message_corpus()
