# AcmeCorp Customer Support SOPs

## 1. Payment & Failed Order Policy (SOP-PAY-01)
- If payment status is `CAPTURED` and order status is `UNCONFIRMED`, DO NOT issue an immediate refund. Trigger manual order reconciliation; orders typically sync within 2 hours.
- If payment status is `FAILED` and order status is `CANCELLED`, confirm no funds were settled and guide the customer to retry payment or use an alternate payment method.
- If payment status is `CAPTURED` and order status is `SHIPPED`, confirm the order is active and fulfilled rather than unconfirmed or cancelled.
- Only offer a 10% courtesy voucher if order reconciliation exceeds 4 hours.
- Never promise a refund timeline faster than 5–7 business days.

## 2. SLA & Escalation Matrix (SOP-SLA-02)
- Critical (P1): Payment deducted greater than $500 or account lockout for VIP tier. Target SLA: 15 minutes. Escalate to `Tier-2-Billing`.
- High (P2): Standard payment discrepancy, failed checkout, or defective item. Target SLA: 2 hours. Queue: `Billing-Ops`.
- Medium/Low (P3/P4): General status inquiries, shipping questions, or minor delays under 48 hours. Target SLA: 24 hours. Queue: `General-Support`.

## 3. Customer Communication & Tone Guidelines (SOP-COM-03)
- Acknowledge the customer's frustration with a calm, empathetic, and direct tone without over-promising outside SOP limits.
- Reference the Order ID and verified order/payment status clearly when available.
- State concrete next steps and expected timelines before closing the response.