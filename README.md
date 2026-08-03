# אפליקציית הוצאות — רז ושירה

אפליקציית ניהול הוצאות משפחתי. HTML יחיד, vanilla JS, ללא build step. מתארחת ב-GitHub Pages, מסונכרנת דרך Supabase.

**כללי העבודה המחייבים נמצאים ב-[CLAUDE.md](CLAUDE.md).** קרא אותו לפני כל שינוי — הוא מגדיר את זרימת demo→production ואת אזורי הסיכון.

## מבנה הפרויקט

```
expense-app-v37.html         production — נתונים אמיתיים, מחובר ל-Supabase
expense-app-v37-demo.html    sandbox — כל שינוי נבדק כאן קודם, namespace מבודד
index.html                   redirect ל-expense-app-v37.html
payroll/index.html           כלי עצמאי לבדיקת תלוש שכר (לא מחובר ל-Supabase)
supabase-cloud-sync-setup.sql  schema של מסד הנתונים

archive/                     גרסאות ישנות (v34–v36) — לעיון בלבד, לא לגעת
backups/                     גיבויי JSON/HTML של נתוני production — לא למחוק
data/                        קבצי Excel מיוצאים/מיובאים

.claude/
  PLAN.md                    תוכנית העבודה החיה לשדרוג האתר, מעודכנת לאורך הדרך
  check.sh                   בדיקת תחביר ל-JS המוטמע בקבצי ה-HTML (אין lint/build בפרויקט)
  agents/                    הגדרות סוכנים ייעודיים לפרויקט
  reports/                   דוחות מיפוי וביקורת שהופקו לאורך העבודה
  agent-memory/              זיכרון מתמשך של סוכנים בין הרצות
```

## פקודות מרכזיות

אין `npm install`, אין build — קובץ HTML נטען ישירות בדפדפן.

```bash
# בדיקת תחביר לפני commit (הבדיקה האוטומטית היחידה בפרויקט)
bash .claude/check.sh

# גיבוי נתונים לפני שינוי שנוגע ב-v37
cp "backups/raz-expenses-backup-LATEST.json" "backups/raz-expenses-backup-$(date +%Y-%m-%d_%H-%M).json"

# העלאת שינוי שנבדק על demo
git add "expense-app-v37-demo.html" && git commit -m "feat(demo): <תיאור>" && git push
```

זרימת העבודה המלאה (demo → אישור ידני → v37 → push) מתועדת ב-[CLAUDE.md](CLAUDE.md).
