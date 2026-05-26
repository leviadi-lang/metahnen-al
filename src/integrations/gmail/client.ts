export interface SendEmailInput {
  to: string;
  subject: string;
  /** Hebrew or English text body. */
  body_text: string;
  /** Optional HTML body. */
  body_html?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailSendResult {
  message_id: string;
  thread_id?: string;
  status: 'queued' | 'sent' | 'failed';
  provider: string;
  to: string;
  timestamp: string;
}

export interface GmailClient {
  send(input: SendEmailInput): Promise<EmailSendResult>;
  ping(): Promise<{ ok: true; provider: string }>;
}
