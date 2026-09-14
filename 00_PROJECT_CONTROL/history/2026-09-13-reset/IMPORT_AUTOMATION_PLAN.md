# תכנית אוטומציה לייבוא הוצאות

## עיקרון בטיחות

האוטומציה רשאית לקרוא, לנרמל, להציע ולסמן. רק רז או שירה רשאים לאשר כתיבה של כסף. גם בעתיד, ingest אוטומטי יכניס עסקאות ל־`pending review` ולא ישירות לדוחות.

## מצב קיים

- נקראים XLSX/CSV של Max, ישראכרט וכאל, מהגיליון הראשון.
- כרטיס מוצע לפי 4 ספרות, שם/מותג וסוג עסקה.
- קטגוריה מוצעת מהיסטוריית merchant זהה.
- כפילות מזוהה לפי תאריך, סכום ושם עסק בקירוב.
- כל העסקאות נכתבות לגיליון יעד אחד שנבחר ידנית.
- אין batch id, source transaction id או יומן idempotency מרכזי.

## שלב 1 — Smart File Import בטוח

חלק ראשון כבר נוסף ל־demo:

- preview עם מספר שורות, סכום, כפילויות ושדות חסרים.
- fingerprint קנוני שנשמר על העסקה: תאריך + סכום + merchant מנורמל + כרטיס.
- נקודת שחזור לפני commit של batch.
- fingerprint קודם נבדק לפני fallback ההתאמה הישנה.

להשלמה לאחר QA:

- report מפורש לשורות שנדחו על ידי parser במקום השמטה שקטה.
- תמיכה בזיכויים ובסכומים שליליים כישות נפרדת.
- source file hash, batch id ו־imported by.
- הצעת חודש לכל שורה לפי תאריך העסקה ומחזור הכרטיס, עם override ידני.
- חסימה לפני commit כאשר כרטיס/תאריך/סכום לא פתורים.

## שלב 2 — Inbox של עסקאות ממתינות

מבנה מוצע:

- `import_batches`: מקור, שם קובץ, hash, משתמש, זמן, totals, status.
- `import_candidates`: normalized transaction, source id, fingerprint, suggested sheet/card/category, confidence, status.
- `import_rules`: merchant pattern → category/card/type עם היסטוריית החלטות.
- `import_ledger`: fingerprint/batch/expense id, מי אישר ומתי, rollback reference.

סטטוסים: `pending`, `needs_attention`, `possible_duplicate`, `ready`, `approved`, `rejected`, `imported`, `rolled_back`.

המערכת תלמד רק מאישורים: אם אותו merchant סווג באותה קטגוריה מספר פעמים, תוצג הצעה בביטחון גבוה. גם הצעה בביטחון גבוה נשארת גלויה ב־review.

## שלב 3 — קליטה אוטומטית ללא חיבור בנק

האפשרות הפשוטה והזולה:

1. תיבת מייל ייעודית או תיקיית Drive/Dropbox שאליה נשמרים דוחות.
2. Edge Function מאובטח מושך קובץ חדש, מחשב hash ומונע ingest כפול.
3. parser יוצר candidates בלבד.
4. רז/שירה מקבלים חיווי “N עסקאות ממתינות”.
5. אישור batch באפליקציה יוצר הוצאות ו־recovery point.

נדרש אישור מפורש לפני חיבור שירות חיצוני או התקנת connector.

## שלב 4 — Open Banking

ייבוא מלא מחשבונות וכרטיסים דורש ספק Open Banking מורשה, backend שמחזיק secrets, webhook או משיכה מתוזמנת, ניהול consent, refresh tokens, monitoring ו־RLS לפי household. אסור לבצע את החיבור ישירות מקובץ HTML סטטי או לחשוף token בדפדפן.

מודל הרשאה מומלץ:

- כל auth user מקושר ל־`app_user_key` (`raz` / `shira`) ול־`household_id` משותף.
- כל אחד כותב את העסקאות שלו ורואה את שתיהן דרך household policy.
- settlements משותפים; source credentials פרטיים לכל משתמש.
- audit trail לכל שינוי אוטומטי ואישור ידני.

## מדדי הצלחה

- 0 כפילויות ודאיות שנכתבו מחדש.
- 100% מה־batches ניתנים לשחזור.
- לפחות 90% התאמת כרטיס אוטומטית לאחר תקופת לימוד.
- לפחות 80% הצעת קטגוריה בביטחון גבוה, בלי auto-commit.
- זמן review חודשי מתחת ל־3 דקות.
- 100% מהשורות שנדחו מופיעות בדוח שגיאות.
