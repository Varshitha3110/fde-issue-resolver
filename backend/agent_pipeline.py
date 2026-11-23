import json
import time
import boto3
from database import lookup_order_in_erp

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
MODEL_ID = "amazon.nova-pro-v1:0"

COST_PER_1K_INPUT = 0.0008
COST_PER_1K_OUTPUT = 0.0032

TOOLS = [
    {
        "toolSpec": {
            "name": "check_order_database",
            "description": "Queries the internal ERP database to verify payment_status, order_status, amount, and VIP tier.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "order_id": {
                            "type": "string",
                            "description": "Order ID such as ORD-1001",
                        }
                    },
                    "required": ["order_id"],
                },
            },
        }
    },
    {
        "toolSpec": {
            "name": "finalize_triage_report",
            "description": "Outputs the final structured triage decision, routing queue, SOP citation, and customer response.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": [
                                "Payment Issue",
                                "Delivery Delay",
                                "Account Access",
                                "Product Defect",
                                "General Inquiry",
                            ],
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["Low", "Medium", "High", "Critical"],
                        },
                        "sentiment": {
                            "type": "string",
                            "enum": ["Positive", "Neutral", "Negative", "Frustrated"],
                        },
                        "assigned_queue": {
                            "type": "string",
                            "enum": ["Tier-2-Billing", "Billing-Ops", "General-Support"],
                        },
                        "sop_cited": {"type": "string"},
                        "erp_verification_summary": {"type": "string"},
                        "suggested_resolution": {"type": "string"},
                        "customer_response": {"type": "string"},
                    },
                    "required": [
                        "category",
                        "priority",
                        "sentiment",
                        "assigned_queue",
                        "sop_cited",
                        "erp_verification_summary",
                        "suggested_resolution",
                        "customer_response",
                    ],
                },
            },
        }
    },
]


def run_fde_triage_agent(
    complaint: str, order_id: str, retrieved_chunks: list[dict]
) -> dict:
    start_time = time.perf_counter()
    total_in_tokens = 0
    total_out_tokens = 0

    top_score = retrieved_chunks[0]["score"] if retrieved_chunks else 0.0
    agent_trace = [
        {
            "step": 1,
            "type": "rag",
            "title": "Amazon Titan Embeddings v2 Retrieval",
            "detail": f"Retrieved {len(retrieved_chunks)} SOP chunks (top similarity: {top_score})",
        }
    ]

    sop_context = (
        "\n\n---\n\n".join([c["text"] for c in retrieved_chunks])
        if retrieved_chunks
        else "No matching SOP chunks retrieved."
    )

    system_prompt = [
        {
            "text": (
                "You are an enterprise Customer Operations AI Agent. Follow these steps strictly:\n"
                "1. If an Order ID is provided, ALWAYS call `check_order_database` first to verify ground-truth payment and order status.\n"
                "2. Cross-reference the ERP findings against the retrieved Company SOPs below.\n"
                "3. Call `finalize_triage_report` with accurate routing, SOP citations, internal resolution steps, and a polite customer response.\n\n"
                f"=== RETRIEVED COMPANY SOPs ===\n{sop_context}"
            )
        }
    ]

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "text": f"Order ID: {order_id or 'Not Provided'}\nCustomer Complaint: {complaint}"
                }
            ],
        }
    ]

    for turn in range(4):
        response = bedrock.converse(
            modelId=MODEL_ID,
            messages=messages,
            system=system_prompt,
            toolConfig={"tools": TOOLS},
            inferenceConfig={"temperature": 0.1, "maxTokens": 1200},
        )

        usage = response.get("usage", {})
        total_in_tokens += usage.get("inputTokens", 0)
        total_out_tokens += usage.get("outputTokens", 0)

        output_msg = response["output"]["message"]
        messages.append(output_msg)

        tool_results = []
        for block in output_msg["content"]:
            if "toolUse" in block:
                tool_use = block["toolUse"]
                name = tool_use["name"]
                tool_input = tool_use["input"]
                tool_id = tool_use["toolUseId"]

                if name == "check_order_database":
                    erp_data = lookup_order_in_erp(tool_input["order_id"])
                    agent_trace.append(
                        {
                            "step": len(agent_trace) + 1,
                            "type": "tool",
                            "title": f"ERP Tool Call: check_order_database({tool_input['order_id']})",
                            "detail": json.dumps(erp_data),
                        }
                    )
                    tool_results.append(
                        {
                            "toolResult": {
                                "toolUseId": tool_id,
                                "content": [{"json": erp_data}],
                            }
                        }
                    )

                elif name == "finalize_triage_report":
                    latency_ms = int((time.perf_counter() - start_time) * 1000)
                    cost = ((total_in_tokens / 1000) * COST_PER_1K_INPUT) + (
                        (total_out_tokens / 1000) * COST_PER_1K_OUTPUT
                    )
                    agent_trace.append(
                        {
                            "step": len(agent_trace) + 1,
                            "type": "decision",
                            "title": f"Amazon Nova Pro Policy Synthesis ({tool_input['sop_cited']})",
                            "detail": f"Routed to {tool_input['assigned_queue']} as {tool_input['priority']} priority.",
                        }
                    )

                    return {
                        "result": tool_input,
                        "trace": agent_trace,
                        "retrieved_sops": retrieved_chunks,
                        "metrics": {
                            "latency_ms": latency_ms,
                            "input_tokens": total_in_tokens,
                            "output_tokens": total_out_tokens,
                            "estimated_cost_usd": round(cost, 6),
                        },
                    }

        if tool_results:
            messages.append({"role": "user", "content": tool_results})

    raise RuntimeError("Agent failed to converge on a final triage report.")