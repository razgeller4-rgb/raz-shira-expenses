<!-- SHARED_RESEARCH_HANDOFF_START -->
> **הנחיית רז — שיתוף מחקר עם קלוד, מנהל הפרויקט והקוד (14.09.2026):** לפני תכנון או שינוי קוד, קרא את [שער המחקרים והניהול](00_PROJECT_CONTROL/00_START_HERE.md), את [הפעולה הבאה](00_PROJECT_CONTROL/CLAUDE_NEXT_ACTION.md) ואת המקורות הרלוונטיים המקושרים שם. אלו תוצרי העבודה המשותפת עם Codex, בתוך אותה תיקיית פרויקט; יש לשלב אותם בניהול ובמימוש.
>
> **החלטת העיצוב העדכנית:** רז אהב את החומריות והתמונה של [refinement-02/1](design/fresh-start-2026-09-13/refinement-02/option-01.png) ואת ממשק הטופס של [refinement-02/3](design/fresh-start-2026-09-13/refinement-02/option-03.png). ארבע דוגמאות הטאבים ב־[tabs-03](design/fresh-start-2026-09-13/tabs-03/REVIEW.md) ממשיכות שילוב זה. כיוון ג׳ דחוי. הכיוון התקבל להעמקה; המפרט המלא והפריסה אינם מאושרים כגמורים.
>
> **לפני שינוי UI:** קרא את [השוואת 57 קבוצות היכולות](design/specification/parity-2026-09-13/COMPARISON_HE.md) ואת [חוזי השימור העדכניים](design/specification/contracts-2026-09-14/README.md). אסור לאבד שדה, חישוב או פעולה בגלל שאינם בסקיצה. שיוך 151 הפקדים הפתוחים נסגר ברמת מקור; אימות חי וכיסוי חזותי מלא עדיין פתוחים. ממצאים בקוד אינם בהכרח באגים מאומתים; המלצות מחקר אינן החלטות משתמש.
>
> **המשך שיתוף:** כל מחקר חדש יירשם בשער הניהול עם נתיב, תאריך, מסקנה ומעמד (ממצא/הצעה/החלטה/פתוח); עדכן את הפעולה הבאה ואת יומן השינויים. אין ליצור תוכנית מקבילה הסותרת את המקור הפעיל. יש לבדוק freshness של hash לפני הסתמכות על מספרי שורות.
<!-- SHARED_RESEARCH_HANDOFF_END -->

> **עדכון פעיל 14.09.2026:** מקור התוכנית הוא [00_PROJECT_CONTROL/00_START_HERE.md](00_PROJECT_CONTROL/00_START_HERE.md). כיוון ג׳ נדחה מפורשות; נדרש עיצוב מחדש באמצעות Product Design. הוראות המשתמש העדכניות גוברות על מדיניות היסטורית; הגנות הנתונים ואישור תוכן הדמו לפני קידום נשמרים.
>
> **תוקן 14.09.2026 (אומת ישירות מול הקוד, לא מהיסטוריה):** פקודת הגיבוי הייתה שבורה (מפנה לקובץ `LATEST.json` שלא קיים) — תוקנה למטה בשני המקומות. התיאור "הדמו ללא Supabase" היה שגוי — הדמו מחובר לטבלה נפרדת `app_state_demo`; תוקן בארכיטקטורה ובטבלת הקבצים למטה. שם ה-skill לביקורת עיצוב תוקן. סעיף עדיפויות מיוני 2026 הוחלף בהפניה למקור החי כדי לא לשמר שני מקורות אמת.

# CLAUDE.md — אפליקציית הוצאות רז ושירה

## Project Identity

- **שם:** Expense App — רז ושירה
- **דומיין:** ניהול הוצאות משפחתי
- **מטרה:** מעקב הוצאות והכנסות, מאזן חודשי, הוצאות משותפות עם settlement, חיזוי סוף חודש
- **שלב:** `MVP` — אפליקציה עובדת, ממשיכים לשפר פיצ'רים ועיצוב
- **משתמשים:** רז ושירה בלבד. לא מסחרי.

---

## ארכיטקטורה

- HTML יחיד עם vanilla JS (ללא build step)
- Chart.js לגרפים
- XLSX library לייבוא/ייצוא Excel
- Supabase כ-cloud sync — v37 (production) מסונכרן לטבלת `app_state`; **הדמו מסונכרן גם הוא**, לטבלה נפרדת `app_state_demo` (הפרדה גם ברמת ה-DB, לא רק namespace). אומת מול הקוד 14.09.2026
- מתארח ב-GitHub Pages: `https://razgeller4-rgb.github.io/raz-shira-expenses/`

---

## 🔴 כללי ברזל — לקרוא לפני כל פעולה

### 1. v37 = נתונים אמיתיים — לא לגעת בלי גיבוי
המידע ב-v37 (דרך Supabase) הוא **המקור היחיד**. לפני כל שינוי שנוגע בלוגיקת נתונים — לגבות **בלי לשאול**:
```bash
cp "$(ls -t backups/raz-expenses-backup-*.json | head -1)" "backups/raz-expenses-backup-$(date +%Y-%m-%d_%H-%M).json"
```

### 2. זרימת עבודה: demo קודם, v37 אחרי אישור על התוכן (לא על ה-push)

| קובץ | תפקיד | Supabase | namespace |
|------|--------|----------|-----------|
| `expense-app-v37.html` | **production** — נתונים אמיתיים | ✅ | ללא prefix |
| `expense-app-v37-demo.html` | **sandbox** — בודקים כל שינוי פה קודם | ✅ (טבלת `app_state_demo`, נפרדת מ-production) | `demo__` |
| `archive/` | גרסאות ישנות (v34/v35/v36) — לעיון בלבד | ❌ | — |

**זרימת עבודה חובה:**
1. כל שינוי → `expense-app-v37-demo.html` קודם
2. push לדמו → בדיקה מהאייפון בכתובת: `.../expense-app-v37-demo.html`
3. אישור ידני מרז שהדמו נבדק ותקין → מעתיקים את השינוי ל-`expense-app-v37.html`
4. push ל-production

> **עדכון מדיניות 2026-09-10 (רז, בבחירה מפורשת):** `git push` — גם לדמו וגם ל-production —
> **אינו דורש אישור פרטני נפרד** ברגע שהעבודה עצמה אושרה/סוכמה בשיחה. הסיבה: git הפיך
> (אפשר לחזור אחורה/לתקן), ורז מעדיף עבודה אוטומטית על פני עצירה לכל שלב. **מה שכן נשאר בעינו
> ללא שינוי:** גיבוי חובה לפני שינוי בלוגיקת נתונים (כלל 1), בדיקה בדמו לפני העברה ל-v37 (שלב 3
> למעלה), ואיסור על force-push / מחיקת branch / reset --hard — אלה עדיין דורשים אישור מפורש.

**אסור:** `python3 -m http.server`, בדיקה בדפדפן דסקטופ, `force push` / `reset --hard` / מחיקת branch ללא אישור, קידום שינוי ל-v37 לפני שרז אישר שהדמו נבדק.

### 3. שמות קבצים בעברית
תמיד לעטוף ב-double quotes בכל פקודת bash.

---

## מבנה קבצים

```
expense-app-v37.html       ← production
expense-app-v37-demo.html  ← sandbox לבדיקות
index.html                 ← redirect ל-v37
CLAUDE.md
supabase-cloud-sync-setup.sql
archive/                   ← v34/v35/v36 + demos (לא לגעת)
backups/                   ← JSON backups
data/                      ← קבצי Excel מיוצאים
payroll/                   ← כלי שכר
```

---

## Operating Model

1. **הבן את המשימה** — קרא את CLAUDE.md וזהה את הקובץ הרלוונטי (demo / v37)
2. **בחר סוכן** — ראה Preferred Agents למטה
3. **תכנן לפני שינוי** — פרט קבצים שישתנו + רמת סיכון
4. **שינויים קטנים ובדוקים** — אחד בכל פעם, על demo קודם
5. **סכם** — מה השתנה, מה נבדק, מה נשאר לבדיקה

---

## High-Risk Areas

- **נתוני Supabase** — כל שינוי ב-schema, sync, קריאות API (v37 בלבד)
- **לוגיקת מאזן** — `getDisplayedClosingBalance`, `getSharedExpenseSummary`, חישובי חובות
- **קבצי גיבוי JSON** — `backups/raz-expenses-backup-*.json` — לא למחוק, לא לשנות
- **localStorage namespaces** — `demo__` לדמו, ללא prefix לפרודקשן. אין ערבוב.
- **פונקציות ייצוא XLSX** — פלט שמשתמשים סומכים עליו
- **migration functions** — `runIncomeMigrations` — רצות פעם אחת, flag ב-localStorage

---

## Safety Rules

- לא לגעת ב-v37 לפני שהשינוי עבר בדיקה מלאה על demo + אישור מרז
- לפני שינוי לוגיקת חישוב — לתעד דוגמת before/after עם מספרים
- `git push` רגיל (דמו או production) אינו דורש אישור פרטני — ר' סעיף "עדכון מדיניות 2026-09-10" למעלה. `force push`/`reset --hard`/מחיקת branch כן דורשים אישור מפורש.
- קבצי Excel (`*.xlsx`) — לא לשכתב, רק להוסיף
- אין להוסיף תלויות חיצוניות ללא שאלה — האפליקציה מכוונת להיות self-contained

---

## How to Explore

לפרויקט לא מוכר — סדר קריאה:
1. `expense-app-v37-demo.html` — הגרסה העדכנית, ממנה לומדים את הלוגיקה
2. `supabase-cloud-sync-setup.sql` — schema של מסד הנתונים
3. `backups/raz-expenses-backup-*.json` (הכי חדש) — מבנה נתונים אמיתי
4. `CLAUDE.md` זה — workflow ואזורי סיכון

---

## How to Build

**לפני שינוי:**
- Goal: מה בדיוק משתנה?
- Files: demo בלבד (עד אישור)
- Risk: גבוה / בינוני / נמוך — למה?
- Rollback: איך חוזרים אחורה?

**אחרי שינוי:**
- מה השתנה (שורות / פונקציות)
- איך נבדק (אייפון / demo URL)
- מה עדיין פתוח
- פעולה הבאה מומלצת

---

## Preferred Agents

| סוכן | מתי |
|------|-----|
| `chief-of-staff` | כל מטרה גדולה — תמיד ראשון |
| `feature-builder` | בניית פיצ'ר חדש על demo |
| `qa-release-reviewer` | לפני כל העברה מ-demo ל-v37 |
| `/design-critique` | סקירת UX, עיצוב, שמישות — נותן framework/checklist בלבד; המדידה בפועל (ניגודיות, יעדי מגע) דרך `chrome-devtools` מול עמוד חי |
| `expense-ops-expert` | שאלות על לוגיקת הוצאות, קטגוריות, חישובים |
| `domain-risk-reviewer` | לפני שינוי בחישובי מאזן או חיזוי |
| `security-privacy-reviewer` | אם נוגעים ב-Supabase keys או PII |
| `codebase-cartographer` | מיפוי מלא לפני שינויים גדולים |

---

## Project-Specific Commands

```bash
# אין install — HTML יחיד, ללא build

# עבודה על demo:
# ערוך את expense-app-v37-demo.html
# בדוק ב: https://razgeller4-rgb.github.io/raz-shira-expenses/expense-app-v37-demo.html

# העלאה לאחר אישור על demo:
git add "expense-app-v37-demo.html" && git commit -m "feat(demo): <תיאור>" && git push

# קידום demo ל-production (אחרי אישור בלבד):
# העתק שינויים ל-expense-app-v37.html
git add "expense-app-v37.html" && git commit -m "feat: <תיאור>" && git push

# גיבוי נתונים לפני שינוי:
cp "$(ls -t backups/raz-expenses-backup-*.json | head -1)" "backups/raz-expenses-backup-$(date +%Y-%m-%d_%H-%M).json"
```

---

## Current Priorities

מקור העדיפויות החי: [00_PROJECT_CONTROL/00_START_HERE.md](00_PROJECT_CONTROL/00_START_HERE.md) ו-[00_PROJECT_CONTROL/FEATURE_MASTER_BACKLOG.md](00_PROJECT_CONTROL/FEATURE_MASTER_BACKLOG.md). רשימה מתוארכת ליוני 2026 הוסרה מכאן ב-14.09.2026 — היא תיארה מצב שכבר לא נכון (למשל "workflow דמו" כפתוח, כשהוא בפועל core practice מזה חודשים) ויצרה שני מקורות אמת סותרים. אין לשחזר רשימת עדיפויות מקבילה בקובץ הזה; הוא מגדיר workflow וסיכונים, לא סטטוס פיצ'רים.
