export interface SendWhatsappInput {
  to_phone: string;
  /** Hebrew text body. */
  body: string;
  /** Template name if outside 24h session window. */
  template_name?: string;
  /** Optional variables for templates. */
  template_variables?: Record<string, string>;
}

export interface WhatsappSendResult {
  message_id: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  provider: string;
  to_phone: string;
  timestamp: string;
}

export interface WhatsappClient {
  send(input: SendWhatsappInput): Promise<WhatsappSendResult>;
  ping(): Promise<{ ok: true; provider: string }>;
}
