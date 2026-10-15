# PaySentriX

### *"Every Payment has a story, We find the Truth"*

**Category:** AI-Powered UPI Payment Fraud Prevention  
**Hackathon:** CyberCup 6.0 | Problem Statement **CC6-AI02**  
**Core Innovation:** AI-Generated Payment Contracts & Invariance Verification  

---

## Executive Summary

Conventional fraud detection systems evaluate financial transactions purely through statistical classification after or during authorization. They ask: *"Does this payment look mathematically anomalous?"*

**PaySentriX introduces a fundamental paradigm shift:**
> **"The Payment Is Real. The Promise May Not Be."**

In digital payment cybercrimes—most notably Indian UPI reverse-debit fraud, fake refund scams, utility disconnection panic, and swapped physical QR stickers—victims are socially engineered into initiating or approving a transaction under a false promise (e.g. *"Click and enter PIN to receive your ₹5,000 Amazon refund"*).

PaySentriX extracts what the user was **promised** from natural language communication (SMS, WhatsApp, chat) and compares it deterministically against what the payment payload will **actually execute**. It converts payment claims into testable safety predicates evaluated before simulated funds are authorized.

---

## 🛡️ Key Architectural Modules & The 10 Command Pages

| # | Page / Module | Function & Cyber Defense Capability |
|---|---|---|
| **1** | **Command Core** | Executive telemetry dashboard: total transactions analyzed (15,000+), detection rate (99.72%), recent suspicious activity stream, interactive 3D Three.js financial transaction network, and engine health monitors. |
| **2** | **Transaction Intelligence** | Transaction simulator powered by a trained **XGBoost Classifier**. Computes 0–100 risk score, fraud prediction, risk tier, and SHAP-style local feature attributions (amount deviations, velocity spikes, unverified VPAs, rooted device status). |
| **3** | **AI Payment Contract** ⭐ *(Flagship Innovation)* | Parses natural language promise messages and compares them against actual UPI execution. Tests 5 formal safety predicates (Direction Invariance, Amount Parity, Counterparty Trust, Purpose Compliance, PIN Exemption Rule). Fires high-impact contradiction warnings (*"YOU ARE ABOUT TO PAY ₹5,000, NOT RECEIVE IT"*) and auto-generates official 1930 Cybercrime incident drafts. |
| **4** | **Message Intelligence** | Multilingual NLP classifier supporting **English, Hindi, and Hinglish**. Identifies psychological deception vectors (Fear, Artificial Urgency, Authority Impersonation, Reverse-Debit lures) and outputs highlighted risk tokens. |
| **5** | **Payment Link Scanner** | Decodes standard NPCI UPI intent deep links (`upi://pay?pa=...&pn=...&am=...&tn=...`) and inspects web links. Features built-in **SSRF protection** (blocking RFC1918 private subnets and loopback addresses), typosquatting detection for Indian banks, and Shannon entropy analysis. |
| **6** | **QR Guardian** | Countertop physical security: extracts payment details from uploaded or scanned QR codes. Cross-references against the **National Trusted Merchant Registry** to detect physical sticker-overlay tampering (e.g., visual Starbucks counter branding routing money to a personal mule VPA) and validates mock POS cryptographic terminal signatures. |
| **7** | **Fraud Evolution Lab** | Adversarial stress testbed: allows testing mutated attacks and held-out zero-day scam categories (e.g., AI voice clone emergency ransom) across 3 defensive tiers: **Supervised XGBoost**, **Unsupervised Isolation Forest**, and **AI Payment Contracts**. |
| **8** | **Data Science Studio** | Empirical diagnostic laboratory: real confusion matrix (TP: 359, FP: 0, TN: 2640, FN: 1), 99.97% accuracy, 100% precision, 99.72% recall, 99.86% F1, PR and ROC curve coordinate data, XGBoost gain feature importance, and multi-model benchmark comparisons. |
| **9** | **Audit History** | Immutable SQLite forensic ledger recording every simulation with cryptographic contract IDs, full JSON request payloads, risk tiers, and 1-click exportable National Cyber Crime 1930 reporting drafts. |
| **10** | **System Core & Settings** | Calibration workbench: model inference engine status, risk tier boundary tuning sliders, live backend heartbeat test, background retrain triggers, and enterprise merchant registry inspection. |

---

## 🧠 Real Machine Learning & Evaluation Metrics

The system was trained on a synthetic corpus of **15,000 realistic Indian UPI transactions** (88% legitimate, 12% fraud distribution) and **1,490 multilingual scam messages** (English, Hindi, Hinglish).

### Holdout Evaluation (3,000 Test Samples, 20% Stratified Split)

```
========================================================================
MODEL BENCHMARK COMPARISON ON UNSEEN HOLDOUT DATA
========================================================================
Model Architecture               Accuracy   Precision   Recall      F1
------------------------------------------------------------------------
PaySentriX XGBoost (Primary)      99.97%     100.00%    99.72%    99.86%
Random Forest Classifier          99.80%      99.17%    99.17%    99.17%
Logistic Regression Baseline      98.40%      91.20%    96.38%    93.72%
Isolation Forest (Unsupervised)   92.40%      78.60%    89.10%    83.52%
========================================================================
```

### Confusion Matrix

- **True Positives (TP):** 359
- **False Positives (FP):** 0 *(Zero false citizen alarms)*
- **True Negatives (TN):** 2,640
- **False Negatives (FN):** 1

---

## 🚀 Quickstart & Local Installation Guide

### Prerequisites
- **Python 3.10+**
- **Node.js v18+** with `npm`

### Step 1: Clone & Environment Setup

```bash
# Clone the repository
git clone https://github.com/dvysr/PaySentriX.git
cd PaySentriX

# Setup Python Virtual Environment
python -m venv backend_env
.\backend_env\Scripts\activate   # Windows
# source backend_env/bin/activate  # macOS / Linux

# Install backend dependencies
pip install fastapi uvicorn pydantic scikit-learn xgboost numpy pandas joblib httpx
```

### Step 2: Train Machine Learning Models & Seed Registry

```bash
# Generate synthetic datasets and train models
python backend/data/dataset_generator.py
python backend/data/train_models.py
python backend/data/database.py
```

### Step 3: Start the Backend Server

```bash
python backend/run.py
```
*Backend runs on `http://127.0.0.1:8000` (API documentation available at `http://127.0.0.1:8000/docs`).*

### Step 4: Start the Frontend Application

In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://127.0.0.1:5173/`.*

---

## 🔒 Security & Safe Simulation Disclaimers
1. **Zero Real Money Movement:** All transactions and UPI intents are simulated in a safe testing sandbox.
2. **SSRF Guard:** Web link evaluation strictly forbids loopback (127.0.0.1) and internal private network IPs (RFC 1918).
3. **Deterministic Contracts:** AI Payment Contracts rely on safe predicate templates rather than arbitrary executable code.

---
*Built for CyberCup 6.0 Hackathon • PaySentriX: Every Payment has a story, We find the Truth.*
