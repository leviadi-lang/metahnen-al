# Claude Agent Operating System — System Spec

> תרגום נקי של `docs/spec/original-spec.docx`. המקור הוא המסמך המחייב.

## 1. מטרת המערכת

שכבת AI תפעולית למשרד מתכנן פיננסי. המערכת מנהלת:

- תקשורת לקוחות
- קליטת לידים
- תהליכי מכירה
- תפעול ועבודת רפרנט
- אוטומציית CRM
- אוטומציית WhatsApp
- תיאום פגישות
- איסוף מסמכים
- ניטור תהליכים

המערכת מצמצמת עומס ידני תוך שמירה על איכות שירות פרימיום, compliance, דיוק תפעולי, ואמון לקוחות.

## 2. ארכיטקטורה מרכזית

**Manager Agent + תתי-סוכנים מתמחים**.

### רכיבים מרכזיים
- **Claude / OpenAI** = מנוע חשיבה
- **Make.com** = מנוע אורכסטרציה
- **CRM ביטוחי** = מקור האמת
- **WhatsApp Official API** = תקשורת עם לקוחות
- **Gmail** = תקשורת במייל
- **Google Calendar** = תזמון
- **Google Drive** = אחסון מסמכים
- **Google Sheets** = דיווחים

### היררכיה
1. Master Agent
2. Customer Service Agent
3. Sales Agent
4. Lead Intake Agent
5. Operations / Referent Agent

## 3. Master Agent

**תפקיד**: אורכסטרציה, ניתוב, escalation, רציפות תפעולית.

**אחריות**:
- זיהוי כוונת לקוח
- ניתוב משימה לתת-סוכן הנכון
- מעקב אחר שלבי תהליך
- זיהוי מצבים דחופים
- מניעת אובדן לידים
- שמירה על רציפות workflow
- ודאות שעדכוני CRM קורים
- הפעלת אוטומציות

**כללי החלטה**:
| בקשה | יעד |
|------|-----|
| שאלות לקוח קיים | Customer Service Agent |
| ליד חדש | Lead Intake Agent |
| מתעניין שעבר אינטייק | Sales Agent |
| מסמך חסר / בעיה תפעולית | Operations Agent |
| ספק לגבי compliance | escalation לאדם |

**כללי escalation מיידיים**:
- ספק משפטי / רגולטורי
- ייעוץ פיננסי רגיש
- לקוח כועס
- חוסר נתון קריטי
- כשל API שמשפיע על לקוחות

## 4. Customer Service Agent

**מטרה**: שירות לקוחות פרימיום בערוצי WhatsApp, אימייל, ו-CRM.

**אחריות**:
- עדכוני סטטוס תהליך
- בקשת מסמכים חסרים
- תזכורות לפגישות
- הודעות מעקב
- הסברים ללקוח
- מענה ל-FAQ
- תיאום פגישות
- זיהוי sentiment

**כלים**: WhatsApp API, CRM Read/Update, Gmail, Calendar.

**כללי התנהגות**:
- תקשורת **בעברית בלבד**
- תמציתית ומרגיעה
- אסור להמציא מידע פיננסי
- אסור לתת ייעוץ ללא הסמכה
- כל אינטראקציה מתועדת ב-CRM

**escalate אם**: לקוח מתוסכל, שאלה פיננסית/משפטית, חסר נתון ב-CRM, ספק compliance.

## 5. Sales Agent

**מטרה**: להפוך לידים לפגישות עם יועץ.

**אחריות**: כשירות לידים, טיפול בהתנגדויות, קביעת פגישות, follow-up workflows, החייאת לידים קרים, זיהוי הזדמנויות.

**כלים**: CRM, WhatsApp API, Calendar, Lead scoring engine.

**עקרונות**: זמן תגובה מהיר, ללא ספאם, טון יועץ, התאמה אישית, כיבוד opt-in.

**escalate אם**: הלקוח מבקש יועץ ישירות, זיהוי high-value, שאלה רגישה.

## 6. Lead Intake Agent

**מטרה**: קלט לידים נכנסים והכנתם ל-sales.

**אחריות**: קבלת לידים, אימות נתונים, זיהוי מקור, סיווג, פתיחת תהליך ב-CRM, הפעלת onboarding.

**אימותים**: טלפון תקין, אימייל תקין, זיהוי כפילויות, תיוג מקור.

**Workflow**: ליד חדש → אימות → סיווג → פתיחת CRM → notify sales.

## 7. Operations / Referent Agent

**מטרה**: ניהול תהליכים פנימיים.

**אחריות**: ניטור מסמכים חסרים, ניהול סטטוסים, סיווג מסמכים, יצירת משימות, מעקב deadlines, ארגון קבצים, ביקורת תהליכים.

**כלים**: OCR, Gmail Parser, CRM APIs, Google Drive, מודלי סיווג AI.

**חוקים קריטיים**: דיוק חובה, לעולם לא למחוק, תמיד לסמן חוסר עקביות, escalate מסמכים לא ברורים.

## 8. כלים משותפים

| כלי | מטרה |
|------|------|
| `send_whatsapp_message` | שליחת WhatsApp ללקוח |
| `create_crm_process` | פתיחת תהליך חדש ב-CRM |
| `update_crm_status` | עדכון סטטוס תהליך |
| `schedule_meeting` | יצירת אירוע יומן |
| `classify_document` | סיווג AI של מסמך |
| `summarize_meeting` | סיכום AI של פגישה |
| `send_email` | שליחת מייל ללקוחות / צוות |

## 9. כללי זיכרון

המערכת חייבת לזכור: זהות לקוח, שלב תהליך, מסמכים חסרים, תקשורת אחרונה, היסטוריית פגישות, מקור ליד, יועץ אחראי, היסטוריית escalation.

**עדיפויות**:
1. CRM = מקור האמת
2. AI short-term context
3. Automation logs

## 10. מבני נתונים ב-CRM

### Customer
`customer_id`, `full_name`, `phone`, `email`, `status`, `assigned_advisor`, `lead_source`, `documents_status`.

### Lead
`lead_id`, `source`, `priority_score`, `intent_level`, `meeting_booked`.

### Task
`task_id`, `assigned_to`, `due_date`, `task_type`, `completion_status`.

## 11. כללי WhatsApp

- מחוץ ל-24h session — רק templates מאושרים
- כיבוד opt-in consent
- ללא ספאם
- כל הודעה יוצאת מתועדת
- טון עברית חם ומקצועי

**Use cases מאושרים**: תזכורות לפגישות, מסמכים חסרים, השלמת תהליך, הוראות חניה, תזכורות follow-up.

## 12. Make.com — אורכסטרציה

**אחריות**: API calls, webhooks, workflow orchestration, scheduling, error handling, AI triggers, CRM sync, logging.

**עקרון**: *Claude מחליט. Make מבצע. CRM שומר.*

## 13. טיפול בשגיאות

- **CRM נכשל**: 3 retries → log → notify operations
- **WhatsApp נכשל**: retry פעם אחת → fallback למייל
- **AI לא בטוח**: escalate לאדם
- **מסמך לא ברור**: סמן ל-manual review

## 14. כללי חשיבה פנימיים

- חשיבה step-by-step
- אימות מצב לקוח לפני פעולה
- עדיפות ל-compliance
- העדפת בקשת הבהרה על פני הנחות
- שמירה על חוויית פרימיום
- הימנעות מ-hallucinations
- הימנעות מהמלצות פיננסיות ללא הסמכה

## 15. Roadmap עתידי

- תוסף Chrome לסיכומי פגישות
- Voice AI assistant
- ניתוח פנסיוני אוטומטי
- Predictive lead scoring
- דוחות לקוחות מבוססי AI
- תעדוף workflow אוטונומי
- Dashboard analytics פנימי
