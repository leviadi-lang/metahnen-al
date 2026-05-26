# metahnen-al

מערכת AI תפעולית למשרד מתכנן פיננסי בישראל. סוכן על (Master Agent) + 4 תתי-סוכנים מתמחים + 7 כלים משותפים + אינטגרציה ל-Make.com, CRM ביטוחי, WhatsApp Official, Gmail, Google Calendar/Drive.

## 🚀 Quick start

```bash
npm install
cp .env.example .env          # set ANTHROPIC_API_KEY
npm run dev                   # http://localhost:3000
```

בדיקת חיים:

```bash
curl http://localhost:3000/health
```

## 🧠 ארכיטקטורה

```
Webhook (Make.com)
   ↓
Express Route (src/routes/)
   ↓
Master Orchestrator (src/orchestrator/master.ts)
   ↓ [Claude Opus 4.7 + route_to_agent tool]
   ↓
Sub-Agent (customer-service / sales / lead-intake / operations)
   ↓ [Claude Sonnet 4.6 + tool runner]
   ↓
Tool Handler (src/tools/) → Integration (src/integrations/) → Mock / Real Provider
```

| שכבה | קובצים |
|------|--------|
| Webhooks | `src/routes/{customer-message,lead,operations,health}.ts` |
| Master orchestrator | `src/orchestrator/{master,router,escalation}.ts` |
| Sub-agents | `src/agents/{customer-service,sales,lead-intake,operations}/index.ts` |
| Shared tools | `src/tools/*.ts` + `registry.ts` |
| Integrations | `src/integrations/{crm,whatsapp,gmail,calendar,drive}/{client.ts,mock.ts}` |
| Memory | `src/memory/store.ts` (in-memory; Redis-ready interface) |
| Prompts | `src/prompts/*.md` (Hebrew) |

## 📋 Scripts

| פקודה | מה היא עושה |
|-------|-------------|
| `npm run dev` | מריצה את ה-server עם hot-reload (`tsx watch`) |
| `npm run build` | קומפילציית TypeScript ל-`dist/` |
| `npm start` | מריצה את ה-build המקומפל |
| `npm test` | Vitest — בדיקות יחידה |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## 🔌 Webhooks (Make.com)

כל ה-endpoints מקבלים `POST` עם JSON.

### `/webhooks/customer-message`
הודעה נכנסת מלקוח (WhatsApp / Email / כלשהו) → Master מנתב לסוכן הנכון.

```json
{
  "channel": "whatsapp",
  "customer_id": "cust_001",
  "text": "היי, מתי הפגישה הבאה שלי?"
}
```

### `/webhooks/lead`
ליד חדש → ישירות ל-Lead Intake Agent (לא דרך Master).

```json
{
  "full_name": "שירה כהן",
  "phone": "0501234567",
  "email": "shira@example.co.il",
  "source": "facebook",
  "message": "מעוניינת בתכנון פנסיוני"
}
```

### `/webhooks/operations`
משימה תפעולית פנימית → Operations Agent.

```json
{
  "task_type": "classify_document",
  "customer_id": "cust_001",
  "description": "מסמך חדש שהגיע במייל",
  "attachments": [{ "name": "doc.pdf", "text": "..." }]
}
```

## 🔧 Models (סביבה)

| משתנה | ברירת מחדל | תפקיד |
|-------|------------|-------|
| `ANTHROPIC_MODEL_MASTER` | `claude-opus-4-7` | Master Agent — ניתוב + escalation |
| `ANTHROPIC_MODEL_SUBAGENT` | `claude-sonnet-4-6` | תתי-סוכנים — שירות, מכירות, וכו' |
| `ANTHROPIC_MODEL_CLASSIFIER` | `claude-haiku-4-5` | סיווג מסמכים |

## 🔄 החלפת mocks ל-providers אמיתיים

כל integration יושב מאחורי interface ב-`client.ts`:

```ts
// src/integrations/crm/client.ts
export interface CrmClient {
  getCustomer(id: string): Promise<Customer | null>;
  createProcess(input: CreateProcessInput): Promise<ProcessRecord>;
  // ...
}
```

ה-mock (`src/integrations/crm/mock.ts`) ממומש את ה-interface הזה. כדי להחליף ב-provider אמיתי:

1. הוסיפי `real.ts` באותה תיקייה שמיישם את ה-interface.
2. עדכני את הפונקציה `getCrmClient()` ב-`mock.ts` (או הזיזי אותה ל-factory חדש) שתחזיר את ה-real client כש-`CRM_PROVIDER=real`.
3. ה-tools (`src/tools/*.ts`) לא משתנים — הם רק קוראים ל-`getCrmClient()`.

אותו דפוס לכל ספק: WhatsApp, Gmail, Calendar, Drive.

## ⚖️ Compliance — קווים אדומים

- **אסור להמציא** סכומים, רגולציה, או פרטי לקוח.
- **אסור** לתת המלצת השקעה ספציפית ללא אישור בעל רישיון.
- **escalate** באוטומט: שאלה רגולטורית, משבר לקוח, ספק לגבי compliance, חסר נתון קריטי, בקשה ל-personal advice.
- כללי escalation דטרמיניסטיים — ראי `src/orchestrator/escalation.ts`.

## 📂 קישורי תיעוד

- ספציפיקציה מלאה (תרגום מהקובץ המקורי): `docs/spec/system-spec.md`
- ארכיטקטורה מפורטת: `docs/spec/architecture.md`
- חוזה Webhooks: `docs/api/webhooks.md`
- מפתחי integrations: `docs/integrations/`
- הוראות פרויקטיות לקלוד קוד: [`CLAUDE.md`](CLAUDE.md)

## 🧪 בדיקות

```bash
npm test
```

מכסה: כל ה-mocks, ה-memory store, hard-escalation rules, loader של ה-prompts, ו-server health.

## 📜 License

Private. Internal use only — CNT Financial.
