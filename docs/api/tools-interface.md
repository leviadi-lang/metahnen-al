# Shared tools — interface

The 7 tools listed in the spec, registered in `src/tools/registry.ts`. Each is a `betaZodTool` with a Zod schema for inputs; the SDK generates the Anthropic JSON schema automatically.

## `send_whatsapp_message`
Send a WhatsApp message to a customer in Hebrew. Approved templates required outside the 24h customer session window. Returns `message_id`.

| Field | Type | Notes |
|---|---|---|
| `to_phone` | string | Israeli phone, e.g. `0501234567` |
| `body` | string | Hebrew text (≤ 4096 chars) |
| `template_name` | string? | Approved template (required outside 24h window) |
| `template_variables` | record<string,string>? | Substitutions |

## `send_email`
Send an email to a customer or internal staff. Customer-facing subjects/bodies in Hebrew.

| Field | Type | Notes |
|---|---|---|
| `to` | string | RFC-valid email |
| `subject` | string | Hebrew |
| `body_text` | string | Plain text |
| `body_html` | string? | Optional |
| `cc`, `bcc` | string[]? | Optional |

## `create_crm_process`
Open a new customer process in the CRM. Idempotent — reuses customer when phone matches.

| Field | Type | Notes |
|---|---|---|
| `full_name` | string | Hebrew |
| `phone` | string | Israeli |
| `email` | string? | Optional |
| `lead_source` | string | facebook / google / referral / organic / walk_in |
| `process_type` | enum | pension_transfer, severance, retirement_plan, gemel_setup, investment_policy, general_consultation, unknown |
| `initial_notes` | string? | Hebrew |

## `update_crm_status`
Update a customer/process status, stage, and document statuses.

| Field | Type | Notes |
|---|---|---|
| `customer_id` | string? | Required if `process_id` not given |
| `process_id` | string? | Required if `customer_id` not given |
| `new_status` | enum? | new, active, pending_docs, pending_signature, closed, inactive |
| `new_stage` | string? | Free text |
| `document_updates` | record<string, DocumentStatus>? | document_type → received/missing/rejected/expired/reminder_sent |
| `note` | string? | Hebrew/English reasoning |

## `schedule_meeting`
Create a calendar event for customer + advisor.

| Field | Type | Notes |
|---|---|---|
| `title` | string | Hebrew |
| `start`, `end` | ISO 8601 | With timezone offset |
| `attendees` | string[] | At least one email |
| `description` | string? | Hebrew agenda |
| `location` | string? | Address or Zoom/Meet link |

## `classify_document`
Classify OCR'd document text using Claude Haiku 4.5. Returns document_type, confidence, reasoning, Hebrew label, and `requires_review` flag (true if confidence < 0.75).

| Field | Type | Notes |
|---|---|---|
| `document_text` | string | OCR output (≤ 8000 chars used) |
| `filename` | string? | Context for the classifier |

**Output document types**: `id_card`, `pension_statement`, `gemel_statement`, `policy_document`, `loan_document`, `severance_form`, `salary_slip`, `medical_form`, `power_of_attorney`, `unknown`.

## `summarize_meeting`
Summarize a Hebrew meeting transcript into structured JSON (key_topics, decisions, action_items, open_questions, Hebrew summary).

| Field | Type | Notes |
|---|---|---|
| `transcript` | string | Hebrew text |
| `customer_name` | string? | Hebrew |
| `meeting_date` | string? | ISO 8601 or Hebrew |

## Tool access matrix per sub-agent

| Tool | Customer Service | Sales | Lead Intake | Operations |
|---|:---:|:---:|:---:|:---:|
| `send_whatsapp_message` | ✓ | ✓ | ✓ | — |
| `send_email` | ✓ | ✓ | ✓ | ✓ |
| `create_crm_process` | — | — | ✓ | — |
| `update_crm_status` | ✓ | ✓ | — | ✓ |
| `schedule_meeting` | ✓ | ✓ | — | — |
| `classify_document` | — | — | — | ✓ |
| `summarize_meeting` | — | — | — | ✓ |

Defined in `src/agents/<name>/index.ts` via the `XXX_TOOLS` constant.
