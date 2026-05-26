# Gmail integration

Google OAuth-based email sending and parsing.

## Today

`src/integrations/gmail/mock.ts` returns synthetic `message_id` and `thread_id` values.

## Switching to real

1. Add `real.ts` implementing `GmailClient`.
2. OAuth flow: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` from env.
3. Use the Gmail API's `users.messages.send` endpoint.
4. For inbound (replies from customers): build a Make.com scenario that polls the Inbox or subscribes to Gmail push notifications (Pub/Sub) and forwards parsed messages to `/webhooks/customer-message`.

## Inbound parsing

The Operations agent's `summarize_meeting` tool can process meeting notes that arrive via email. For routing inbound *customer* emails, Make.com should extract the body and POST to `/webhooks/customer-message`.
