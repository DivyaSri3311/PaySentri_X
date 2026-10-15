"""
PaySentriX Fraud Evolution Lab Service.
Allows interactive stress-testing of adversarial fraud adaptations against:
1. Supervised Machine Learning (XGBoost)
2. Unsupervised Anomaly Detection (Isolation Forest)
3. AI Payment Contract Verification (Predicate logic)
4. Combined Ensemble Defense
"""

from typing import Dict, Any, List
from backend.services.transaction_service import transaction_service
from backend.services.anomaly_service import anomaly_service
from backend.services.contract_service import contract_engine, PaymentPromise, PaymentExecution

class FraudEvolutionLabService:
    def __init__(self):
        pass

    def evaluate_evolution_scenario(
        self,
        scenario_name: str,
        message_text: str,
        transaction_amount: float,
        recipient_vpa: str,
        is_collect_request: bool,
        is_new_recipient: bool,
        device_status: str,
        claimed_entity: str,
        is_held_out_type: bool = False
    ) -> Dict[str, Any]:
        """
        Executes all three defense layers on the modified adversarial scenario,
        and determines which layer catches the fraud evasion attempt.
        """
        # 1. Prepare Features for ML & Anomaly engines
        device_rooted = 1 if device_status == "ROOTED" else 0
        device_is_new = 1 if device_status in ["NEW_DEVICE", "ROOTED"] else 0
        
        feature_dict = {
            "amount": transaction_amount,
            "hour_of_day": 21,
            "sender_prev_tx_count": 12,
            "sender_avg_amount": 650.0,
            "amount_to_avg_ratio": round(transaction_amount / 650.0, 3),
            "recipient_is_new": 1 if is_new_recipient else 0,
            "recipient_risk_flag": 1 if ("mule" in recipient_vpa or "fraud" in recipient_vpa or is_held_out_type) else 0,
            "is_night_transaction": 0,
            "is_quick_retry": 1 if is_collect_request else 0,
            "device_is_new": device_is_new,
            "device_rooted": device_rooted,
            "direction_is_debit": 1,
            "is_collect_request": 1 if is_collect_request else 0,
            "merchant_mcc_risk": 2 if is_held_out_type else (1 if is_collect_request else 0),
            "urgency_keyword_in_note": 1 if any(w in message_text.lower() for w in ["urgent", "turant", "immediately", "block", "police", "arrest"]) else 0
        }

        # 2. Layer 1: Supervised XGBoost ML
        tx_result = transaction_service.evaluate_transaction({
            "amount": transaction_amount,
            "hour_of_day": 21,
            "sender_prev_tx_count": 12,
            "sender_avg_amount": 650.0,
            "recipient_is_new": 1 if is_new_recipient else 0,
            "recipient_risk_flag": feature_dict["recipient_risk_flag"],
            "direction": "DEBIT",
            "is_collect_request": 1 if is_collect_request else 0,
            "device_rooted": device_rooted,
            "device_is_new": device_is_new,
            "recipient_id": recipient_vpa
        })

        # 3. Layer 2: Isolation Forest Anomaly Detection
        iso_result = anomaly_service.detect_anomaly(feature_dict)

        # 4. Layer 3: AI Payment Contract Verification
        promise = contract_engine.extract_promise_from_text(message_text)
        if claimed_entity:
            promise.claimed_entity = claimed_entity
            
        execution = PaymentExecution(
            actual_direction="DEBIT",
            actual_amount=transaction_amount,
            recipient_vpa=recipient_vpa,
            recipient_name="Unverified Counterparty",
            transaction_note=message_text[:40],
            is_collect_request=is_collect_request,
            requires_pin=True
        )
        contract_result = contract_engine.evaluate(promise, execution, is_merchant_verified=False)

        # 5. Combined Multi-Engine Ensemble Decision
        # Check detections:
        ml_caught = tx_result["risk_score"] >= 50.0
        iso_caught = iso_result["is_anomaly"]
        contract_caught = contract_result.verdict == "FAIL"

        signals_caught = []
        if ml_caught:
            signals_caught.append(f"XGBoost Supervised Model ({tx_result['risk_score']} risk score)")
        if iso_caught:
            signals_caught.append(f"Isolation Forest Anomaly (Intensity {iso_result['anomaly_intensity']}%)")
        if contract_caught:
            signals_caught.append(f"AI Payment Contract (Failed: {', '.join([p.title for p in contract_result.predicates if p.status == 'FAIL'])})")

        overall_caught = ml_caught or iso_caught or contract_caught
        
        # Calculate combined weighted score
        combined_score = round(
            (tx_result["risk_score"] * 0.40) +
            (iso_result["anomaly_intensity"] * 0.25) +
            (contract_result.risk_score * 0.35),
            1
        )
        
        verdict = "Fraud Blocked by Multi-Tier Defense" if overall_caught else "Transaction Approved (Evasion Successful)"
        
        # Defense Gap Analysis
        gap_analysis = []
        if is_held_out_type and not ml_caught and contract_caught:
            gap_analysis.append("Held-out zero-day attack evaded standard supervised ML, but was trapped by AI Payment Contract logic!")
        elif is_held_out_type and not ml_caught and iso_caught:
            gap_analysis.append("Unseen attack pattern bypassed known supervised patterns, but triggered Isolation Forest anomaly alert!")
        elif contract_caught and not ml_caught:
            gap_analysis.append("Sophisticated social engineering lure tricked standard transaction limits, but violated Payment Contract direction invariants.")

        return {
            "scenario": scenario_name,
            "combined_risk_score": combined_score,
            "overall_caught": overall_caught,
            "final_verdict": verdict,
            "signals_triggered": signals_caught,
            "gap_analysis": gap_analysis,
            "layer_1_supervised_ml": {
                "model": "XGBoost Classifier",
                "risk_score": tx_result["risk_score"],
                "prediction": tx_result["prediction"],
                "status": "CAUGHT" if ml_caught else "BYPASSED",
                "key_features": [c["feature"] for c in tx_result["contributing_features"][:2]]
            },
            "layer_2_anomaly_detection": {
                "model": "Isolation Forest (Unsupervised)",
                "is_anomaly": iso_result["is_anomaly"],
                "anomaly_intensity": iso_result["anomaly_intensity"],
                "status": "CAUGHT" if iso_caught else "BYPASSED"
            },
            "layer_3_payment_contract": {
                "model": "AI Payment Contract Engine",
                "verdict": contract_result.verdict,
                "contradiction_detected": contract_result.contradiction_detected,
                "failed_predicates": [p.title for p in contract_result.predicates if p.status == "FAIL"],
                "status": "CAUGHT" if contract_caught else "BYPASSED"
            }
        }

evolution_service = FraudEvolutionLabService()
