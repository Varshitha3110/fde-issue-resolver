# AcmeOps AI Customer Issue Resolver (FDE Workshop Edition)

A local Forward Deployed Engineer (FDE) prototype that triages customer support tickets using **Amazon Bedrock**, **Amazon Nova Pro**, and **Amazon Titan Text Embeddings v2**, paired with a light-themed **React + Vite** workbench and a **FastAPI + SQLite** backend.

> **Scope:** Built for local workshop execution (`localhost`) using your local AWS CLI credentials and SQLite persistence.

---

## Architecture Overview

1. **React Workbench (`http://localhost:5173`)**: Light-themed operations UI with three tabs:
   - **Agent Workbench**: Ticket intake, preset test scenarios, live agent execution trace, ERP ground-truth summary, internal runbook steps, and human-in-the-loop response editor.
   - **FDE Telemetry**: Tracks resolved ticket count, AI draft acceptance rate (computed via `SequenceMatcher` edit distance), average latency (`ms`), cumulative Bedrock cost, and an audit ledger.
   - **SOP Knowledge Base**: Displays the live `backend/policies.md` document.
2. **FastAPI Backend (`http://localhost:8000`)**: Exposes `/api/triage`, `/api/approve`, `/api/logs`, and `/api/policies` with lazy retriever initialization so startup stays resilient.
3. **Local SOP RAG (`backend/rag_engine.py`)**: Embeds chunks from `policies.md` using **Amazon Titan Text Embeddings v2** (`amazon.titan-embed-text-v2:0`) and ranks matches via cosine similarity.
4. **Agentic Tool Loop (`backend/agent_pipeline.py`)**: Uses the Bedrock `converse` API with **Amazon Nova Pro** (`amazon.nova-pro-v1:0`) and two tools:
   - `check_order_database`: Queries local SQLite (`fde_workspace.db`) for order and payment ground truth.
   - `finalize_triage_report`: Enforces structured triage fields, queue routing, SOP citation, runbook actions, and a drafted customer reply.

---

## Project Structure

```text
fde-issue-resolver/
├── README.md
├── backend/
│   ├── main.py             # FastAPI app & REST endpoints
│   ├── agent_pipeline.py   # Multi-turn Nova Pro Converse tool loop & telemetry
│   ├── rag_engine.py       # Titan Embeddings v2 local vector retrieval
│   ├── database.py         # SQLite mock ERP orders & ticket audit logs
│   ├── policies.md         # Company SOPs & escalation rules
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx
        └── main.jsx
```

---

## Prerequisites

- **Python 3.9+** and **Node.js 18+**
- **AWS CLI** configured with credentials that have `bedrock:InvokeModel` permission in a region supporting Nova Pro and Titan Embeddings v2 (default in code: `us-east-1`):
  ```bash
  aws sts get-caller-identity
  aws configure get region
  ```

---

## Running Locally

### 1. Start the Backend (`http://localhost:8000`)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start the Frontend (`http://localhost:5173`)

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## Seeded ERP Test Orders

`backend/database.py` initializes `fde_workspace.db` with three sample orders:

| Order ID | Customer Tier | Amount | Payment Status | Order Status |
| :--- | :--- | :--- | :--- | :--- |
| `ORD-1001` | VIP | `$650.00` | `CAPTURED` | `UNCONFIRMED` |
| `ORD-1002` | Standard | `$45.00` | `FAILED` | `CANCELLED` |
| `ORD-1003` | Standard | `$120.00` | `CAPTURED` | `SHIPPED` |

---

## API Smoke Test (`curl`)

With the backend running on port `8000`:

```bash
curl -s -X POST http://localhost:8000/api/triage \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ORD-1001","complaint":"My payment was deducted but order is unconfirmed."}' ; echo ""
```

---

## Production Migration Notes

- Swap local `sqlite3` order lookups and audit logging in `backend/database.py` for **Amazon DynamoDB** or **Amazon RDS**.
- Swap `LocalPolicyRetriever` in `backend/rag_engine.py` for **Amazon Bedrock Knowledge Bases** as policy documents scale.
- Add **Amazon Bedrock Guardrails** around `converse` calls for PII redaction and strict policy enforcement