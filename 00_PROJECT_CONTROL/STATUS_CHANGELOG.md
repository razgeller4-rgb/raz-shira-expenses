# Status Changelog

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
