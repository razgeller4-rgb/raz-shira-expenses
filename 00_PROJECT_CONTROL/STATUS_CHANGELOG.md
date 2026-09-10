# Status Changelog

> **פורמט:** הרשומה החדשה ביותר תמיד בראש. לא מוחקים רשומות ישנות — גם אם התברר שהן שגויות, מסמנים ולא מוחקים.

## 2026-09-10 (ג) — בדיקת דמו באייפון · באג בסנכרון "טופל" נמצא ותוקן

רז בדק את `DEMO_CHECK_LIST.md` בפועל באייפון. **3 מתוך 4 סעיפים עברו נקי.** סעיף 2 (אימות `goals` בקובץ ייצוא) הוחלף באימות קוד — `exportBackup()` בונה מ-`getBackupKeys()` שכוללת בהכרח את `goals_v1`, אין צורך בחיפוש ידני.

**סעיף 3 נכשל:** פריט שסומן "טופל" בדשבורד חזר אחרי רענון. **נמצא הגורם:** `dismissReviewItem()` (שורה 6091) כתב ל-`localStorage` אבל לא קרא ל-`markLocalDataChanged()`/`scheduleCloudSync()` כמו כל פונקציית שמירה אחרת באפליקציה — הדחיפה לענן מעולם לא קרתה, וברענון `pullCloudSnapshot()` דרס את הסימון המקומי בגרסה הישנה מהענן.

**תוקן בדמו בלבד** (שתי שורות, זהה לתבנית הקיימת בכל שאר פונקציות השמירה). תועד כ-`F-14` ב-`RESEARCH_LOG_AND_LESSONS.md`. **ממתין רטסט של סעיף 3 בלבד** מהאייפון לפני מעבר לשלב 0 (העברת 3 הקומיטים + התיקון הזה ל-production).

---

## 2026-09-10 (ב) — מיפוי מלא בחמישה חלקים · ממצא קריטי ב-production · תכנית אב

**נוצרו 7 מסמכים:** `PRODUCT_SURFACE_MAP_V2` · `DATA_MODEL_MAP` · `CALC_LOGIC_MAP` · `STATE_VS_TARGET_MAP` · `AGENTS_AND_TOOLING_MAP` · `RESEARCH_LOG_AND_LESSONS` · `MASTER_PLAN_TO_FINISHED_APP`.

**🔴 הממצא המרכזי — אובדן נתונים פעיל ב-production.** `getAllUserStorageKeys()` מכיל 11 מפתחות בדמו (שורה 2727) ורק **7** ב-`expense-app-v37.html` (שורה 2707). טאב היעדים **עובד** ב-production וכותב ל-`localStorage` (שורה 3412), אבל `expense_app_goals_v1` אינו ברשימת הסנכרון — ולכן **לא עולה לענן ולא נכנס לייצוא הגיבוי**. אותו דבר ל-`expense_app_merchant_memory_v1` (שורה 4864). בנוסף, הגנת `QuotaExceeded` מ-`d87d2c0` חסרה ב-v37 (`grep -c` → demo 1, v37 0). **המשמעות:** 3 הקומיטים שממתינים אינם שיפורי נוחות אלא תיקוני אובדן נתונים; `NA-A` עולה מ"רצוי" ל"דחוף".

**ממצאים נוספים:** 10 טאבים ולא 9 (`goals` לא היה מתועד) · 3 מפתחות `localStorage` ללא namespace · RLS פתוח ל-anon (הפרדה ב-client בלבד) · 4 חשדות בלוגיקת חישוב, הבולט — יתרת פתיחה מותנית ב-`currentUser === "raz"` (שורה 5206) ולכן שירה כנראה בלי יתרה ובלי תחזית · 2 סוכנים עם הרשאות רחבות מדי.

**תיקון עצמי:** הצהרתי ש-`design-critique` אינו קיים. **טעות** — הוא קיים, יחד עם 58 skills נוספים, ב-`~/Library/Application Support/Claude/local-agent-mode-sessions/…/rpm/plugin_*/skills/`. החיפוש שלי כיסה רק את `~/.claude` ואת הבינארי. הלקח נרשם כ-`L-3`: לפני שמצהירים ש-skill לא קיים — להריץ אותו. **מה שכן אומת בהרצה:** הפלט הוא checklist עם placeholders ולא מדידה — `L-4`.

**תיקון זיכרון:** סיכון הסליקה המשותפת (היעדר tombstones + id חלש) **נסגר** — tombstones בשורה 4585, id חזק בשורה 4570.

**סטטוס:** `WAIT`. 9 ממצאי קוד פתוחים, 5 לקחי תהליך מומשו, 4 החלטות ממתינות (`D-04`, `D-05`, `D-06`, `L-2`).

---

## 2026-09-10 — רענון בסיס: מישור הבקרה היה מנותק מהמציאות במשך 12 יום

**מה קרה:** מסמכי הבקרה עודכנו לאחרונה ב־28–29/08. מאז נעשו **29 קומיטים**, כולם נדחפו (`0 ahead / 0 behind`). המסמכים לא עודכנו איתם, וכתוצאה מכך תיארו מציאות שחדלה להתקיים.

**סתירות שנמצאו בין המסמכים למציאות:**

| מסמך | מה נכתב בו | המציאות ב-2026-09-10 |
|---|---|---|
| `PROJECT_STATUS_SNAPSHOT.json` | `production_changed: false`, `commit_created: false`, `pushed: false` | **v37 production שונה ב-8 קומיטים נפרדים**, כולם נדחפו |
| `PROJECT_OPERATING_PLAN.md` | "שחרור production — חסום במכוון" | production קיבל Google OAuth, סנכרון עיצוב מלא, סטטיסטיקות הכנסות, גרפים שנתיים וטאב חובות |
| `CLAUDE_NEXT_ACTION.md` | "הפעולה הבאה: לפרסם את הקשחת זהות הסנכרון" | בוצע ונדחף ב־`c7ece29`, לפני 12 יום |
| `DECISION_REGISTER.md` D-03 | "מתי לקדם V38 ל־production — חסום עד Gate 1–3" | הקידום **כבר קרה, בחלקים**, בלי שההחלטה נסגרה ובלי gate יחיד |

**המשמעות:** לא מדובר באי־דיוק טכני. ה־gate שנועד לחסום שחרור production לא נאכף בפועל — production התקדם דרך קומיטים נקודתיים במקום דרך ה־Launch Packet. זה הפער החשוב ביותר ברשומה הזו.

**מצב אמיתי כרגע:**
- `expense-app-v37-demo.html` — 9,221 שורות · `expense-app-v37.html` — 8,994 שורות. **הדמו מקדים ב־227 שורות.**
- 3 קומיטים מהיום **טרם הועברו ל-production**: `2e4bc93` (ריבוי פריטי בדיקה + עיצוב טופס קטגוריות + מיידי/משותף בייבוא), `18f64dc` (רישום מפתחות סנכרון חסרים + הגנה משגיאה שקטה בייבוא אשראי), `d87d2c0` (הגנה מחריגת מכסת localStorage — היה שובר את הייבוא לגמרי).

**ממצאי היגיינה שלא היו מתועדים באף מקום:**
1. **`.gitignore` מכיל `*.json`** → כל 12 גיבויי הנתונים ב־`backups/` קיימים ב־iCloud בלבד, **ללא היסטוריית גרסאות**. `CLAUDE.md` מגדיר אותם אזור סיכון גבוה ("לא למחוק, לא לשנות") — אבל git לא מגן עליהם.
2. **פקודת הגיבוי ב־`CLAUDE.md` שבורה.** היא מפנה ל־`backups/raz-expenses-backup-LATEST.json` — **קובץ בשם הזה אינו קיים**. הגיבוי האחרון בפועל הוא `raz-expenses-backup-2026-09-09_15-32.json`. כלומר הפקודה שאמורה לרוץ "בלי לשאול" לפני כל שינוי נתונים — נכשלת.
3. **`CLOUD_DATA_RELIABILITY_PLAN.md` אינו במעקב git**, למרות ש־`PROJECT_OPERATING_PLAN.md` מצטט אותו כהוכחה לאירוע P0.
4. לא במעקב git גם: `business-plan/`, `friend-setup/`, `backups/`, 3 קבצי SQL של Supabase, 5 קבצי `archive/*.html`.

**חוטים פתוחים שלא נסגרו ולא נסגרו במפורש:**
- `TWO_DEVICE_SYNC_ACCEPTANCE.md` — מטריצת הקבלה מעולם לא דווחה כמבוצעת. היא מזכירה **"the 190 ₪ discrepancy"** שאמור להיפתר או להיות מיוחס להפרש scope מתועד. אין רישום שזה קרה. `UNKNOWN` — פער כספי פתוח.
- `FEATURE_MASTER_BACKLOG.md` מצהיר על כיוון עיצוב "כהה/עמוק, electric-lime/cyan/violet, **לא 'אתר עץ'**", בעוד הקומיטים מ־28/08 הלכו דווקא לכיוון `light wood` / `light oak` / `warm tech`. `UNKNOWN` — האם הבקלוג מתאר כוונה שנזנחה, או שהעיצוב סטה מהכוונה.
- הכלל הארכיטקטוני בבקלוג — "`Personal` הוא ה-default, `Couple` משטח נפרד ולא פילטר" — לא אומת מול הקוד בסבב הזה.

**סטטוס:** מסמכי המצב (`PROJECT_STATUS_SNAPSHOT.json`, `CLAUDE_NEXT_ACTION.md`, `PROJECT_OPERATING_PLAN.md`, `DECISION_REGISTER.md`) עודכנו למציאות. מסמכי הייחוס (`FEATURE_MASTER_BACKLOG.md`, `FULL_PRODUCT_SURFACE_MAP.md`, `EXPENSE_APP_V38_LAUNCH_PACKET.md`, `IMPORT_AUTOMATION_PLAN.md`, `HOUSEHOLD_AUTHORIZATION_DESIGN.md`) **לא נגעתי בהם** — הם דורשים הכרעה שלך, לא עדכון טכני.

---

## 2026-08-28 — V38 demo implementation

- נלמדה ערכת `PROJECT_CONTROL_STARTER_KIT` והוגדרו launch packet, owner, writer, risk, rollback ו־gates.
- הושלם מיפוי של תשעת הטאבים, כל טבלאות/רשימות, סינונים, מצבי עריכה, מודאלים וכתיבות נתונים.
- נלכדו screenshots של כל הזרימות המרכזיות ב־demo הפרוס לפני השינוי.
- נבחר כיוון “Safety & Automation” והותאם לעץ בהיר, ירוק מרווה וטקסט אגוז כהה.
- עודכנה מעטפת demo בלבד: מצב חיבור, נתוני בן/בת זוג, dashboard monthly status, review queue ומצב עריכה גלובלי.
- יושרה השפה החזותית בכל הטאבים, הטפסים, הטבלאות, ה־filters, modal/sheet, empty/error/sync states.
- תוקנו `aria-selected`, מצב “עוד”, הופעת FAB רק בטאב הוצאות ו־overflow של חובות במובייל.
- שופר ייבוא אשראי: review summary, fingerprint, recovery point ומידע מקור על העסקה.
- נוסף שער כניסה לדמו; לאחר התחברות זהות העריכה ננעלת לפי `app_user_key`.
- תועדה חסימת RLS: צפייה זוגית מלאה דורשת household policy בשרת, ולא שינוי דפדפן בלבד.
- בדיקת תחביר demo עברה.
- בדיקה חיה/אייפון והשוואת design QA ממתינות לאישור commit+push; production לא השתנה.
