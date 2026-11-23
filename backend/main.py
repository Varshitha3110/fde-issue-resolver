from difflib import SequenceMatcher
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent_pipeline import run_fde_triage_agent
from database import fetch_all_logs, init_db, log_approved_ticket
from rag_engine import LocalPolicyRetriever

app = FastAPI(title="FDE AI Customer Issue Resolver API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
_retriever: LocalPolicyRetriever | None = None


def get_retriever() -> LocalPolicyRetriever:
    global _retriever
    if _retriever is None:
        _retriever = LocalPolicyRetriever("policies.md")
    return _retriever


class TriageRequest(BaseModel):
    order_id: str = ""
    complaint: str


class ApproveRequest(BaseModel):
    order_id: str
    complaint: str
    category: str
    priority: str
    sentiment: str
    assigned_queue: str
    sop_cited: str
    ai_draft: str
    final_approved_response: str
    latency_ms: int
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float


@app.post("/api/triage")
def triage_ticket(req: TriageRequest):
    if not req.complaint.strip():
        raise HTTPException(status_code=400, detail="Complaint text cannot be empty.")
    try:
        sops = get_retriever().retrieve(req.complaint)
        return run_fde_triage_agent(req.complaint, req.order_id, sops)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/approve")
def approve_ticket(req: ApproveRequest):
    similarity = SequenceMatcher(None, req.ai_draft, req.final_approved_response).ratio()
    edit_ratio = round(1.0 - similarity, 4)
    record = req.model_dump()
    record["edit_ratio"] = edit_ratio
    log_approved_ticket(record)
    return {"status": "approved", "edit_ratio": edit_ratio}


@app.get("/api/logs")
def get_logs():
    logs = fetch_all_logs()
    if not logs:
        return {
            "summary": {
                "total": 0,
                "avg_latency_ms": 0,
                "acceptance_rate": 100,
                "total_cost": 0,
            },
            "logs": [],
        }
    avg_latency = int(sum(l["latency_ms"] for l in logs) / len(logs))
    total_cost = round(sum(l["estimated_cost_usd"] for l in logs), 5)
    acceptance_rate = round(
        (1 - (sum(l["edit_ratio"] for l in logs) / len(logs))) * 100, 1
    )
    return {
        "summary": {
            "total": len(logs),
            "avg_latency_ms": avg_latency,
            "acceptance_rate": acceptance_rate,
            "total_cost": total_cost,
        },
        "logs": logs,
    }


@app.get("/api/policies")
def get_policies():
    policy_path = Path(__file__).resolve().parent / "policies.md"
    return {"content": policy_path.read_text(encoding="utf-8")}