"""
PaySentriX Audit History & Incident Reporting Service.
Stores forensic traces of all analyzed transactions, messages, URLs, contracts, and QR codes in SQLite.
Generates structured National Cybercrime 1930 incident drafts.
"""

import os
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.data.database import get_connection

class AuditHistoryService:
    def __init__(self):
        pass

    def record_analysis(
        self,
        analysis_type: str,
        input_summary: str,
        full_payload: Dict[str, Any],
        risk_score: float,
        risk_tier: str,
        prediction: str,
        category: str,
        contract_verdict: str = "N/A",
        explanation: str = "",
        evidence_flags: Optional[List[Any]] = None,
        police_draft: Optional[str] = None
    ) -> str:
        record_id = f"PSX-{analysis_type[:3]}-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO audit_records
        (id, timestamp, analysis_type, input_summary, full_payload, risk_score, risk_tier, prediction, category, contract_verdict, explanation, evidence_flags, police_draft)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record_id,
            timestamp,
            analysis_type.upper(),
            input_summary[:150],
            json.dumps(full_payload),
            risk_score,
            risk_tier.upper(),
            prediction,
            category,
            contract_verdict,
            explanation[:400],
            json.dumps(evidence_flags or []),
            police_draft
        ))
        conn.commit()
        conn.close()
        return record_id

    def get_records(
        self,
        analysis_type: Optional[str] = None,
        risk_tier: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM audit_records WHERE 1=1"
        params = []
        
        if analysis_type and analysis_type.upper() != "ALL":
            query += " AND analysis_type = ?"
            params.append(analysis_type.upper())
            
        if risk_tier and risk_tier.upper() != "ALL":
            query += " AND risk_tier = ?"
            params.append(risk_tier.upper())
            
        if search_query and search_query.strip():
            query += " AND (input_summary LIKE ? OR category LIKE ? OR id LIKE ?)"
            term = f"%{search_query.strip()}%"
            params.extend([term, term, term])
            
        # Count total
        count_query = f"SELECT COUNT(*) FROM ({query})"
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0]
        
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        records = []
        for r in rows:
            rec = dict(r)
            try:
                rec["evidence_flags"] = json.loads(rec["evidence_flags"])
            except Exception:
                rec["evidence_flags"] = []
            records.append(rec)
            
        conn.close()
        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "records": records
        }

    def get_record_by_id(self, record_id: str) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_records WHERE id = ?", (record_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
            
        rec = dict(row)
        try:
            rec["full_payload"] = json.loads(rec["full_payload"])
        except Exception:
            rec["full_payload"] = {}
        try:
            rec["evidence_flags"] = json.loads(rec["evidence_flags"])
        except Exception:
            rec["evidence_flags"] = []
            
        return rec

audit_service = AuditHistoryService()
