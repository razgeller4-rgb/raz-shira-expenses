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
- Supabase כ-cloud sync — מחובר ל-**v37** בלבד
- מתארח ב-GitHub Pages: `https://razgeller4-rgb.github.io/raz-shira-expenses/`

---

## 🔴 כללי ברזל — לקרוא לפני כל פעולה

### 1. v37 = נתונים אמיתיים — לא לגעת בלי גיבוי
המידע ב-v37 (דרך Supabase) הוא **המקור היחיד**. לפני כל שינוי שנוגע בלוגיקת נתונים — לגבות **בלי לשאול**:
```bash
cp "backups/raz-expenses-backup-LATEST.json" "backups/raz-expenses-backup-$(date +%Y-%m-%d_%H-%M).json"
```

### 2. זרימת עבודה: demo קודם, v37 אחרי אישור

| קובץ | תפקיד | Supabase | namespace |
|------|--------|----------|-----------|
| `expense-app-v37.html` | **production** — נתונים אמיתיים | ✅ | ללא prefix |
| `expense-app-v37-demo.html` | **sandbox** — בודקים כל שינוי פה קודם | ❌ | `demo__` |
| `archive/` | גרסאות ישנות (v34/v35/v36) — לעיון בלבד | ❌ | — |

**זרימת עבודה חובה:**
1. כל שינוי → `expense-app-v37-demo.html` קודם
2. `git push` → בדיקה מהאייפון בכתובת: `.../expense-app-v37-demo.html`
3. אישור ידני מרז → מעתיקים את השינוי ל-`expense-app-v37.html`
4. אישור ידני → `git push`

**אסור:** `python3 -m http.server`, בדיקה בדפדפן דסקטופ, `git push` ללא אישור, נגיעה ב-v37 לפני אישור על demo.

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
- אין `git push` ללא אישור מפורש
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
| `design:design-critique` | סקירת UX, עיצוב, שמישות — דורש screenshots |
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
cp "backups/raz-expenses-backup-LATEST.json" "backups/raz-expenses-backup-$(date +%Y-%m-%d_%H-%M).json"
```

---

## Current Priorities (נכון ל-2026-06-04)

**הושלם בסשן הנוכחי:**
- ✅ מודל הכנסות מאוחד — type, recurring, migration מ-salary, העתקה אוטומטית לחודש חדש
- ✅ Settlement הוצאות משותפות — רז ↔ שירה, מאזן מתעדכן בזמן אמת
- ✅ סידור קבצים — archive/, backups/, data/
- ✅ workflow דמו — `expense-app-v37-demo.html`

**פתוח לפיצ'רים הבאים:**
1. סקירת UX/עיצוב (`design:design-critique`) — צילומי מסך + המלצות
2. חיזוי סוף חודש — כמה יישאר לפי קצב הוצאות נוכחי
3. שיפורים נוספים לפי שיקול דעת רז
