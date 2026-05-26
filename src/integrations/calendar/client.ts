export interface ScheduleMeetingInput {
  /** Hebrew title for the calendar event. */
  title: string;
  /** ISO 8601 start time. */
  start: string;
  /** ISO 8601 end time. */
  end: string;
  /** Attendee emails. */
  attendees: string[];
  /** Optional Hebrew description / agenda. */
  description?: string;
  /** Physical location or Zoom link. */
  location?: string;
}

export interface MeetingResult {
  event_id: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  provider: string;
  html_link?: string;
  start: string;
  end: string;
}

export interface CalendarClient {
  schedule(input: ScheduleMeetingInput): Promise<MeetingResult>;
  ping(): Promise<{ ok: true; provider: string }>;
}
