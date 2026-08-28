# הרשאות זוגיות — יעד מימוש

## המצב שנמצא

הכניסה ב־demo מבוססת על Supabase Auth ו־`app_user_key` (`raz` / `shira`). מדיניות ה־RLS הנוכחית מאפשרת למשתמש לקרוא ולכתוב את הרשומה שבבעלותו, ולקרוא/לכתוב שורות `owner_id = null` משותפות. לכן היא מתאימה לנתונים משותפים ול־settlements, אך **לא** מאפשרת צפייה מלאה ומאובטחת בנתונים האישיים של בן/בת הזוג.

שער הכניסה החדש ב־demo פותר את זהות העריכה: משתמש מחובר ננעל ל־`app_user_key` שלו. הוא לא מתיימר לפתור את הרשאת ה־household בלקוח.

## המודל המומלץ

| ישות | קריאה | כתיבה |
|---|---|---|
| `households` | חברי household | owner/admin בלבד |
| `household_members` | חברי אותו household | owner/admin בלבד |
| עסקאות אישיות | שני חברי household | רק owner של העסקה |
| settlements / תקציב משותף | שני חברי household | שני החברים, עם audit |
| credentials של Open Banking | בעל credential בלבד | בעל credential / backend service בלבד |
| recovery / import ledger | שני החברים לפי סוג | יוצר ה־batch או backend מאושר |

## עקרון RLS

1. `auth.uid()` ממופה ל־`household_members`.
2. SELECT של עסקאות בודק חברות באותו `household_id`.
3. INSERT/UPDATE/DELETE של עסקה אישית בודק `owner_id = auth.uid()`.
4. כל כתיבה אוטומטית מתבצעת רק דרך Edge Function עם service role, ומטביעה `created_by`, `source`, `batch_id` ו־`reviewed_by`.
5. אין שום מפתח בנק, refresh token או secret ב־HTML או ב־localStorage.

## שלבי קידום

1. ליצור טבלאות household/members ב־demo בלבד ולעדכן RLS שם.
2. להוסיף view או endpoint read-only שמחזיר partner summary, לא raw write access.
3. לבדוק כ־Raz וכ־Shira: רואים את שניהם, אך כל אחד נכשל בניסיון לשנות עסקה אישית של השני.
4. רק לאחר תוצאות בדיקה וגיבוי production: להכין migration נפרד ל־`app_state` production.

## קריטריון קבלה

רז ושירה רואים תמונת household מלאה, אבל ניסיון לעדכן רשומה אישית של בן/בת הזוג נדחה על ידי RLS גם אם מישהו משנה JavaScript בדפדפן.
