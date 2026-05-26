import { describe, it, expect } from 'vitest';
import { MockWhatsappClient } from '../../src/integrations/whatsapp/mock.js';
import { MockGmailClient } from '../../src/integrations/gmail/mock.js';
import { MockCalendarClient } from '../../src/integrations/calendar/mock.js';
import { MockDriveClient } from '../../src/integrations/drive/mock.js';

describe('MockWhatsappClient', () => {
  it('records sent messages and returns queued status', async () => {
    const client = new MockWhatsappClient();
    const result = await client.send({
      to_phone: '0501234567',
      body: 'שלום, זו תזכורת למסמך חסר.',
    });
    expect(result.status).toBe('queued');
    expect(result.provider).toBe('mock');
    expect(result.to_phone).toBe('0501234567');
    expect(client.sent).toHaveLength(1);
  });
});

describe('MockGmailClient', () => {
  it('sends an email and assigns a message_id + thread_id', async () => {
    const client = new MockGmailClient();
    const result = await client.send({
      to: 'customer@example.co.il',
      subject: 'אישור פגישה',
      body_text: 'נפגשים מחר ב-10:00',
    });
    expect(result.status).toBe('sent');
    expect(result.message_id).toMatch(/^gm_/);
    expect(result.thread_id).toMatch(/^thr_/);
  });
});

describe('MockCalendarClient', () => {
  it('schedules an event with confirmed status', async () => {
    const client = new MockCalendarClient();
    const result = await client.schedule({
      title: 'פגישת ייעוץ פנסיוני',
      start: '2026-06-01T10:00:00+03:00',
      end: '2026-06-01T11:00:00+03:00',
      attendees: ['adi@cnt-fin.com', 'customer@example.co.il'],
    });
    expect(result.status).toBe('confirmed');
    expect(result.html_link).toMatch(/^https:/);
  });
});

describe('MockDriveClient', () => {
  it('uploads a file and returns retrievable metadata', async () => {
    const client = new MockDriveClient();
    const meta = await client.upload({
      name: 'pension-statement.pdf',
      mime_type: 'application/pdf',
    });
    expect(meta.file_id).toMatch(/^drv_/);

    const fetched = await client.getMetadata(meta.file_id);
    expect(fetched?.name).toBe('pension-statement.pdf');
  });

  it('returns null for unknown file ids', async () => {
    const client = new MockDriveClient();
    const fetched = await client.getMetadata('drv_does_not_exist');
    expect(fetched).toBeNull();
  });
});
