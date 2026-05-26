import { Router } from 'express';
import { getCrmClient } from '../integrations/crm/mock.js';
import { getWhatsappClient } from '../integrations/whatsapp/mock.js';
import { getGmailClient } from '../integrations/gmail/mock.js';
import { getCalendarClient } from '../integrations/calendar/mock.js';
import { getDriveClient } from '../integrations/drive/mock.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const [crm, wa, gm, cal, dr] = await Promise.all([
    getCrmClient().ping(),
    getWhatsappClient().ping(),
    getGmailClient().ping(),
    getCalendarClient().ping(),
    getDriveClient().ping(),
  ]);
  res.json({
    ok: true,
    integrations: { crm, whatsapp: wa, gmail: gm, calendar: cal, drive: dr },
    timestamp: new Date().toISOString(),
  });
});
