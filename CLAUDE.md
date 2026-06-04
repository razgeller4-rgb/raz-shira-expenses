# CLAUDE.md — אפליקציית הוצאות רז ושירה

## Project Identity

- **שם:** Expense App — רז ושירה
- **דומיין:** ניהול הוצאות משפחתי
- **מטרה:** מערכת נוחה לתיעוד הוצאות והכנסות, חישוב מאזן חודשי (כולל חיובי אשראי, חובות, הוצאות משותפות), וחיזוי מה יקרה בסוף החודש
- **שלב:** discovery — מגלה מה לשפר ואיפה להוסיף פיצ'רים
- **משתמשים:** רז ושירה בלבד. לא מסחרי.

---

## ארכיטקטורה

- HTML יחיד עם vanilla JS (ללא build step)
- Chart.js לגרפים
- XLSX library לייבוא/ייצוא Excel
- Supabase כ-cloud sync — מחובר **רק ל-v34**
- מתארח ב-GitHub Pages: `https://razgeller4-rgb.github.io/raz-shira-expenses/`

---

## 🔴 כללי ברזל — לקרוא לפני כל פעולה

### 1. v34 = נתונים אמיתיים — לא לגעת בלי גיבוי
המידע ב-v34 (דרך Supabase) הוא **המקור היחיד**. לפני כל שינוי שנוגע בלוגיקת נתונים — לגבות **בלי לשאול**:
```bash
cp "raz-expenses-backup-*.json" "raz-expenses-backup-$(date +%Y-%m-%d_%H-%M).json"
```

### 2. זרימת עבודה: v35 קודם, v34 אחרי אישור
| גרסה | תפקיד | Supabase | namespace |
|-------|--------|----------|-----------|
| `expense-app-v34.html` | production — נתונים אמיתיים | ✅ | ללא prefix |
| `expense-app-v35.html` | sandbox — בודקים פה קודם | ❌ | `v35demo__` |
| `expense-app-v36.html` | redesign experimental | ❌ | `v36demo__` |

**זרימה:**
1. שינוי על v35
2. אישור ידני → `git push` → GitHub Pages
3. בדיקה **מאייפון** (לא דסקטופ)
4. אחרי אישור — להעביר ל-v34
5. אישור ידני → `git push`

**אסור:** `python3 -m http.server`, בדיקה בדפדפן דסקטופ, `git push` ללא אישור.

### 3. שמות קבצים בעברית
תמיד לעטוף ב-double quotes בכל פקודת bash.

---

## Operating Model

1. **הבן את המשימה** — קרא את CLAUDE.md וזהה את הגרסה הרלוונטית (v35/v34)
2. **בחר סוכן** — ראה Preferred Agents למטה
3. **תכנן לפני שינוי** — פרט קבצים שישתנו + רמת סיכון
4. **שינויים קטנים ובדוקים** — אחד בכל פעם, אפשר לחזור
5. **סכם** — מה השתנה, מה נבדק, מה נשאר לבדיקה

---

## High-Risk Areas

- **נתוני Supabase** — כל שינוי ב-schema, sync, או קריאות API (v34 בלבד)
- **לוגיקת מאזן** — חישוב חיובי אשראי, חובות, הוצאות משותפות, חיזוי חודשי
- **קבצי גיבוי JSON** — `raz-expenses-backup-*.json` — לא למחוק, לא לשנות
- **localStorage** — כל גרסה רואה רק את ה-namespace שלה. אין ערבוב.
- **פונקציות ייצוא XLSX** — פלט שמשתמשים עשויים לסמוך עליו

---

## Safety Rules

- לא לגעת ב-v34 לפני שהשינוי עבר בדיקה מלאה על v35 + אישור
- לפני שינוי לוגיקת חישוב — לתעד דוגמת before/after עם מספרים
- אין `git push` ללא אישור מפורש
- קבצי Excel (`*.xlsx`) — לא לשכתב, רק להוסיף
- אין להוסיף תלויות חיצוניות ללא שאלה — האפליקציה מכוונת להיות self-contained

---

## How to Explore

לפרויקט לא מוכר — סדר קריאה:
1. `expense-app-v35.html` — הגרסה הבטוחה, ממנה לומדים את כל הלוגיקה
2. `supabase-cloud-sync-setup.sql` — schema של מסד הנתונים
3. `raz-expenses-backup-*.json` (הכי חדש) — מבנה נתונים אמיתי
4. `CHECKLIST_AND_ROADMAP.md` — מה כבר תוכנן ומה עדיין פתוח

---

## How to Build

**לפני שינוי:**
- Goal: מה בדיוק משתנה?
- Files: אילו קבצים ייגעו?
- Risk: גבוה / בינוני / נמוך — למה?
- Rollback: איך חוזרים אחורה?

**אחרי שינוי:**
- מה השתנה (שורות / פונקציות)
- איך נבדק (אייפון / v35)
- מה עדיין פתוח
- פעולה הבאה מומלצת

---

## Preferred Agents

| סוכן | מתי |
|------|-----|
| `chief-of-staff` | כל מטרה גדולה — תמיד ראשון |
| `codebase-cartographer` | לפני שינויים גדולים — מיפוי מלא של v35 |
| `feature-builder` | בניית פיצ'ר חדש (הכנסות, חיזוי, מאזן) |
| `expense-ops-expert` | שאלות על לוגיקת הוצאות, קטגוריות, חישובים |
| `domain-risk-reviewer` | לפני שינוי בחישובי מאזן או חיזוי |
| `qa-release-reviewer` | לפני כל העברה מ-v35 ל-v34 |
| `security-privacy-reviewer` | אם נוגעים ב-Supabase keys או PII |

---

## Project-Specific Commands

```bash
# אין install — HTML יחיד, ללא build
# run: פתח את הקובץ ב-GitHub Pages מהאייפון

# העלאה ל-GitHub Pages (אחרי אישור בלבד):
git add "expense-app-v35.html" && git commit -m "feat: <תיאור>" && git push

# גיבוי נתונים לפני שינוי:
cp "raz-expenses-backup-CURRENT.json" "raz-expenses-backup-$(date +%Y-%m-%d_%H-%M).json"
```

---

## Current Priorities (נכון ל-2026-06-03)

**מה עובדים עליו:**
1. **סקירת מערכת** — הרצת `chief-of-staff` + `codebase-cartographer` להבנת מצב הקוד הנוכחי ומה ניתן לשפר
2. **פיצ'רים פתוחים לחקירה:**
   - מערכת הכנסות חודשיות מכל הסוגים
   - חיזוי מה יקרה בסוף החודש
   - שיפור מאזן הוצאות משותפות (רז ↔ שירה)
3. **v36** — עיצוב Clean & Minimal הושלם ועבר smoke test. ממתין להחלטה אם ממשיכים ממנו או מ-v35

**הסוכן הבא שיורץ:** `chief-of-staff` — ייתן סדר פעולות לשאר הסקירה
