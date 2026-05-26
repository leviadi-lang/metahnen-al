# Make.com integration

Make.com is the orchestration engine — it triggers our webhooks, polls CRM, schedules retries, and stitches together external events. *Claude decides. Make executes. CRM stores.*

## Scenarios to build (out of scope for this codebase, lives in Make)

| Scenario | Trigger | Steps |
|---|---|---|
| **WhatsApp inbound** | Meta WhatsApp webhook | → `POST /webhooks/customer-message` → branch on `routing.type` → if `escalate` notify advisor on Slack/SMS |
| **Lead form submission** | Facebook Lead Ads / website form | → `POST /webhooks/lead` → branch on duplicate detection |
| **Daily document chase** | Cron (08:00) | → query CRM for customers with `missing` documents older than X days → `POST /webhooks/operations` with `task_type=document_chase` |
| **Meeting follow-up** | Calendar event ended | → `POST /webhooks/operations` with `task_type=meeting_summary` and the transcript |
| **CRM status changed** | CRM webhook | → email/Slack notification to advisor |

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
