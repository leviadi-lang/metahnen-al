# CLAUDE.md — הוראות לקלוד קוד

מסמך זה הוא ההנחיות המרכזיות לכל סשן של Claude Code שעובד בפרויקט הזה.

## תיאור הפרויקט

מערכת AI תפעולית למשרד מתכנן פיננסי בישראל: **Master Agent + 4 תתי-סוכנים מתמחים** + 7 כלים משותפים + אינטגרציה ל-Make.com, CRM ביטוחי, WhatsApp Official, Gmail, Google Calendar/Drive.

הספציפיקציה המלאה: [`docs/spec/system-spec.md`](docs/spec/system-spec.md) (המקור: `docs/spec/original-spec.docx`).

## כללי עבודה מחייבים

### תקשורת
- **כל פלט שמופנה ללקוח חיצוני (WhatsApp/Email/SMS) — בעברית בלבד**, טון חם ומקצועי, לא רשמי מדי
- **תקשורת איתי (עדי) במהלך פיתוח** — עברית
- קוד, שמות משתנים, log messages, וקבצי תיעוד טכניים — אנגלית

### Compliance ובטיחות פיננסית
- **אסור להמציא** מספרים, רגולציה, ייעוץ פנסיוני או כל מידע פיננסי שלא קיים בקלט
- **לעולם לא** לתת המלצת השקעה ספציפית מבלי הסכמה מפורשת של בעל רישיון
- **escalate לאדם** בכל מקרה של: שאלה רגולטורית, משבר לקוח, ספק לגבי compliance, חוסר נתונים קריטיים, בקשת ייעוץ אישי

### מבנה הקוד
- TypeScript strict, ESM modules
- כל סוכן יושב ב-`src/agents/<name>/` עם `prompt.ts`, `tools.ts`, `index.ts`
- כל כלי ב-`src/tools/<name>.ts` — Anthropic tool schema + handler
- כל ספק חיצוני: interface ב-`client.ts` + mock ב-`mock.ts` תחת `src/integrations/<provider>/`
- אל תוסיף תלות חדשה ללא בדיקה — בדוק תחילה ב-`package.json`

### Git
- **לעולם לא** לעשות commit לקבצי תוכן גלם (PDFs, MP4, PPTX, DOCX) חוץ מ-`docs/spec/original-spec.docx`
- `.env` לא נכנס ל-git לעולם
- ענפי פיצ'ר: `feat/<תיאור>`, תיקונים: `fix/<תיאור>`

### בדיקות
- כל כלי חייב lest unit test
- אינטגרציות חיצוניות נבדקות עם mock implementations
- `npm test` חייב לעבור לפני push

## ארכיטקטורה (סקירה מהירה)

```
Webhook (Make.com)
   ↓
Express Route (src/routes/)
   ↓
Master Orchestrator (src/orchestrator/master.ts)
   ↓ [Claude API + tool: route_to_agent]
   ↓
Sub-Agent (customer-service / sales / lead-intake / operations)
   ↓ [Claude API + tools]
   ↓
Tool Handler (src/tools/) → Integration (src/integrations/) → Mock / Real Provider
```

## מודלים

- **Master Agent**: `claude-opus-4-7` (הכי חזק, מקבל את כל הקונטקסט)
- **Sub-Agents**: `claude-sonnet-4-6` (מאוזן עלות/ביצוע)
- **Document classification**: `claude-haiku-4-5-20251001` (מהיר וזול)

ניתן לדרוס דרך משתני סביבה: `ANTHROPIC_MODEL_MASTER`, `ANTHROPIC_MODEL_SUBAGENT`.

## כללי פיתוח

1. **לפני שינוי משמעותי** — ודאי שיש בדיקה שמכסה את הנתיב
2. **לפני שמכניסים provider אמיתי** — ודאי שה-interface נשמר וה-mock עדיין עובר את הבדיקות
3. **לפני כל commit** — `npm run typecheck && npm test && npm run lint`
4. **אל תוסיף קבצים לתיקיות הגלם** (`דשבורד תפעול/`, `מסמכים פרוייקט עדי/`, `data/`) — הן ב-gitignore

## קישורים

- ספציפיקציה: [`docs/spec/system-spec.md`](docs/spec/system-spec.md)
- ארכיטקטורה: [`docs/spec/architecture.md`](docs/spec/architecture.md)
- API חוזים: [`docs/api/`](docs/api/)
- אינטגרציות: [`docs/integrations/`](docs/integrations/)
