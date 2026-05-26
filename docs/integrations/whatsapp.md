# WhatsApp integration

WhatsApp Business API (Meta), accessed either directly or through a provider (Twilio / 360dialog / MessageBird).

## Today

`src/integrations/whatsapp/mock.ts` implements `WhatsappClient` — records messages in memory and returns synthetic `message_id` values. The mock does not enforce the 24-hour session rule; the **agent prompts** do.

## Switching to a real provider

1. Add `src/integrations/whatsapp/real.ts` implementing `WhatsappClient`.
2. Enforce the 24h session rule: if a customer hasn't messaged in 24 hours, refuse free-form text and require a `template_name`.
3. Add retry: 1 attempt → fallback to email (per spec §13).
4. Use `WHATSAPP_PHONE_ID` and `WHATSAPP_ACCESS_TOKEN` env vars.
5. Log every outbound message to the CRM (via `update_crm_status`), per spec §11.

## Approved templates (to register with Meta)

Per spec §11:
- Appointment reminder
- Missing document request
- Process completion notification
- Parking instructions
- Follow-up reminder

Template body text should be in Hebrew, with variables like `{{1}}` for the customer's first name.

## Opt-in / opt-out

The provider should expose webhooks for opt-out. Our agents must respect them — see `src/orchestrator/router.ts` and the `compliance-check` skill.
