import { randomUUID } from 'node:crypto';
import { logger } from '../../shared/logger.js';
import type { EmailSendResult, GmailClient, SendEmailInput } from './client.js';

export class MockGmailClient implements GmailClient {
  readonly sent: EmailSendResult[] = [];

  async send(input: SendEmailInput): Promise<EmailSendResult> {
    const result: EmailSendResult = {
      message_id: `gm_${randomUUID().slice(0, 8)}`,
      thread_id: `thr_${randomUUID().slice(0, 8)}`,
      status: 'sent',
      provider: 'mock',
      to: input.to,
      timestamp: new Date().toISOString(),
    };
    this.sent.push(result);
    logger.info(
      {
        messageId: result.message_id,
        to: input.to,
        subject: input.subject,
      },
      'gmail.mock.send',
    );
    return result;
  }

  async ping(): Promise<{ ok: true; provider: string }> {
    return { ok: true, provider: 'mock' };
  }
}

let cached: GmailClient | undefined;
export function getGmailClient(): GmailClient {
  if (!cached) cached = new MockGmailClient();
  return cached;
}
export function resetGmailClient(): void {
  cached = undefined;
}
