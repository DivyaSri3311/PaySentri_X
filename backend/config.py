"""
PaySentriX Application Configuration.
Centralized location for API keys, thresholds, and engine settings.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ==============================================================================
# GEMINI API KEY CONFIGURATION
# You can set your Gemini API Key in the .env file as GEMINI_API_KEY="your_key_here"
# OR paste it directly into the variable below:
# ==============================================================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Default Model Specifications (official google-genai SDK)
GEMINI_VISION_MODEL = "gemini-2.5-flash"

# ==============================================================================
# OPENAI API CONFIGURATION (Whisper Speech & Investigation Agent LLM)
# ==============================================================================
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_API_KEY = OPENAI_KEY
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_VISION_MODEL = os.getenv("OPENAI_VISION_MODEL", "gpt-4o-mini")
OPENAI_TIMEOUT_SECONDS = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "30"))

# GhostPay Evidence Forensics Limits
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB maximum
MIN_IMAGE_DIMENSION = 80                 # Minimum width and height in px
MAX_IMAGE_DIMENSION = 8000               # Maximum width and height in px

# NPCI UPI Commercial MCC Codes Reference
VALID_COMMERCIAL_MCC = {
    "5812": "Restaurants & Dining",
    "5814": "Fast Food & Cafes",
    "5411": "Grocery Stores & Supermarkets",
    "5912": "Drug Stores & Pharmacies",
    "4111": "Transportation & Rail",
    "5311": "Department Stores & E-Commerce",
    "5541": "Fuel Stations",
    "4900": "Utilities & Electric Power"
}
