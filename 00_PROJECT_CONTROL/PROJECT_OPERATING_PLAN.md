# Expense App — Operating Plan

**Owner:** רז · **Product:** ניהול הוצאות לרז ושירה · **Updated:** 2026-08-28

## Verdict

האפליקציה **אינה גמורה**. V38 בדמו הוא בסיס טוב ומוצג עם התחברות, אבל אין עדיין אישור שחרור ל־production: הרשאות משק־בית מלאות, אוטומציית ייבוא חיצונית ו־QA חי מלא אינם סגורים.

## Source of truth

| תחום | מצב | הוכחה | פער לשחרור |
|---|---|---|---|
| מיפוי מוצר | הושלם | `FULL_PRODUCT_SURFACE_MAP.md` | לשמור מעודכן עם כל פיצ'ר |
| UX/שפה חזותית | יושם בדמו | V38 + צילום דשבורד מחובר | QA ב־390px לכל 9 הטאבים |
| כניסה | יושם בדמו | Supabase Auth + צילום סשן מחובר | בדיקת הרשאה של שני משתמשים |
| צפייה זוגית | לא הושלם | `HOUSEHOLD_AUTHORIZATION_DESIGN.md` | RLS משק־בית בשרת + בדיקת הרשאות |
| ייבוא אשראי בטוח | יושם בדמו | review, fingerprint, recovery point | בדיקת קבצי אמת מכל מנפיק |
| ייבוא אוטומטי | תוכנן בלבד | `IMPORT_AUTOMATION_PLAN.md` | Inbox/worker/אישור אנושי |
| שלמות נתונים | חלקי | `.claude/PLAN.md` | sync overwrite, render scope, מודל חוב גנרי |
| שחרור production | חסום במכוון | `EXPENSE_APP_V38_LAUNCH_PACKET.md` | גיבוי, gate עצמאי ואישור רז |

## Delivery roadmap

### Gate 0 — יישור קו וניהול (עכשיו)
- להפוך מסמך זה למקור האמת; לעדכן בכל סיום גל.
- לחדש את `.claude/PLAN.md`: חלק ממנו מתאר מציאות ישנה ולכן אינו מדד שחרור תקף.
- לקבוע החלטות פתוחות ב־`DECISION_REGISTER.md`.

### Gate 1 — אמון זוגי ונתונים (קודם)
- להגדיר household, הזמנה, owner/editor/viewer ופוליסות RLS: קריאה לפי household; כתיבה רק לרשומה/שדה שמורשים לו.
- לבצע migration בשלבים עם snapshot, rollback ובדיקות Raz/Shira/unauthenticated.
- להגן על משיכה מהענן: confirm, נקודת שחזור ו־loading state.

### Gate 2 — ייבוא חכם, עדיין מאושר אנושית
- קובץ → inbox → נירמול מנפיק → זיהוי כפילויות/קטגוריה → review → commit.
- לאחר מכן: תיבת מייל/Drive ייעודיים; רק לבסוף Open Banking דרך backend מאובטח.
- KPI: שיעור כפילויות 0; זמן ייבוא; שיעור עסקאות שדורשות תיקון; זמן עד אישור.

### Gate 3 — איכות מוצר וארכיטקטורה
- QA חי במובייל לכל 9 הטאבים, סינונים, עריכה, מחיקה, מודאלים, גיבוי וייבוא.
- render ממוקד לעריכה כדי למנוע איבוד focus; טיפול במודל חובות גנרי רק עם design review.
- נגישות: labels, keyboard, focus-trap ו־aria states.

### Gate 4 — Release
- גיבוי production, independent gate, checklist, rollout מדורג ורק אז promotion.

## Operating cadence

- כל שינוי: יעד → סיכון → DoD → בדיקה → עדכון מצב.
- כל שינוי נתונים/הרשאות: design review + rollback + independent gate.
- Demo קודם; production רק באישור מפורש של רז.
