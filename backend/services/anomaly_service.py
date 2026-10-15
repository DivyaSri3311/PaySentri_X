"""
PaySentriX Anomaly Detection Service using Isolation Forest.
Detects out-of-distribution transactions, behavioral zero-day anomalies,
and unseen evasion variants that may bypass supervised classification.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "models")
ISO_PATH = os.path.join(MODELS_DIR, "isolation_forest.joblib")

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

class AnomalyDetectionService:
    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        if os.path.exists(ISO_PATH):
            try:
                self.model = joblib.load(ISO_PATH)
                print("Isolation Forest model loaded successfully.")
            except Exception as e:
                print(f"Error loading Isolation Forest: {e}")
                self.model = None

    def detect_anomaly(self, feature_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates raw anomaly score from Isolation Forest.
        Negative score indicates outlier/anomaly.
        """
        df_row = pd.DataFrame([feature_dict])[FEATURE_COLUMNS]
        
        if self.model is not None:
            # decision_function returns average anomaly score of base estimators.
            # < 0 is considered an anomaly.
            score = float(self.model.decision_function(df_row)[0])
            pred = int(self.model.predict(df_row)[0]) # -1 for anomaly, 1 for normal
            is_anomaly = (pred == -1)
            # Normalize to 0 - 100 anomaly intensity (lower decision_function = higher anomaly)
            anomaly_intensity = min(100.0, max(0.0, (0.25 - score) * 200.0))
        else:
            # Fallback
            ratio = feature_dict.get("amount_to_avg_ratio", 1.0)
            is_anomaly = ratio > 4.5 or feature_dict.get("device_rooted", 0) == 1
            anomaly_intensity = 85.0 if is_anomaly else 15.0
            score = -0.15 if is_anomaly else 0.15

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(score, 4),
            "anomaly_intensity": round(anomaly_intensity, 1),
            "verdict": "Outlier Anomaly Detected" if is_anomaly else "Normal Distribution Behavior",
            "interpretation": (
                "Unusual multi-dimensional parameter deviation from standard baseline behavior."
                if is_anomaly else
                "Transaction vector falls comfortably within expected cluster contours."
            )
        }

anomaly_service = AnomalyDetectionService()
