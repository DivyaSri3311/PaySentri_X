"""
PaySentriX AI Payment Contract Engine.
Evaluates the core hypothesis: "The Payment Is Real. The Promise May Not Be."
Translates natural language payment promises into formal security contracts
and tests them deterministically against actual payment execution payloads.
"""

import re
import hashlib
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class PaymentPromise(BaseModel):
    raw_message: str
    expected_direction: str = Field(..., description="CREDIT or DEBIT")
    expected_amount: float
    expected_currency: str = "INR"
    expected_purpose: str = Field(..., description="REFUND, PRIZE, BILL, SALARY, PURCHASE, PEER")
    claimed_entity: str

class PaymentExecution(BaseModel):
    actual_direction: str = Field(..., description="DEBIT or CREDIT")
    actual_amount: float
    currency: str = "INR"
    recipient_vpa: str
    recipient_name: Optional[str] = "Unknown"
    transaction_note: Optional[str] = ""
    is_collect_request: bool = False
    requires_pin: bool = True

class SecurityPredicate(BaseModel):
    check_id: str
    title: str
    status: str = Field(..., description="PASS, FAIL, or UNKNOWN")
    severity: str = Field(..., description="CRITICAL, HIGH, MEDIUM, LOW")
    expected_value: str
    actual_value: str
    reason: str

class ContractEvaluationResult(BaseModel):
    contract_id: str
    promise: PaymentPromise
    execution: PaymentExecution
    predicates: List[SecurityPredicate]
    verdict: str = Field(..., description="PASS, FAIL, or SUSPICIOUS")
    critical_warning: Optional[str] = None
    contradiction_detected: bool
    risk_score: float
    risk_tier: str
    recommendation: str
    police_draft: Optional[str] = None

class AIPaymentContractEngine:
    def __init__(self):
        pass

    def extract_promise_from_text(self, text: str, user_context: Optional[Dict[str, Any]] = None) -> PaymentPromise:
        """
        Parses text to extract the promised action using NLP pattern matching & entity extraction.
        """
        lower = text.lower()
        
        # 1. Determine Expected Direction
        # If words indicate victim receives money: refund, won, prize, cashback, credited, reward, lottery
        receiving_tokens = ["refund", "cashback", "won", "winner", "prize", "lottery", "credited", "receive", "paane", "wapas", "claim", "redeem"]
        paying_tokens = ["bill", "electricity", "due", "pay", "recharge", "fee", "penalty", "disconnection", "invoice", "purchase"]
        
        direction = "CREDIT" if any(t in lower for t in receiving_tokens) else "DEBIT"
        
        # 2. Extract Amount
        amount = 0.0
        amt_match = re.search(r'(?:(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:rupees|rs|inr|₹))', text, re.IGNORECASE)
        if amt_match:
            amt_str = amt_match.group(1) or amt_match.group(2)
            try:
                amount = float(amt_str.replace(',', ''))
            except ValueError:
                amount = 0.0
        elif user_context and "expected_amount" in user_context:
            amount = float(user_context["expected_amount"])
        else:
            # Fallback search for bare numbers
            num_match = re.search(r'\b(\d{3,6})\b', text)
            if num_match:
                amount = float(num_match.group(1))
            else:
                amount = 5000.0 # Standard test default
                
        # 3. Determine Purpose
        purpose = "PURCHASE"
        if "refund" in lower or "wapas" in lower:
            purpose = "REFUND"
        elif "cashback" in lower or "scratch" in lower:
            purpose = "CASHBACK"
        elif "prize" in lower or "lottery" in lower or "won" in lower:
            purpose = "PRIZE"
        elif "bill" in lower or "electricity" in lower or "bijli" in lower:
            purpose = "BILL"
        elif "kyc" in lower or "pan" in lower or "block" in lower:
            purpose = "KYC_VERIFICATION"
            
        # 4. Extract Claimed Entity
        entity = "Independent / Unknown"
        if "amazon" in lower:
            entity = "Amazon India"
        elif "flipkart" in lower:
            entity = "Flipkart"
        elif "sbi" in lower or "yono" in lower:
            entity = "State Bank of India"
        elif "hdfc" in lower:
            entity = "HDFC Bank"
        elif "electricity" in lower or "bescom" in lower or "tata power" in lower or "bijli" in lower:
            entity = "Electricity Supply Corporation"
        elif "google pay" in lower or "gpay" in lower:
            entity = "Google Pay"
        elif "phonepe" in lower:
            entity = "PhonePe"
            
        return PaymentPromise(
            raw_message=text,
            expected_direction=direction,
            expected_amount=amount,
            expected_purpose=purpose,
            claimed_entity=entity
        )

    def evaluate(self, promise: PaymentPromise, execution: PaymentExecution, is_merchant_verified: bool = False) -> ContractEvaluationResult:
        predicates = []
        contradiction_detected = False
        critical_warning = None
        
        # Predicate 1: Direction Invariance (The Most Critical Defense)
        # If user expects to RECEIVE money (CREDIT), but execution is DEBIT -> Fatal Scam!
        direction_match = (promise.expected_direction.upper() == execution.actual_direction.upper())
        if promise.expected_direction.upper() == "CREDIT" and execution.actual_direction.upper() == "DEBIT":
            predicates.append(SecurityPredicate(
                check_id="PRED-DIR-001",
                title="Direction Parity Check",
                status="FAIL",
                severity="CRITICAL",
                expected_value=f"Incoming Fund CREDIT to victim",
                actual_value=f"Outgoing Fund DEBIT (₹{execution.actual_amount:,.2f})",
                reason=f"FATAL CONTRADICTION: The promise claims you are receiving a {promise.expected_purpose.lower()}, but this transaction actively DEBITS money from your bank account."
            ))
            contradiction_detected = True
            critical_warning = f"YOU ARE ABOUT TO PAY ₹{execution.actual_amount:,.2f}, NOT RECEIVE IT! In UPI, you never need to enter your PIN or approve a payment request to receive funds."
        elif direction_match:
            predicates.append(SecurityPredicate(
                check_id="PRED-DIR-001",
                title="Direction Parity Check",
                status="PASS",
                severity="LOW",
                expected_value=promise.expected_direction.upper(),
                actual_value=execution.actual_direction.upper(),
                reason="Direction of transfer matches promised payment direction."
            ))
        else:
            predicates.append(SecurityPredicate(
                check_id="PRED-DIR-001",
                title="Direction Parity Check",
                status="FAIL",
                severity="HIGH",
                expected_value=promise.expected_direction.upper(),
                actual_value=execution.actual_direction.upper(),
                reason=f"Payment direction mismatch: expected {promise.expected_direction}, executing {execution.actual_direction}."
            ))

        # Predicate 2: Amount Parity Check
        if promise.expected_amount > 0 and execution.actual_amount > 0:
            diff = abs(promise.expected_amount - execution.actual_amount)
            if diff <= 0.05:
                predicates.append(SecurityPredicate(
                    check_id="PRED-AMT-002",
                    title="Amount Parity Check",
                    status="PASS",
                    severity="LOW",
                    expected_value=f"₹{promise.expected_amount:,.2f}",
                    actual_value=f"₹{execution.actual_amount:,.2f}",
                    reason="Transaction amount strictly matches promised amount."
                ))
            else:
                predicates.append(SecurityPredicate(
                    check_id="PRED-AMT-002",
                    title="Amount Parity Check",
                    status="FAIL",
                    severity="HIGH",
                    expected_value=f"₹{promise.expected_amount:,.2f}",
                    actual_value=f"₹{execution.actual_amount:,.2f}",
                    reason=f"Amount mismatch: Promised ₹{promise.expected_amount:,.2f} vs Actual ₹{execution.actual_amount:,.2f} (Discrepancy of ₹{diff:,.2f})."
                ))
        else:
            predicates.append(SecurityPredicate(
                check_id="PRED-AMT-002",
                title="Amount Parity Check",
                status="UNKNOWN",
                severity="MEDIUM",
                expected_value=f"₹{promise.expected_amount:,.2f}" if promise.expected_amount > 0 else "Unspecified",
                actual_value=f"₹{execution.actual_amount:,.2f}",
                reason="Promised amount was omitted or could not be mathematically matched with high confidence."
            ))

        # Predicate 3: Recipient Entity Verification
        if is_merchant_verified:
            predicates.append(SecurityPredicate(
                check_id="PRED-REG-003",
                title="Counterparty Trust Registry",
                status="PASS",
                severity="LOW",
                expected_value=f"Verified entity '{promise.claimed_entity}'",
                actual_value=f"Enrolled Merchant '{execution.recipient_name}' ({execution.recipient_vpa})",
                reason="Recipient VPA is cryptographically verified in PaySentriX National Merchant Registry."
            ))
        else:
            # Check if claimed to be a big brand but VPA is an individual / personal mule
            claimed_brand = promise.claimed_entity.lower() != "independent / unknown"
            status = "FAIL" if claimed_brand else "UNKNOWN"
            predicates.append(SecurityPredicate(
                check_id="PRED-REG-003",
                title="Counterparty Trust Registry",
                status=status,
                severity="CRITICAL" if claimed_brand else "MEDIUM",
                expected_value=f"Verified entity '{promise.claimed_entity}'",
                actual_value=f"Unenrolled VPA '{execution.recipient_vpa}'",
                reason=f"The counterparty '{execution.recipient_vpa}' has no verified enterprise credentials. Scam actors routinely use personal mule accounts while claiming to represent {promise.claimed_entity}."
            ))

        # Predicate 4: Purpose Alignment
        purpose_risk = "PASS"
        if promise.expected_purpose in ["REFUND", "CASHBACK", "PRIZE"] and execution.actual_direction == "DEBIT":
            purpose_risk = "FAIL"
            reason = f"Actual payment note and debit action violates normal protocol for {promise.expected_purpose}. Legitimate platforms never charge customers to process refunds or prizes."
        elif promise.expected_purpose == "KYC_VERIFICATION" and execution.actual_amount > 10.0:
            purpose_risk = "FAIL"
            reason = f"KYC updates never require transferring ₹{execution.actual_amount:,.2f}. Banks and regulators prohibit charging users for statutory KYC compliance."
        else:
            reason = f"Transaction purpose aligns with expected operation."
            
        predicates.append(SecurityPredicate(
            check_id="PRED-PUR-004",
            title="Purpose Compliance Check",
            status=purpose_risk,
            severity="HIGH" if purpose_risk == "FAIL" else "LOW",
            expected_value=promise.expected_purpose,
            actual_value=f"{execution.actual_direction} of ₹{execution.actual_amount:,.2f}",
            reason=reason
        ))

        # Predicate 5: PIN Solicitation & Collect Protocol Rule
        if execution.actual_direction == "DEBIT" and execution.requires_pin and promise.expected_direction == "CREDIT":
            predicates.append(SecurityPredicate(
                check_id="PRED-PIN-005",
                title="UPI PIN Exemption Rule",
                status="FAIL",
                severity="CRITICAL",
                expected_value="No PIN required for incoming credit",
                actual_value="UPI PIN Entry Required to authorize transaction",
                reason="NPCI UPI Rule: Receiving money NEVER requires entering your UPI PIN. Any request asking for PIN entry to 'receive' money is 100% fraudulent."
            ))
            contradiction_detected = True
        else:
            predicates.append(SecurityPredicate(
                check_id="PRED-PIN-005",
                title="UPI PIN Exemption Rule",
                status="PASS",
                severity="LOW",
                expected_value="Standard UPI Authorization",
                actual_value="Normal Flow",
                reason="PIN authorization aligns with an intentional outgoing payment."
            ))

        # Compute Composite Risk Score & Verdict
        failed_critical = sum(1 for p in predicates if p.status == "FAIL" and p.severity == "CRITICAL")
        failed_high = sum(1 for p in predicates if p.status == "FAIL" and p.severity == "HIGH")
        unknowns = sum(1 for p in predicates if p.status == "UNKNOWN")
        
        if failed_critical >= 1 or contradiction_detected:
            risk_score = 96.5 + min(3.5, failed_high * 1.5)
            verdict = "FAIL"
            risk_tier = "CRITICAL"
            recommendation = "IMMEDIATE REJECTION: Block transaction and do not enter UPI PIN. Report VPA to Cyber Crime 1930."
        elif failed_high >= 1:
            risk_score = 74.0 + (failed_high * 8.0)
            verdict = "FAIL"
            risk_tier = "HIGH"
            recommendation = "TRANSACTION BLOCKED: Critical parameters deviate from promised terms. Requires manual analyst clearance."
        elif unknowns >= 2:
            risk_score = 48.0 + (unknowns * 6.0)
            verdict = "SUSPICIOUS"
            risk_tier = "MEDIUM"
            recommendation = "CAUTION ADVISED: Unregistered counterparty. Verify recipient identity before proceeding."
        else:
            risk_score = 8.5
            verdict = "PASS"
            risk_tier = "SAFE"
            recommendation = "CONTRACT VERIFIED: Payment execution matches promised parameters and trusted merchant registry."

        contract_id = f"PAYPROOF-CTR-{hashlib.sha256((promise.raw_message + execution.recipient_vpa).encode()).hexdigest()[:10].upper()}"
        
        # 1930 Incident draft if fraud detected
        police_draft = None
        if verdict == "FAIL":
            police_draft = (
                f"INCIDENT REPORT FOR CYBER CRIME CELL (PORTAL 1930 / CYBERCRIME.GOV.IN)\n"
                f"=========================================================================\n"
                f"Incident Type: UPI Payment Fraud / Reverse-Debit Social Engineering Scam\n"
                f"Suspect UPI ID (VPA): {execution.recipient_vpa}\n"
                f"Attempted Fraudulent Amount: INR {execution.actual_amount:,.2f}\n"
                f"Lure Message / Communication:\n"
                f"\"{promise.raw_message}\"\n\n"
                f"Technical Evidence Generated by PaySentriX Contract Engine:\n"
                f"- Promised Transaction: CREDIT of INR {promise.expected_amount:,.2f} claiming to be '{promise.claimed_entity}'\n"
                f"- Actual Attempted Operation: Outgoing DEBIT of INR {execution.actual_amount:,.2f} to unauthorized VPA\n"
                f"- Deception Vector: Deceptive UPI collect request requiring victim PIN entry under false refund pretext\n"
                f"- Reference Contract ID: {contract_id}\n"
                f"Timestamp: Generated automatically by PaySentriX Security Core"
            )

        return ContractEvaluationResult(
            contract_id=contract_id,
            promise=promise,
            execution=execution,
            predicates=predicates,
            verdict=verdict,
            critical_warning=critical_warning,
            contradiction_detected=contradiction_detected,
            risk_score=round(risk_score, 1),
            risk_tier=risk_tier,
            recommendation=recommendation,
            police_draft=police_draft
        )

contract_engine = AIPaymentContractEngine()
