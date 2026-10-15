# ProofPay — AI Payment Screenshot Forensics
> **"A Screenshot Can Be Faked. A Transaction Must Be Verified."**  
> *CyberCup 6.0 Hackathon — Problem Statement CC6-AI02*  
> Integrated into **PaySentriX AI Threat Shield**

---

## 1. Overview & Problem Statement

Fraudsters routinely forge UPI payment confirmation screens using web-based receipt generators (e.g., fake Paytm/GPay APKs, Photoshop/Canva templates) to trick retail merchants and e-commerce sellers into handing over goods without receiving payment. In other schemes, genuine payment screenshots are **replayed across multiple different orders**.

**ProofPay** solves this through a multi-engine forensics and merchant ledger verification pipeline:
1. **Multimodal Information Extraction**: Extracts claimed amount, UTR/reference, receiver VPA, sender VPA, timestamp, and payment app via **Gemini 2.5 Flash** (via `@google/genai` SDK) with strict Pydantic JSON schemas, with deterministic regex/heuristic fallback.
2. **Defensible Image Forensics**: Uses OpenCV, Pillow, and NumPy to run Error Level Analysis (ELA), Laplacian edge/noise variance detection, EXIF manipulation checks, cryptographic SHA-256 digests, and 64-bit difference perceptual hashing (`dHash`).
3. **ReplayGuard**: Prevents duplicate payment proof submissions by cross-checking UTRs and perceptual screenshot hashes against historical orders.
4. **ChallengePay & Simulated Merchant Ledger**: Enforces order-bound verification against an independent, merchant-maintained settlement ledger. A screenshot is only labeled `CONFIRMED` when authoritative merchant settlement records corroborate it.

---

## 2. Multi-Engine Architecture

```
                          ┌────────────────────────────────┐
                          │   Uploaded Payment Screenshot   │
                          └───────────────┬────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            ▼                             ▼                             ▼
 ┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
 │  Gemini 2.5 Flash    │      │  OpenCV/NumPy ELA    │      │     ReplayGuard      │
 │  Multimodal Analysis │      │  Image Forensics     │      │  Hash & UTR Monitor  │
 │  - UTR / Reference   │      │  - Error Level (ELA) │      │  - SHA-256 Digest    │
 │  - Claimed Amount    │      │  - Laplacian Noise   │      │  - 64-bit dHash      │
 │  - Sender / Recipient│      │  - EXIF Software     │      │  - Cross-Order Replay│
 └──────────┬───────────┘      └──────────┬───────────┘      └──────────┬───────────┘
            │                             │                             │
            └─────────────────────────────┼─────────────────────────────┘
                                          │
                                          ▼
                         ┌──────────────────────────────────┐
                         │   ChallengePay Ledger Provider   │
                         │   - Independent Settlement DB    │
                         │   - Recipient VPA Match          │
                         │   - Order ID & Amount Match      │
                         └────────────────┬─────────────────┘
                                          │
                                          ▼
                         ┌──────────────────────────────────┐
                         │    ProofPay Multi-Engine Core    │
                         │    --------------------------    │
                         │ 1. VISUAL INTEGRITY VERDICT      │
                         │    [CLEAN | SUSPICIOUS | INCONCL]│
                         │ 2. PAYMENT VERIFICATION VERDICT  │
                         │    [CONFIRMED | PENDING | NOT_FND│
                         │     MISMATCHED | UNVERIFIED]     │
                         │ 3. Tamper-Chained Audit Token    │
                         └──────────────────────────────────┘
```

---

## 3. Real AI vs. Deterministic vs. Simulated Components

| Component | Nature | Role |
| :--- | :--- | :--- |
| **Gemini 2.5 Flash** | Real Multimodal LLM | Reads screenshot text, extracts UPI UTR, amount, VPAs, timestamp, and notes anomalies. Never hallucinates missing UTRs. |
| **OpenCV ELA & Noise** | Deterministic Computer Vision | Re-saves at quality 90 to compute Error Level differences, measures local Laplacian variance, detects software signatures in EXIF. |
| **ReplayGuard** | Deterministic Security Logic | Compares cryptographic SHA-256 and perceptual dHash (Hamming distance $\le 4$) against past orders. |
| **Merchant Ledger** | Simulated Persistent Database | Stand-in for internal merchant gateway/bank API. Proves that visual authenticity $\neq$ payment settlement. |

---

## 4. CyberCup Demo Lab: 5 Preconfigured Scenarios

ProofPay includes 5 built-in scenarios with programmatic synthetic receipts that execute through the **exact same live backend pipeline**:

1. **Scenario A: Fake Amount Screenshot**
   - *Claim*: Customer presents receipt claiming ₹8,500 was paid.
   - *Ledger*: Merchant ledger only recorded ₹850 or no matching record.
   - *Verdict*: Visual Suspicious/Inconclusive + `NOT_FOUND` in ledger.
2. **Scenario B: Genuine Screenshot Replay**
   - *Claim*: A genuine ₹8,500 receipt from yesterday is resubmitted for a new order.
   - *ReplayGuard*: Detects identical UTR/dHash already linked to a different order ID.
   - *Verdict*: Replay warning + `NOT_FOUND` / Unverified for the new order.
3. **Scenario C: Wrong Merchant**
   - *Claim*: Receipt shows payment to a different beneficiary VPA (`personal.mule@ybl`).
   - *Ledger*: Expected Starbucks VPA does not match.
   - *Verdict*: Recipient Mismatch + `MISMATCHED`.
4. **Scenario D: Genuine Successful Payment**
   - *Claim*: Valid ₹850 payment to `starbucks.pay@hdfcbank` with matching UTR `428901234567`.
   - *Ledger*: Authoritative merchant settlement record verified.
   - *Verdict*: `NO_OBVIOUS_MANIPULATION` + `CONFIRMED`.
5. **Scenario E: Pending Payment**
   - *Claim*: Screenshot claims SUCCESS.
   - *Ledger*: Bank ledger indicates status is still `PENDING`.
   - *Verdict*: `PENDING` (Merchant warned not to fulfill goods yet).

---

## 5. API Endpoints

- `POST /api/proofpay/analyze`: Accepts screenshot (`multipart/form-data`) and order details, returns forensics, extracted fields, and dual verdicts.
- `POST /api/proofpay/verify`: Accepts JSON payload (`image_base64`), runs full verification pipeline.
- `POST /api/proofpay/orders`: Creates a ChallengePay merchant order with unpredictable ID.
- `GET /api/proofpay/orders/{id}`: Retrieves order status and binding details.
- `GET /api/proofpay/history`: Returns paginated verification history with SHA-256 digests and audit tokens.
- `GET /api/proofpay/reports/{id}`: Returns audit certificate details for printing or PDF export.
- `GET /api/proofpay/demo/scenarios`: Returns the 5 seeded CyberCup demo fixtures with synthetic receipts.
- `POST /api/proofpay/demo/reset`: Resets demo database to clean seed state.
- `GET /api/proofpay/ledger`: Lists live records from the independent merchant settlement ledger.

---

## 6. How to Run

### Backend
```powershell
# Activate Python environment
.\backend_env\Scripts\python.exe backend/run.py
```
Backend will start on `http://127.0.0.1:8000`. API docs available at `http://127.0.0.1:8000/docs`.

### Frontend
```powershell
cd frontend
npm run dev
```
Frontend will start on `http://127.0.0.1:5173`. Navigate to **ProofPay Forensics** from the sidebar.

### Running Unit Tests
```powershell
.\backend_env\Scripts\python.exe -m unittest tests/test_proofpay.py
```
Runs 8 automated test cases covering valid upload, file rejection, ELA forensics, ledger match, amount mismatch, recipient mismatch, ReplayGuard, and pending status.
