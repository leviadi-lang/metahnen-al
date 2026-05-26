# Google Calendar integration

Calendar event creation for advisor + customer.

## Today

`src/integrations/calendar/mock.ts` returns confirmed events with synthetic `event_id` and HTML link.

## Switching to real

1. Add `real.ts` implementing `CalendarClient`.
2. Same Google OAuth credentials as Gmail (`GMAIL_*` env vars can be reused with the additional Calendar scope).
3. Use the Calendar API's `events.insert` endpoint with `calendarId` from `CALENDAR_ID` env var (default `primary`).
4. Set `conferenceData.createRequest` if you want auto-Meet link generation.

## Best practices

- Always create events in the office's timezone (Israel — `Asia/Jerusalem`).
- Set `sendUpdates: 'all'` so attendees get the standard Google invite.
- Default duration: 45 minutes (the office's standard slot).
- The `description` field should include a short Hebrew agenda from the Sales / Customer Service agent.
