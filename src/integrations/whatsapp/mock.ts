import { randomUUID } from 'node:crypto';
import { logger } from '../../shared/logger.js';
import type { SendWhatsappInput, WhatsappClient, WhatsappSendResult } from './client.js';

export class MockWhatsappClient implements WhatsappClient {
  /** All sent messages — exposed for tests/inspection. */
  readonly sent: WhatsappSendResult[] = [];

  async send(input: SendWhatsappInput): Promise<WhatsappSendResult> {
    const result: WhatsappSendResult = {
      message_id: `wa_${randomUUID().slice(0, 8)}`,
      status: 'queued',
      provider: 'mock',
      to_phone: input.to_phone,
      timestamp: new Date().toISOString(),
    };
    this.sent.push(result);
    logger.info(
      {
        messageId: result.message_id,
        to: input.to_phone,
        template: input.template_name,
        bodyPreview: input.body.slice(0, 60),
      },
      'whatsapp.mock.send',
    );
    return result;
  }

  async ping(): Promise<{ ok: true; provider: string }> {
    return { ok: true, provider: 'mock' };
  }
}

let cached: WhatsappClient | undefined;
export function getWhatsappClient(): WhatsappClient {
  if (!cached) cached = new MockWhatsappClient();
  return cached;
}
export function resetWhatsappClient(): void {
  cached = undefined;
}
