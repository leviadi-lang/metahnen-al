# Webhooks contract

All endpoints accept `POST` with `Content-Type: application/json` and return `200 OK` with a JSON body. Validation errors return `400` with `{error, message, details}`.

## `POST /webhooks/customer-message`

**Use**: Make.com forwards an inbound customer message (WhatsApp / Email / etc.). The Master orchestrator routes to the right sub-agent.

**Request:**
```json
{
  "event_id": "wa_evt_abc123",                          // optional — generated if missing
  "channel": "whatsapp",                                 // whatsapp | email | webhook | internal
  "customer_id": "cust_001",                             // optional
  "text": "היי, מתי הפגישה הבאה שלי?",
  "payload": { "raw_make_event_id": "..." }              // optional pass-through
}
```

**Response (routed to a sub-agent):**
```json
{
  "routing": {
    "type": "agent",
    "agent": "customer_service",
    "reasoning": "..."
  },
  "agent_result": {
    "agent": "customer_service",
    "output_text": "...",
    "tool_calls": [{ "name": "send_whatsapp_message", "input": {...}, "output": null }],
    "stop_reason": "end_turn"
  }
}
```

**Response (escalation):**
```json
{
  "routing": { "type": "escalate", "reasoning": "...", "severity": "high" },
  "escalated": { "reason": "Legal threat / regulator complaint", "severity": "high" }
}
```

## `POST /webhooks/lead`

**Use**: A new lead arrives from a form / Facebook / referral. Lead Intake Agent runs validation, dedup, and CRM open.

**Request:**
```json
{
  "full_name": "שירה כהן",
  "phone": "0501234567",
  "email": "shira@example.co.il",                        // optional
  "source": "facebook",                                  // default: "webhook"
  "message": "מעוניינת בתכנון פנסיוני",                  // optional initial intent
  "metadata": { "campaign_id": "fb_q2_2026" }            // optional pass-through
}
```

**Response:**
```json
{
  "event_id": "lead_abc12345",
  "agent_result": {
    "agent": "lead_intake",
    "output_text": "...",
    "tool_calls": [{ "name": "create_crm_process", "input": {...}, "output": null }],
    "stop_reason": "end_turn"
  }
}
```

## `POST /webhooks/operations`

**Use**: Internal task (document classification, missing-doc chase, meeting summary). Operations Agent handles.

**Request:**
```json
{
  "task_type": "classify_document",                      // classify_document | document_chase | process_audit | meeting_summary | generic
  "customer_id": "cust_001",                             // optional
  "description": "מסמך חדש שהגיע במייל",
  "attachments": [
    { "name": "pension-statement.pdf", "text": "...OCR text..." }
  ],
  "metadata": {}                                         // optional
}
```

**Response:**
```json
{
  "event_id": "ops_abc12345",
  "agent_result": {
    "agent": "operations",
    "output_text": "...",
    "tool_calls": [{ "name": "classify_document", "input": {...}, "output": null }],
    "stop_reason": "end_turn"
  }
}
```

## `GET /health`

Liveness + integration mock status.

```json
{
  "ok": true,
  "integrations": {
    "crm": { "ok": true, "provider": "mock" },
    "whatsapp": { "ok": true, "provider": "mock" },
    "gmail": { "ok": true, "provider": "mock" },
    "calendar": { "ok": true, "provider": "mock" },
    "drive": { "ok": true, "provider": "mock" }
  },
  "timestamp": "2026-05-26T12:34:56.789Z"
}
```

## Notes

- **Idempotency**: Make.com may resend webhooks on transient failures. All CRM writes are idempotent (deduplicate by phone for `create_crm_process`).
- **Auth (planned)**: `WEBHOOK_SECRET` will validate HMAC signatures from Make.com — not enforced in this milestone.
- **Rate limiting (planned)**: Not enforced in this milestone.
- **Errors**: `400` for validation, `502` for integration errors, `500` for everything else. Always JSON.
