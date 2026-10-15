"""
PaySentriX Backend Runner Script.
Starts Uvicorn server on port 8000.
"""

import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import uvicorn

if __name__ == "__main__":
    print("=" * 65)
    print("  PaySentriX AI Security Core — Starting Backend Server")
    print("  Tagline: 'Every Payment has a story, We find the Truth'")
    print("  API Server: http://localhost:8000")
    print("  API Docs:   http://localhost:8000/docs")
    print("=" * 65)
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=False)
