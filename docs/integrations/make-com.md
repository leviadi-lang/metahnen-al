# Make.com integration

Make.com is the orchestration engine — it triggers our webhooks, polls CRM, schedules retries, and stitches together external events. *Claude decides. Make executes. CRM stores.*

## Scenarios to build (out of scope for this codebase, lives in Make)

| Scenario | Trigger | Steps |
|---|---|---|
| **MVP-1 — Lead intake** | Facebook Lead Ads / website form / referral | See [MVP-1 — Lead intake scenario](#mvp-1--lead-intake-scenario) below |
| **WhatsApp inbound** | Meta WhatsApp webhook | → `POST /webhooks/customer-message` → branch on `routing.type` → if `escalate` notify advisor on Slack/SMS |
| **Daily document chase** | Cron (08:00) | → query CRM for customers with `missing` documents older than X days → `POST /webhooks/operations` with `task_type=document_chase` |
| **Meeting follow-up** | Calendar event ended | → `POST /webhooks/operations` with `task_type=meeting_summary` and the transcript |
| **CRM status changed** | CRM webhook | → email/Slack notification to advisor |

## MVP-1 — Lead intake scenario

This is the first scenario you should build in Make.com. End result: every new lead lands in the CRM, gets a Hebrew welcome WhatsApp, the advisor gets an email notification, and a follow-up task is scheduled — all within the SLA.

### Trigger options

Any of these can fire the scenario:
- **Facebook Lead Ads** → "Watch Leads" module
- **Website form** (Typeform / Google Form / custom) → "Custom webhook" trigger
- **Referral / manual entry** → "Custom webhook" trigger

### Field mapping → `POST /webhooks/lead`

| Lead source field | Webhook body field | Notes |
|---|---|---|
| Full name | `full_name` | Required. Hebrew or English. |
| Phone | `phone` | Required. Israeli format (e.g. `0501234567` or `972501234567`). |
| Email | `email` | Optional. Validated as RFC email. |
| UTM source / campaign | `source` | Required. Use values like `facebook`, `google`, `referral`, `organic`. |
| Free-form message | `message` | Optional. Hebrew text. |
| Anything else | `metadata` | Optional. Pass through as JSON object — campaign IDs, UTM tags, form name. |

### Module chain

1. **Trigger** (Facebook / Webhook / etc.)
2. **HTTP — Make a request**:
   - Method: `POST`
   - URL: `https://<your-host>/webhooks/lead`
   - Headers: `Content-Type: application/json`
   - Body: JSON mapped from the trigger fields above
   - Timeout: 60s (the agent loop may take 10-30s)
3. **Router** on the response:
   - If `routing` field exists with `type: "escalate"` → branch to "Escalation" path: send Slack/SMS to advisor with the reason and severity. *(Currently `/webhooks/lead` does not invoke the Master — escalation will only happen from `/webhooks/customer-message`. Reserved for future use.)*
   - Otherwise → "Success" path:
     - Inspect `agent_result.tool_calls` array. Expect 4 entries: `create_crm_process`, `send_whatsapp_message`, `send_email`, `create_followup_task`.
     - Optionally log the run to a Google Sheet for daily review.
     - Done.

### Retry policy

- Make.com default: 3 retries with exponential backoff (60s → 5min → 30min).
- The webhook handler is idempotent at the CRM level (`create_crm_process` dedups by phone). Safe to retry.
- If the agent fails mid-flow (e.g. WhatsApp send works but task creation fails), the **whole scenario** retries — the Lead Intake agent will re-detect the existing process and only execute the missing steps. The mock WhatsApp client may double-send in this case; the real provider should be configured to dedup by `event_id`.

### Response shape (success)

```json
{
  "event_id": "lead_abc12345",
  "agent_result": {
    "agent": "lead_intake",
    "output_text": "...",
    "tool_calls": [
      { "name": "create_crm_process",     "input": { /* ... */ }, "output": null },
      { "name": "send_whatsapp_message",  "input": { /* ... */ }, "output": null },
      { "name": "send_email",             "input": { /* ... */ }, "output": null },
      { "name": "create_followup_task",   "input": { /* ... */ }, "output": null }
    ],
    "stop_reason": "end_turn"
  }
}
```

### Edge cases

- **Duplicate lead** (same phone already in CRM): `create_crm_process` returns the existing `customer_id`. The agent should *not* send a second welcome WhatsApp — the prompt allows it to skip the welcome if the lead is a re-engagement of an existing customer.
- **Missing email**: `send_email` uses the `ADVISOR_NOTIFICATION_EMAIL` env var — independent of whether the *lead* has an email. So the advisor notification always fires.
- **Hot lead** (intent_level=hot, e.g. asks for an immediate meeting): the agent should still complete the 4-step flow, but include an extra Hebrew sentence in the email subject: `[HOT] חדש: ...` so the advisor prioritizes.

## Authentication

Today: none (dev). Production: HMAC-signed header validated against `WEBHOOK_SECRET`.

## Idempotency

Make.com retries on transient failures. Pass `event_id` from Make's run UUID; we'll deduplicate using it once persistent memory is wired up (in this milestone the in-memory store dedups within a process lifetime).

## Retry policy (Make side)

Per spec §13:
- CRM operations: 3 retries
- WhatsApp: 1 retry → fallback to email
- AI uncertainty: do not retry — escalate to human

Configure these as branch logic in each scenario.

## Useful Make.com modules

- **Webhook** (custom webhook trigger)
- **HTTP — Make a request** (to call our endpoints)
- **Parser — Parse JSON** (responses)
- **Data store** (for dedup state across scenarios)
- **Slack** / **Email** (for escalations and notifications)
