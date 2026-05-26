import { randomUUID } from 'node:crypto';
import { logger } from '../../shared/logger.js';
import type { CalendarClient, MeetingResult, ScheduleMeetingInput } from './client.js';

export class MockCalendarClient implements CalendarClient {
  readonly scheduled: MeetingResult[] = [];

  async schedule(input: ScheduleMeetingInput): Promise<MeetingResult> {
    const eventId = `evt_${randomUUID().slice(0, 8)}`;
    const result: MeetingResult = {
      event_id: eventId,
      status: 'confirmed',
      provider: 'mock',
      html_link: `https://calendar.example.com/event/${eventId}`,
      start: input.start,
      end: input.end,
    };
    this.scheduled.push(result);
    logger.info(
      {
        eventId,
        title: input.title,
        start: input.start,
        attendeeCount: input.attendees.length,
      },
      'calendar.mock.schedule',
    );
    return result;
  }

  async ping(): Promise<{ ok: true; provider: string }> {
    return { ok: true, provider: 'mock' };
  }
}

let cached: CalendarClient | undefined;
export function getCalendarClient(): CalendarClient {
  if (!cached) cached = new MockCalendarClient();
  return cached;
}
export function resetCalendarClient(): void {
  cached = undefined;
}
