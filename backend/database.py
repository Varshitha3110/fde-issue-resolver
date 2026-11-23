import sqlite3
from datetime import datetime, timezone

DB_PATH = "fde_workspace.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            customer_name TEXT,
            customer_tier TEXT,
            amount REAL,
            payment_status TEXT,
            order_status TEXT
        )
    """)
    mock_orders = [
        ("ORD-1001", "Aarav Sharma", "VIP", 650.00, "CAPTURED", "UNCONFIRMED"),
        ("ORD-1002", "Priya Nair", "Standard", 45.00, "FAILED", "CANCELLED"),
        ("ORD-1003", "Rohan Verma", "Standard", 120.00, "CAPTURED", "SHIPPED")
    ]
    c.executemany("INSERT OR IGNORE INTO orders VALUES (?, ?, ?, ?, ?, ?)", mock_orders)

    c.execute("""
        CREATE TABLE IF NOT EXISTS ticket_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            order_id TEXT,
            complaint TEXT,
            category TEXT,
            priority TEXT,
            sentiment TEXT,
            assigned_queue TEXT,
            sop_cited TEXT,
            ai_draft TEXT,
            final_approved_response TEXT,
            edit_ratio REAL,
            latency_ms INTEGER,
            input_tokens INTEGER,
            output_tokens INTEGER,
            estimated_cost_usd REAL
        )
    """)
    conn.commit()
    conn.close()

def lookup_order_in_erp(order_id: str) -> dict:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE order_id = ?", (order_id.strip().upper(),))
    row = c.fetchone()
    conn.close()
    if not row:
        return {"found": False, "message": f"No ERP record found for {order_id}"}
    return {
        "found": True,
        "order_id": row[0],
        "customer_name": row[1],
        "customer_tier": row[2],
        "amount_usd": row[3],
        "payment_status": row[4],
        "order_status": row[5]
    }

def log_approved_ticket(record: dict):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO ticket_logs (
            timestamp, order_id, complaint, category, priority, sentiment,
            assigned_queue, sop_cited, ai_draft, final_approved_response,
            edit_ratio, latency_ms, input_tokens, output_tokens, estimated_cost_usd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        datetime.now(timezone.utc).isoformat(),
        record["order_id"], record["complaint"], record["category"],
        record["priority"], record["sentiment"], record["assigned_queue"],
        record["sop_cited"], record["ai_draft"], record["final_approved_response"],
        record["edit_ratio"], record["latency_ms"], record["input_tokens"],
        record["output_tokens"], record["estimated_cost_usd"]
    ))
    conn.commit()
    conn.close()

def fetch_all_logs():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM ticket_logs ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]