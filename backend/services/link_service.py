"""
PaySentriX Payment Link and UPI Deep Link Scanner.
Parses UPI intents (`upi://pay?...`) and conducts SSRF-protected structural URL inspection.
Detects lookalike / typosquatted banking domains, high entropy hostnames, and phishing path tokens.
"""

import math
import re
import socket
import ipaddress
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any, List, Optional

TRUSTED_DOMAINS = {
    "sbi.co.in": "State Bank of India",
    "onlinesbi.sbi": "State Bank of India NetBanking",
    "hdfcbank.com": "HDFC Bank",
    "icicibank.com": "ICICI Bank",
    "axisbank.com": "Axis Bank",
    "phonepe.com": "PhonePe India",
    "paytm.com": "Paytm One97",
    "amazon.in": "Amazon India",
    "flipkart.com": "Flipkart",
    "bescom.karnataka.gov.in": "BESCOM Electricity Board",
    "tatapower.com": "Tata Power",
    "npci.org.in": "National Payments Corporation of India"
}

SUSPICIOUS_TLDS = {".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq", ".vip", ".work", ".live", ".club", ".icu", ".click"}

def calculate_shannon_entropy(text: str) -> float:
    if not text:
        return 0.0
    probabilities = [float(text.count(c)) / len(text) for c in set(text)]
    return -sum(p * math.log2(p) for p in probabilities)

def is_private_or_internal_ip(hostname: str) -> bool:
    """
    SSRF Protection: Resolves hostname and validates that it does not point
    to internal loopback, RFC 1918 private spaces, link-local, or cloud metadata.
    """
    try:
        ip = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(ip)
        return (
            ip_obj.is_private or
            ip_obj.is_loopback or
            ip_obj.is_link_local or
            ip_obj.is_reserved or
            str(ip_obj) in ["169.254.169.254", "0.0.0.0", "127.0.0.1"]
        )
    except Exception:
        # If DNS fails or is invalid hostname
        return False

class PaymentLinkScannerService:
    def __init__(self):
        pass

    def scan_link(self, raw_input: str) -> Dict[str, Any]:
        link = raw_input.strip()
        
        # 1. UPI Deep Link Analysis
        if link.startswith("upi://pay"):
            return self._scan_upi_intent(link)
            
        # 2. Web URL Inspection
        return self._scan_web_url(link)

    def _scan_upi_intent(self, upi_url: str) -> Dict[str, Any]:
        parsed = urlparse(upi_url)
        params = parse_qs(parsed.query)
        
        pa = params.get("pa", [""])[0]
        pn = params.get("pn", [""])[0]
        am = params.get("am", ["0"])[0]
        cu = params.get("cu", ["INR"])[0]
        tn = params.get("tn", [""])[0]
        mc = params.get("mc", [""])[0]
        
        try:
            amount_val = float(am)
        except ValueError:
            amount_val = 0.0
            
        # UPI Security Rules
        findings = []
        risk_score = 15.0
        
        # Rule 1: Push intent always executes DEBIT
        findings.append({
            "check": "UPI Direction Protocol",
            "result": "PUSH PAYMENT (DEBIT)",
            "detail": "Standard UPI 'upi://pay' deep links ALWAYS trigger a DEBIT from the user's account.",
            "severity": "INFO"
        })
        
        # Rule 2: Note inspection for deceptive words
        lower_note = tn.lower()
        deceptive_words = ["refund", "cashback", "reward", "winner", "prize", "lottery", "kyc"]
        found_words = [w for w in deceptive_words if w in lower_note]
        if found_words:
            risk_score += 65.0
            findings.append({
                "check": "Deceptive Transaction Note",
                "result": "HIGH RISK REVERSE-DEBIT LURE",
                "detail": f"Transaction note contains '{', '.join(found_words)}' to trick user into believing they are receiving funds.",
                "severity": "CRITICAL"
            })
            
        # Rule 3: Personal VPA masquerading as business
        if "@" in pa:
            handle = pa.split("@")[0].lower()
            if any(b in handle for b in ["sbi", "hdfc", "amazon", "refund", "flipkart", "bescom", "service"]):
                risk_score += 40.0
                findings.append({
                    "check": "Brand Masquerade in VPA",
                    "result": "SUSPICIOUS HANDLE",
                    "detail": f"VPA '{pa}' uses bank or corporate branding in the user handle prefix.",
                    "severity": "HIGH"
                })

        risk_score = min(99.0, max(5.0, risk_score))
        risk_tier = "CRITICAL" if risk_score >= 80 else ("HIGH" if risk_score >= 50 else ("MEDIUM" if risk_score >= 25 else "SAFE"))
        
        return {
            "type": "UPI_DEEP_LINK",
            "link": upi_url,
            "payee_vpa": pa,
            "payee_name": pn or "Unspecified",
            "amount": amount_val,
            "currency": cu,
            "transaction_note": tn,
            "merchant_code": mc or "Standard/P2P",
            "direction": "DEBIT (Funds will be transferred out)",
            "risk_score": round(risk_score, 1),
            "risk_tier": risk_tier,
            "prediction": "Dangerous Scam Link" if risk_score >= 60 else "Legitimate UPI Link",
            "findings": findings,
            "ssrf_safe": True
        }

    def _scan_web_url(self, url: str) -> Dict[str, Any]:
        if not url.startswith("http://") and not url.startswith("https://"):
            url = "https://" + url
            
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower()
        path = parsed.path.lower()
        
        # SSRF Check
        if is_private_or_internal_ip(hostname):
            return {
                "type": "HTTPS_URL",
                "link": url,
                "domain": hostname,
                "risk_score": 100.0,
                "risk_tier": "CRITICAL",
                "prediction": "Host Security Violation",
                "findings": [{
                    "check": "SSRF Guard Violation",
                    "result": "BLOCKED INTERNAL TARGET",
                    "detail": "Target resolves to private network space (RFC 1918 / Loopback). Inspection halted for infrastructure defense.",
                    "severity": "CRITICAL"
                }],
                "ssrf_safe": False
            }

        findings = []
        risk_score = 10.0
        
        # Check 1: Known Trusted Domain Match
        if hostname in TRUSTED_DOMAINS:
            findings.append({
                "check": "Official Domain Whitelist",
                "result": f"Verified: {TRUSTED_DOMAINS[hostname]}",
                "detail": "Domain belongs to official certified banking/commerce enterprise.",
                "severity": "SAFE"
            })
            return {
                "type": "HTTPS_URL",
                "link": url,
                "domain": hostname,
                "risk_score": 2.5,
                "risk_tier": "SAFE",
                "prediction": "Verified Enterprise Domain",
                "findings": findings,
                "ssrf_safe": True
            }

        # Check 2: Typosquatting / Lookalike Brands
        target_brands = ["sbi", "hdfc", "icici", "axis", "pnb", "phonepe", "paytm", "amazon", "flipkart", "bescom"]
        for brand in target_brands:
            if brand in hostname:
                risk_score += 55.0
                findings.append({
                    "check": "Typosquatting & Brand Spoofing",
                    "result": f"Brand Impersonation Target: '{brand.upper()}'",
                    "detail": f"Domain contains the brand string '{brand}', but is NOT hosted on an official enterprise domain.",
                    "severity": "CRITICAL"
                })
                break

        # Check 3: Risky TLDs
        tld_match = any(hostname.endswith(tld) for tld in SUSPICIOUS_TLDS)
        if tld_match:
            risk_score += 25.0
            findings.append({
                "check": "High-Risk Top Level Domain",
                "result": "Abuse-Prone TLD Detected",
                "detail": f"Host uses a domain suffix known for disposable cybercrime infrastructure.",
                "severity": "HIGH"
            })

        # Check 4: Suspicious Path Tokens
        phish_tokens = ["kyc", "pan", "aadhar", "apk", "refund", "block", "verify", "update", "reward", "bill-pay"]
        found_tokens = [tok for tok in phish_tokens if tok in path or tok in hostname]
        if found_tokens:
            risk_score += 25.0
            findings.append({
                "check": "Phishing Path Signature",
                "result": f"Sensitive Keywords ({', '.join(found_tokens)})",
                "detail": "Path structure replicates credential harvesting or APK delivery portals.",
                "severity": "HIGH"
            })

        # Check 5: Domain Entropy
        entropy = calculate_shannon_entropy(hostname.split(".")[0])
        if entropy > 3.6:
            risk_score += 18.0
            findings.append({
                "check": "High Shannon Entropy",
                "result": f"Entropy Score {entropy:.2f}",
                "detail": "Domain name displays pseudorandom character generation typical of DGA malware.",
                "severity": "MEDIUM"
            })

        # Check 6: Insecure HTTP
        if parsed.scheme == "http":
            risk_score += 15.0
            findings.append({
                "check": "Unencrypted Transport",
                "result": "HTTP (Insecure)",
                "detail": "Connection is not protected by TLS/HTTPS encryption.",
                "severity": "MEDIUM"
            })

        risk_score = min(99.0, max(5.0, risk_score))
        risk_tier = "CRITICAL" if risk_score >= 80 else ("HIGH" if risk_score >= 50 else ("MEDIUM" if risk_score >= 25 else "SAFE"))

        return {
            "type": "HTTPS_URL",
            "link": url,
            "domain": hostname,
            "risk_score": round(risk_score, 1),
            "risk_tier": risk_tier,
            "prediction": "Malicious Phishing Domain" if risk_score >= 60 else "Unverified External Site",
            "findings": findings,
            "ssrf_safe": True
        }

link_scanner = PaymentLinkScannerService()
