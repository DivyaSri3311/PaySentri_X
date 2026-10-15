"""
PaySentriX Transaction Intelligence Service.
Evaluates simulated UPI transactions using a trained XGBoost model,
calculates SHAP-style local feature contributions, and recommends mitigation actions.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "models")
XGB_PATH = os.path.join(MODELS_DIR, "xgboost_model.joblib")

FEATURE_COLUMNS = [
    "amount",
    "hour_of_day",
    "sender_prev_tx_count",
    "sender_avg_amount",
    "amount_to_avg_ratio",
    "recipient_is_new",
    "recipient_risk_flag",
    "is_night_transaction",
    "is_quick_retry",
    "device_is_new",
    "device_rooted",
    "direction_is_debit",
    "is_collect_request",
    "merchant_mcc_risk",
    "urgency_keyword_in_note"
]

class TransactionIntelligenceService:
    def __init__(self):
        self.model = None
        self._load_model()
        
    def _load_model(self):
        if os.path.exists(XGB_PATH):
            try:
                self.model = joblib.load(XGB_PATH)
                print("Transaction XGBoost model loaded successfully.")
            except Exception as e:
                print(f"Error loading XGBoost model: {e}")
                self.model = None

    def evaluate_transaction(self, tx_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes raw transaction inputs, builds feature vector, executes XGBoost prediction,
        and computes feature contributions and explanations.
        """
        amount = float(tx_data.get("amount", 2500.0))
        hour = int(tx_data.get("hour_of_day", 14))
        sender_prev_tx = int(tx_data.get("sender_prev_tx_count", 45))
        sender_avg_amt = float(tx_data.get("sender_avg_amount", 800.0))
        ratio = round(amount / max(1.0, sender_avg_amt), 3)
        recipient_is_new = int(tx_data.get("recipient_is_new", 1))
        recipient_risk_flag = int(tx_data.get("recipient_risk_flag", 0))
        is_night = 1 if (hour >= 23 or hour <= 5) else int(tx_data.get("is_night_transaction", 0))
        is_quick_retry = int(tx_data.get("is_quick_retry", 0))
        device_is_new = int(tx_data.get("device_is_new", 0))
        device_rooted = int(tx_data.get("device_rooted", 0))
        direction_is_debit = 1 if tx_data.get("direction", "DEBIT").upper() == "DEBIT" else 0
        is_collect_request = int(tx_data.get("is_collect_request", 0))
        merchant_mcc_risk = int(tx_data.get("merchant_mcc_risk", 0))
        urgency_note = int(tx_data.get("urgency_keyword_in_note", 0))
        
        feature_dict = {
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
            "urgency_keyword_in_note": urgency_note
        }
        
        df_row = pd.DataFrame([feature_dict])[FEATURE_COLUMNS]
        
        if self.model is not None:
            prob_fraud = float(self.model.predict_proba(df_row)[0][1])
            is_fraud = int(prob_fraud >= 0.5)
        else:
            # Fallback deterministic heuristic scoring
            score_acc = 0.0
            if ratio > 5.0: score_acc += 0.35
            if recipient_risk_flag: score_acc += 0.30
            if is_collect_request: score_acc += 0.20
            if device_rooted: score_acc += 0.25
            prob_fraud = min(0.99, max(0.01, score_acc))
            is_fraud = int(prob_fraud >= 0.5)

        # Scale risk score to 0 - 100
        risk_score = round(prob_fraud * 100, 1)
        
        # Risk Category classification
        if is_collect_request and direction_is_debit:
            category = "Reverse-Debit Collect Scam"
        elif device_rooted or (device_is_new and ratio > 6.0):
            category = "High-Risk Account Takeover"
        elif recipient_risk_flag and amount > 15000:
            category = "Mule Velocity Laundering"
        elif is_night and ratio > 4.0:
            category = "Unusual Night Activity Spike"
        elif risk_score >= 70:
            category = "Suspicious Behavioral Deviation"
        else:
            category = "Normal Legitimate Payment"

        # Risk Tier
        if risk_score >= 85:
            risk_tier = "CRITICAL"
            recommended_action = "IMMEDIATE_BLOCK"
            action_desc = "Block payment instantly. Alert user of deceptive collect request and lock UPI handle."
        elif risk_score >= 60:
            risk_tier = "HIGH"
            recommended_action = "STEP_UP_BIOMETRIC"
            action_desc = "Suspend instant authorization. Require step-up biometric facial scan and display warning."
        elif risk_score >= 30:
            risk_tier = "MEDIUM"
            recommended_action = "CONFIRM_COUNTERPARTY"
            action_desc = "Display verified counterparty badge and ask user to confirm payment recipient."
        else:
            risk_tier = "SAFE"
            recommended_action = "ALLOW"
            action_desc = "Permit standard fast authorization through NPCI UPI switch."

        # Compute Local Feature Contributions (SHAP-style)
        contributions = []
        
        # Amount vs Historical Average
        if ratio > 3.0:
            contributions.append({
                "feature": "Amount Deviation",
                "value": f"₹{amount:,.0f} ({ratio:.1f}x avg)",
                "impact": "INCREASES_RISK",
                "weight": min(35.0, round(ratio * 3.5, 1)),
                "explanation": f"Transaction is {ratio:.1f} times higher than sender's historical average payment."
            })
        elif ratio <= 1.2:
            contributions.append({
                "feature": "Amount Alignment",
                "value": f"₹{amount:,.0f} (Normal)",
                "impact": "DECREASES_RISK",
                "weight": -18.0,
                "explanation": "Payment amount is within standard daily velocity limits."
            })
            
        # Recipient Risk
        if recipient_risk_flag == 1:
            contributions.append({
                "feature": "Recipient Risk Flag",
                "value": "Flagged VPA",
                "impact": "INCREASES_RISK",
                "weight": 28.5,
                "explanation": "Recipient UPI ID was previously reported in community scam databases."
            })
        elif recipient_is_new == 0:
            contributions.append({
                "feature": "Frequent Payee History",
                "value": f"{sender_prev_tx} prior transactions",
                "impact": "DECREASES_RISK",
                "weight": -22.0,
                "explanation": "Sender has an established trusted transaction history with this recipient."
            })

        # Collect Request
        if is_collect_request:
            contributions.append({
                "feature": "UPI Collect Request",
                "value": "Inward Collect Trap",
                "impact": "INCREASES_RISK",
                "weight": 32.0,
                "explanation": "Counterparty initiated a collect request demanding funds from the victim."
            })

        # Device Safety
        if device_rooted:
            contributions.append({
                "feature": "Device Integrity Compromised",
                "value": "Rooted / Jailbroken",
                "impact": "INCREASES_RISK",
                "weight": 24.0,
                "explanation": "Payment executed from a compromised OS environment vulnerable to remote screen-sharing."
            })

        # Hour of day
        if is_night:
            contributions.append({
                "feature": "Off-Hours Execution",
                "value": f"{hour:02d}:00 HRS",
                "impact": "INCREASES_RISK",
                "weight": 14.5,
                "explanation": "Transaction initiated during non-standard dormant hours (11 PM - 5 AM)."
            })

        explanation_summary = (
            f"PaySentriX evaluated transaction of ₹{amount:,.2f} to {tx_data.get('recipient_id', 'recipient')}. "
            f"The XGBoost model assigned a risk score of {risk_score}/100 ({risk_tier}). "
            f"Primary risk drivers: {', '.join([c['feature'] for c in contributions if c['impact'] == 'INCREASES_RISK']) or 'None'}. "
            f"Verdict: {category}."
        )

        return {
            "risk_score": risk_score,
            "risk_tier": risk_tier,
            "prediction": "Fraudulent" if is_fraud else "Legitimate",
            "fraud_probability": round(prob_fraud, 4),
            "category": category,
            "recommended_action": recommended_action,
            "action_description": action_desc,
            "contributing_features": contributions,
            "explanation": explanation_summary,
            "feature_snapshot": feature_dict
        }

transaction_service = TransactionIntelligenceService()
