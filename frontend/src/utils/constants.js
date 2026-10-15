/**
 * PaySentriX Constants and Demo Scenarios.
 * Problem Statement: CyberCup 6.0 CC6-AI02
 * Brand: PaySentriX — "Every Payment has a story, We find the Truth"
 */

export const BRAND = {
  name: "PaySentriX",
  shortName: "PSX",
  tagline: "Every Payment has a story, We find the Truth",
  category: "AI-Powered UPI Payment Fraud Prevention",
  version: "3.0.0",
  hackathon: "CyberCup 6.0 | Problem Statement CC6-AI02",
};

export const NAVIGATION_ITEMS = [
  { id: "command-core", label: "Command Core", icon: "LayoutDashboard", badge: "Live" },
  { id: "transaction-intel", label: "Transaction Intelligence", icon: "Activity", badge: "ML" },
  { id: "ai-payment-contract", label: "AI Payment Contract", icon: "ShieldAlert", badge: "Key Innovation", highlight: true },
  { id: "message-intel", label: "Message Intelligence", icon: "MessageSquareWarning", badge: "NLP" },
  { id: "link-scanner", label: "Payment Link Scanner", icon: "Link2", badge: "SSRF Safe" },
  { id: "qr-guardian", label: "QR Guardian", icon: "QrCode", badge: "Registry" },
  { id: "fraud-evolution", label: "Fraud Evolution Lab", icon: "Cpu", badge: "Multi-Tier" },
  { id: "data-science-studio", label: "Data Science Studio", icon: "BarChart3", badge: "Holdout" },
  { id: "audit-history", label: "Audit History", icon: "FileText", badge: "Forensics" },
  { id: "settings", label: "System Core & Settings", icon: "Sliders", badge: "Config" },
];

export const DEMO_PRESETS = [
  {
    id: "preset-refund-debit",
    title: "Amazon ₹5,000 Refund Reverse-Debit Scam",
    tag: "AI Contract Demo",
    description: "Message promises incoming ₹5,000 refund, but transaction initiates an outgoing ₹5,000 DEBIT to an unauthorized mule VPA.",
    category: "Reverse-Debit Collect Scam",
    page: "ai-payment-contract",
    payload: {
      promise_message: "Congratulations! Your Amazon refund of Rs 5,000 has been approved. Scan QR or click here to receive it directly into your bank account: upi://pay?pa=amz.refund.desk@ybl&am=5000",
      actual_direction: "DEBIT",
      actual_amount: 5000,
      recipient_vpa: "amz.refund.desk@ybl",
      recipient_name: "Refund Desk Agent",
      transaction_note: "Amazon Refund Approval Ref 5000",
      is_collect_request: true,
      requires_pin: true,
      claimed_entity: "Amazon India"
    }
  },
  {
    id: "preset-electricity-panic",
    title: "BESCOM Electricity Disconnection Panic",
    tag: "Message & Transaction",
    description: "Urgent night notice in Hinglish threatening power disconnection within 2 hours, directing payment to personal mule account.",
    category: "Electricity Bill Phishing",
    page: "message-intel",
    payload: {
      text: "Dear consumer, your electricity power will be disconnected tonight at 9:30 PM from electricity office because your previous month bill was not updated. Please immediately contact our electricity officer at 9876543210. BESCOM",
      tx_amount: 140,
      recipient_vpa: "bescom.officer.rahul@okaxis"
    }
  },
  {
    id: "preset-swapped-qr",
    title: "Starbucks Physical QR Sticker Tampering",
    tag: "QR Guardian Demo",
    description: "Physical counter branding displays Starbucks, but the QR code overlay routes funds to personal mule account `raju.kumar78@okaxis`.",
    category: "Swapped QR Sticker Scam",
    page: "qr-guardian",
    payload: {
      qr_text: "upi://pay?pa=raju.kumar78@okaxis&pn=Raju%20Kumar&mc=0000&mode=02",
      claimed_store_brand: "Tata Starbucks Pvt Ltd"
    }
  },
  {
    id: "preset-genuine-grocery",
    title: "Genuine Grocery Payment to Enrolled Merchant",
    tag: "Verified Safe",
    description: "Authentic in-store ₹140 payment to Chai Point Mountain Trail with verified enterprise registry credentials.",
    category: "Normal Legitimate Payment",
    page: "transaction-intel",
    payload: {
      amount: 140.0,
      sender_id: "user9821@oksbi",
      recipient_id: "chaipoint@yesbank",
      sender_prev_tx_count: 52,
      sender_avg_amount: 160.0,
      recipient_is_new: 0,
      recipient_risk_flag: 0,
      direction: "DEBIT",
      is_collect_request: 0,
      payment_context: "Chai and snacks at Chai Point Indiranagar"
    }
  },
  {
    id: "preset-digital-arrest",
    title: "TRAI / Cyber Cell Digital Arrest Coercion",
    tag: "NLP Deception Vector",
    description: "High-pressure authority impersonation claiming an Aadhaar-linked arrest warrant for money laundering.",
    category: "Digital Arrest / Authority Impersonation",
    page: "message-intel",
    payload: {
      text: "TRAI & Delhi Cyber Police: Your Aadhaar linked mobile number is involved in 17 illegal money laundering cases. An arrest warrant has been issued. Press 1 to connect with DCP Officer immediately to verify accounts.",
    }
  },
  {
    id: "preset-phishing-url",
    title: "Lookalike SBI NetBanking Typosquatted Domain",
    tag: "Link Scanner Demo",
    description: "Fake KYC portal mimicking State Bank of India hosted on disposable abuse-prone TLD `.top` with phishing path tokens.",
    category: "Phishing URL Analysis",
    page: "link-scanner",
    payload: {
      link: "https://onlinesbi-pan-kyc-verify.top/portal/update-card"
    }
  }
];
