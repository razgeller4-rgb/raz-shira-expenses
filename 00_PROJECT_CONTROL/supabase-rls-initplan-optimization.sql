-- ============================================================================
-- ‼️  טיוטה בלבד — לא הופעלה, לא רצה, ואסור להריץ בלי אישור מפורש מרז  ‼️
--     DRAFT ONLY — NOT APPLIED. DO NOT RUN WITHOUT RAZ'S EXPLICIT APPROVAL.
-- ============================================================================
-- קובץ: supabase-rls-initplan-optimization.sql
-- נוצר: 2026-09-14
-- מטרה: תיקון אזהרת `auth_rls_initplan` מ-get_advisors(type=performance).
--        10 מדיניויות RLS מריצות `auth.uid()` מחדש לכל שורה במקום פעם אחת
--        לשאילתה. התיקון הסטנדרטי של Supabase: לעטוף ב-`(select auth.uid())`,
--        מה שהופך את הקריאה ל-InitPlan שמחושב פעם אחת.
--
-- מה הקובץ הזה כן עושה: משנה אך ורק את ביטויי ה-USING/WITH CHECK.
-- מה הוא לא עושה:      לא נוגע בנתונים, לא בעמודות, לא בשמות מדיניויות,
--                       לא ברשימת ה-roles, ולא בהיקף ההרשאות. אותה לוגיקה
--                       בדיוק — רק עטופה.
--
-- ============================================================================
-- אזהרה מקצועית לפני שמריצים בכלל (קרא את זה, זה חשוב יותר מהתיקון):
-- ============================================================================
-- `auth_rls_initplan` היא אזהרת ביצועים שמשמעותית בטבלאות עם הרבה שורות.
-- app_state / app_state_demo מכילות יחידות/עשרות שורות (user-raz, user-shira,
-- shared-settlements, shared-expense-app, backup-snapshot-*). חיסכון של
-- ~N קריאות auth.uid() כש-N קטן הוא זניח.
--
-- => ההשערה ש-F-11 ("Disk IO Budget מתרוקן", 10.09) נגרם מזה היא **לא מבוססת**
--    עד שנמדוד. חשודים סבירים יותר ל-Disk IO על פרויקט בגודל הזה:
--      (א) polling תכוף מדי מהלקוח על payload jsonb גדול (כל sync קורא/כותב
--          את כל ה-blob, לא delta);
--      (ב) הצטברות שורות backup-snapshot-* אם pruneCloudRecoveryPoints לא רץ;
--      (ג) TOAST churn — כל UPDATE על payload jsonb כותב מחדש שורה שלמה + WAL;
--      (ד) autovacuum שרודף אחרי bloat מ-(ג).
--    לפני שמריצים את הקובץ הזה כפתרון ל-F-11, הריצו את סעיף 0 ואת בדיקות
--    ה-IO בסוף הקובץ. אחרת "נסגור" ממצא בלי לתקן את הסיבה.
--
-- הריצו את זה כי זה נכון היגייני (זה כן נכון), לא כי זה מרפא את F-11.
--
-- ============================================================================
-- סעיף 0 — חובה: אימות read-only לפני כל שינוי
-- ============================================================================
-- הטיוטה הזו נכתבה מתוך קבצי ה-SQL בריפו + DATA_MODEL_MAP.md, **לא** מתוך
-- קריאה חיה של pg_policies (לא היה כלי DB זמין בסשן שבו נכתבה).
-- => חובה להריץ את השאילתה הבאה ולהשוות מילה במילה לפני שמריצים משהו.
--
-- select
--   tablename,
--   policyname,
--   cmd,
--   roles,
--   qual        as using_expr,
--   with_check  as check_expr
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in (
--     'app_state',
--     'app_state_demo',
--     'app_state_allowed_users',
--     'app_state_demo_allowed_users'
--   )
-- order by tablename, policyname;
--
-- אם שם מדיניות כלשהו למטה לא תואם במדויק לפלט — **עצור**. אל תמציא שם,
-- אל "תתקן" אותו לפי ניחוש. עדכן את הקובץ לפי הפלט האמיתי וחזור לאישור.
--
-- ----------------------------------------------------------------------------
-- מצב הוודאות של כל מדיניות בקובץ הזה:
--   ✔ מאומת מול DDL בריפו (טקסט מדויק ידוע):
--       app_state_demo × 4   ← supabase-demo-auth-rls.sql
--       app_state SELECT × 1 ← supabase-household-read-policy-migration.sql
--   ⚠ משוחזר מהתיעוד (DATA_MODEL_MAP.md ל-2026-09-10) — שם המדיניות הוא הנחה:
--       app_state INSERT / UPDATE / DELETE × 3
--       app_state_allowed_users SELECT × 1
--       app_state_demo_allowed_users SELECT × 1
--   סה"כ 10 — תואם למניין שדיווח get_advisors.
-- ============================================================================

-- ============================================================================
-- למה ALTER POLICY ולא DROP + CREATE
-- ============================================================================
-- DROP+CREATE עם שם שגוי = יצירת מדיניות **נוספת** מתירנית, בלי שגיאה.
-- ALTER POLICY עם שם שגוי = שגיאה מיידית + rollback. fail-safe.
-- בנוסף: ALTER POLICY לא נוגע ב-cmd וב-roles, אז אי אפשר להרחיב הרשאות בטעות.
-- הכל בטרנזקציה אחת: או שהכל עובר, או ששום דבר לא משתנה.
-- ============================================================================

begin;

-- אופציונלי אבל מומלץ: אם משהו נתקע, אל תחזיק נעילה על טבלת prod לנצח.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- ----------------------------------------------------------------------------
-- 1. public.app_state — SELECT   [✔ טקסט מאומת]
--    מקור: 00_PROJECT_CONTROL/supabase-household-read-policy-migration.sql
--    שינוי יחיד: auth.uid()  ->  (select auth.uid())
-- ----------------------------------------------------------------------------
alter policy "auth household users read household app_state"
on public.app_state
using (
  exists (
    select 1
    from public.app_state_allowed_users viewer
    where viewer.user_id = (select auth.uid())
  )
  and (
    owner_id is null
    or owner_id in (
      select member.user_id
      from public.app_state_allowed_users member
    )
  )
);

-- ----------------------------------------------------------------------------
-- 2-4. public.app_state — INSERT / UPDATE / DELETE   [⚠ שמות משוחזרים]
--    DATA_MODEL_MAP.md קובע "אותו דפוס" כמו app_state_demo, ולכן הלוגיקה
--    למטה מועתקת מדפוס ה-demo. אם סעיף 0 מראה ביטוי שונה — אל תריץ, תקן.
--    שים לב: הדפוס כאן הוא owner_id = auth.uid() OR owner_id IS NULL,
--    בשונה ממדיניות ה-SELECT שהורחבה למשק בית שלם (סעיף 1). זה מכוון:
--    קריאה משותפת, כתיבה אישית בלבד.
-- ----------------------------------------------------------------------------
alter policy "auth users insert own or shared app_state"
on public.app_state
with check (
  exists (select 1 from public.app_state_allowed_users u where u.user_id = (select auth.uid()))
  and (owner_id = (select auth.uid()) or owner_id is null)
);

alter policy "auth users update own or shared app_state"
on public.app_state
using (
  exists (select 1 from public.app_state_allowed_users u where u.user_id = (select auth.uid()))
  and (owner_id = (select auth.uid()) or owner_id is null)
)
with check (
  exists (select 1 from public.app_state_allowed_users u where u.user_id = (select auth.uid()))
  and (owner_id = (select auth.uid()) or owner_id is null)
);

-- DELETE מוגבל לשורות משותפות בלבד (backup-snapshot-* שנמחקות ע"י
-- pruneCloudRecoveryPoints). אין כאן השוואה ל-auth.uid() על owner_id בכוונה.
alter policy "auth users delete shared app_state"
on public.app_state
using (
  exists (select 1 from public.app_state_allowed_users u where u.user_id = (select auth.uid()))
  and owner_id is null
);

-- ----------------------------------------------------------------------------
-- 5-8. public.app_state_demo — SELECT / INSERT / UPDATE / DELETE   [✔ מאומת]
--    מקור: supabase-demo-auth-rls.sql (שורות 47-91). הלוגיקה זהה לחלוטין.
-- ----------------------------------------------------------------------------
alter policy "auth users read own or shared app_state_demo"
on public.app_state_demo
using (
  exists (select 1 from public.app_state_demo_allowed_users u where u.user_id = (select auth.uid()))
  and (owner_id = (select auth.uid()) or owner_id is null)
);

alter policy "auth users insert own or shared app_state_demo"
on public.app_state_demo
with check (
  exists (select 1 from public.app_state_demo_allowed_users u where u.user_id = (select auth.uid()))
  and (owner_id = (select auth.uid()) or owner_id is null)
);

alter policy "auth users update own or shared app_state_demo"
on public.app_state_demo
using (
  exists (select 1 from public.app_state_demo_allowed_users u where u.user_id = (select auth.uid()))
  and (owner_id = (select auth.uid()) or owner_id is null)
)
with check (
  exists (select 1 from public.app_state_demo_allowed_users u where u.user_id = (select auth.uid()))
  and (owner_id = (select auth.uid()) or owner_id is null)
);

alter policy "auth users delete shared app_state_demo"
on public.app_state_demo
using (
  exists (select 1 from public.app_state_demo_allowed_users u where u.user_id = (select auth.uid()))
  and owner_id is null
);

-- ----------------------------------------------------------------------------
-- 9-10. טבלאות ה-allowed_users — SELECT   [⚠ שמות משוחזרים]
--    DATA_MODEL_MAP.md: התנאי הוא user_id = auth.uid().
--    שמות המדיניויות לא מתועדים בשום קובץ בריפו — חובה לקחת אותם מסעיף 0.
--    החלף את <POLICY_NAME_...> בשם האמיתי לפני הרצה, אחרת הבלוק ייכשל
--    (וזה התנהגות רצויה — עדיף כישלון מניחוש).
-- ----------------------------------------------------------------------------
-- alter policy "<POLICY_NAME_ALLOWED_USERS_SELECT>"
-- on public.app_state_allowed_users
-- using (
--   user_id = (select auth.uid())
-- );

-- alter policy "<POLICY_NAME_DEMO_ALLOWED_USERS_SELECT>"
-- on public.app_state_demo_allowed_users
-- using (
--   user_id = (select auth.uid())
-- );

-- ============================================================================
-- עצור כאן. אל תחליף ל-commit לפני שסעיף 0 אומת ושני הבלוקים 9-10 הושלמו.
-- להרצת ניסוי בטוחה: השאר rollback, הרץ, וודא שאין שגיאות שמות מדיניויות.
-- רק אחרי ריצה נקייה עם rollback — החלף ל-commit והרץ שוב.
-- ============================================================================
rollback;
-- commit;

-- ============================================================================
-- אימות אחרי ההרצה (read-only, לא נוגע ב-payload):
-- ============================================================================
-- 1) כל 10 המדיניויות צריכות להכיל "( SELECT auth.uid()" ואף אחת לא
--    "auth.uid()" חשוף:
-- select tablename, policyname, cmd,
--        qual       like '%( SELECT auth.uid()%' as using_wrapped,
--        with_check like '%( SELECT auth.uid()%' as check_wrapped
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('app_state','app_state_demo',
--                     'app_state_allowed_users','app_state_demo_allowed_users')
-- order by tablename, policyname;
--
-- 2) get_advisors(type=performance) — אזהרת auth_rls_initplan צריכה להיעלם.
--
-- 3) בדיקת התנהגות אמיתית (זה החלק שבאמת חשוב) — משתי הזהויות, מהאייפון:
--    GET /rest/v1/app_state?id=in.(user-raz,user-shira,shared-settlements)&select=id,owner_id,updated_at
--    צפוי: שני החברים רואים שלוש שורות; כל אחד כותב רק לשורת user-* שלו.
--    אם מישהו מפסיק לראות שורה או מצליח לכתוב לשורה של השני — rollback מיידי.
--
-- 4) מדידת F-11 לפני/אחרי (זה מה שקובע אם זו באמת הסיבה):
--    select count(*) from public.app_state where id like 'backup-snapshot-%';
--    select pg_size_pretty(pg_total_relation_size('public.app_state'));
--    select relname, n_live_tup, n_dead_tup, last_autovacuum
--    from pg_stat_user_tables
--    where relname in ('app_state','app_state_demo');
--    אם n_dead_tup גבוה או יש מאות backup-snapshot — הסיבה האמיתית שם,
--    לא ב-initplan.
--
-- ============================================================================
-- Rollback: להסיר את העטיפה חזרה, מריצים את אותם בלוקים עם auth.uid() חשוף.
-- אין שינוי סכימה ואין שינוי נתונים, ולכן אין צורך בגיבוי נתונים לצורך הקובץ
-- הזה — אבל כן לוודא שגיבוי אחרון תקין קיים לפני כל נגיעה ב-prod.
-- ============================================================================
