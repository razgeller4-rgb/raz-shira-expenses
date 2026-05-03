# הוראות לפרויקט — אפליקציית הוצאות (רז ושירה)

## מהות
כלי משפחתי לניהול הוצאות בעברית RTL. שותפים: רז ושירה. **לא מסחרי.**

## ארכיטקטורה
- HTML יחיד עם vanilla JS
- Chart.js לגרפים
- XLSX library לייבוא/ייצוא Excel
- Supabase כ-cloud sync (מחובר רק ל-v34)
- מתארח כ-GitHub Pages (`https://razgeller4-rgb.github.io/raz-shira-expenses/`)

## 🔴 כללי ברזל — לקרוא לפני כל פעולה

### 1. המידע ב-v34 הוא המקור היחיד
המידע באפליקציה (v34 דרך Supabase) הוא **המקום היחיד** של נתוני ההוצאות. אין מקור גיבוי חי אחר. לפני כל שינוי שנוגע בלוגיקת נתונים — לוודא גיבוי טרי, **בלי לשאול**.

### 2. בדיקות תמיד מהאייפון, ותמיד קודם על v35
- **v34** = production, מחובר ל-Supabase, נתונים אמיתיים
- **v35** = sandbox, מנותק מ-Supabase, בטוח לבדיקות

זרימה:
1. שינוי על v35
2. push (אחרי אישור) → GitHub Pages
3. בדיקה מ**אייפון** ב-URL של v35
4. אחרי אישור — להעביר ל-v34
5. push (אחרי אישור)

**אין `python3 -m http.server` או בדיקות בדפדפן דסקטופ — זה לא הסביבה האמיתית.**

### 3. אין `git push` אוטומטית
תמיד אישור ידני לפני push.

## מבנה הגרסאות

| קובץ | תפקיד | חיבור Supabase |
|-------|--------|------------------|
| `expense-app-v34.html` | production — הגרסה החיה | ✅ |
| `expense-app-v35.html` | sandbox — בודקים פה קודם | ❌ |
| `expense-app-demo.html` | דמו | — |
| `demo.html` | דמו נוסף | — |
| `expense-app-v34-local-draft.html` | draft מקומי, לא לעריכה | — |
| `index.html` | מפנה ל-v34 | — |

## נתונים ובאקאפים
- **גיבויי JSON:** `raz-expenses-backup-YYYY-MM-DD_HH-MM.json` בתיקיית הפרויקט
- **Excel:** `transaction-details_export_*.xlsx`, `שירה פירוט עסקאות וזיכויים.xlsx`, `הוצאות מעודכן.xlsx`
- **Supabase schema:** `supabase-cloud-sync-setup.sql`

לפני נגיעה בקובץ נתונים מקומי:
```bash
cp "FILE.json" "FILE.backup-$(date +%Y-%m-%d_%H-%M).json"
```

## שמות קבצים בעברית
התיקייה ושמות קבצים מכילים תווים בעברית. תמיד לעטוף ב-double quotes.

## Git
- בעבודה נוכחית בתוך worktree (`.claude/worktrees/<name>/`)
- שינויים מקומיים → commit ב-worktree → merge ל-main
- אסור push בלי אישור
