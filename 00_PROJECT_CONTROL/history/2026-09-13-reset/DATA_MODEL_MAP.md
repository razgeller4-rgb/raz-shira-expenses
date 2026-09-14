# מפת מודל נתונים ומפתחות סנכרון

**נוצר:** 2026-09-10 · **מקור:** `expense-app-v37-demo.html` (9,221 שורות) · **שיטה:** קריאת קוד ישירה עם מספרי שורות. לא מהמפה הישנה ולא מהזיכרון.

> **למה המסמך הזה קיים:** קומיט `18f64dc` (10/09) תיקן "רישום מפתחות סנכרון חסרים" — יעדים, זיכרון עסק, קטגוריות חודשיות ובדיקות שנדחו נשמרו מקומית אבל **לא הועלו לענן**. הבאג הזה אפשרי רק כשאין רשימה מרוכזת אחת. זו הרשימה.

---

## 1. Namespace — הפרדת demo מ-production

```js
const STORAGE_NS_PREFIX = "demo__";   // בדמו   (שורה ~2544)
const STORAGE_NS_PREFIX = "";         // בפרודקשן
```

כל מפתח נבנה כך:
```js
function getScopedStorageKey(base, userId=currentUser){   // שורה 2716
  → `${STORAGE_NS_PREFIX}${base}_${userId}`
}
```

**דוגמה:** `demo__expense_app_overrides_v29_raz` מול `expense_app_overrides_v29_raz`.

### 🔴 חריגה — שלושה מפתחות ללא namespace

| מפתח | שורה | מה נשמר |
|---|---|---|
| `expense_app_theme_v1` | 8181, 8186 | מצב לילה/בהיר |
| `expense_app_last_backup_banner_v1` | 8383 | מתי הוצג באנר גיבוי |
| `expense_app_supabase_last_ping` | 8612 | ping אחרון ל-Supabase |

שלושתם **משותפים בין demo ל-production** — אין `STORAGE_NS_PREFIX`.

`CLAUDE.md` קובע: *"localStorage namespaces — `demo__` לדמו, ללא prefix לפרודקשן. **אין ערבוב**."* — הכלל מופר בשלושה מקומות.

**חומרה: נמוכה** (העדפות תצוגה, לא נתונים כספיים) — אבל מצב לילה שמשתנה בדמו משנה גם את production, וזה יכול להיראות כמו באג.

---

## 2. 11 מפתחות הנתונים — לכל משתמש

`getAllUserStorageKeys(userId)` — **שורה 2727**. זו הרשימה הקנונית. כל מפתח חדש **חייב** להתווסף כאן, אחרת הוא לא יסונכרן ולא יגובה.

| # | Base key | מה נשמר | נוסף ב־ |
|---|---|---|---|
| 1 | `expense_app_overrides_v29` | הוצאות — ליבת הנתונים | — |
| 2 | `expense_app_manual_settings_v35` | הגדרות ידניות | — |
| 3 | `expense_app_income_entries_v1` | הכנסות | — |
| 4 | `expense_app_debt_entries_v1` | חובות | — |
| 5 | `expense_app_categories_v1` | קטגוריות ותקציבים | — |
| 6 | `expense_app_payment_methods_v1` | כרטיסי אשראי | — |
| 7 | `expense_app_ui_prefs_v1` | העדפות תצוגה | — |
| 8 | `expense_app_goals_v1` | יעדים | `371273e` 09/09 |
| 9 | `expense_app_merchant_memory_v1` | זיכרון עסק לייבוא | `94094a9` 09/09 |
| 10 | `expense_app_monthly_categories_v1` | קטגוריות לפי חודש | `c5a7475` 10/09 |
| 11 | `expense_app_dismissed_review_items_v1` | בדיקות שנדחו | `2e4bc93` 10/09 |

**4 מתוך 11 נוספו ביומיים** — ו-`18f64dc` נדרש כדי לרשום אותם. זה מדגים למה הרשימה הזו חייבת להיות מתוחזקת.

### מפתחות משותפים (לא לפי משתמש)

| מפתח | שורה | הערה |
|---|---|---|
| `expense_app_shared_settlements_v1` | 4539 | סליקות זוגיות |
| `expense_app_shared_settlements_tombstones_v1` | 4542 | ✅ **tombstones קיימים** |

> 📌 **תיקון להנחה קודמת:** זיכרון הפרויקט מ-`project_settlement_sync_risk` קבע "אין tombstone למחיקה". **זה כבר לא נכון** — `getSharedSettlementsTombstonesKey()` קיים ומסונכרן. הזיכרון מיושן.

### מפתחות מקומיים — לא מסונכרנים בכוונה

| מפתח | תפקיד |
|---|---|
| `ACTIVE_USER_STORAGE_KEY` | מי המשתמש הפעיל (בגיבוי, לא בסנכרון) |
| `CLOUD_SYNC_CONFIG_KEY` | URL + anon key |
| `SUPABASE_AUTH_SESSION_KEY` | סשן |
| `LOCAL_RECOVERY_POINTS_KEY` | נקודות שחזור מקומיות |
| `LOCAL_DATA_CHANGED_AT_KEY_<user>` | חותמת שינוי לפי משתמש |
| `CLOUD_SPLIT_MIGRATION_FLAG` | flag חד-פעמי |

---

## 3. שלוש רשימות מפתחות — לא לבלבל ביניהן

| פונקציה | שורה | מכילה | משמשת ל־ |
|---|---|---|---|
| `getAllUserStorageKeys(userId)` | 2727 | 11 מפתחות משתמש | הבסיס לכל השאר |
| `getBackupKeys()` | 2741 | ACTIVE_USER + 11×2 משתמשים + shared + tombstones | ייצוא/ייבוא JSON מלא |
| `getCloudSyncKeys()` | 2748 | 11×2 משתמשים + shared + tombstones | snapshot מלא לשחזור |
| `getCloudSyncKeysForUser(userId)` | 2762 | 11 מפתחות של משתמש אחד | **מה שמכשיר כותב לשורה שלו** |

**ההבחנה הקריטית:** `getCloudSyncKeysForUser` **אינו כולל** את הסליקות המשותפות — לפי הערה מפורשת בקוד (שורות 2759–2761): הסליקות חיות בשורה נפרדת, לא בשורת המשתמש. זו ההגנה מפני דריסה הדדית.

---

## 4. Supabase — טבלה אחת, ארבעה סוגי שורות

```sql
create table public.app_state (
  id         text primary key,
  payload    jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);
```

| מזהה שורה | קבוע | תפקיד | כתיבה |
|---|---|---|---|
| `user-raz` / `user-shira` | `CLOUD_SYNC_ROW_PREFIX` (2549) | נתוני משתמש | רק המכשיר של אותו משתמש |
| `shared-settlements` | `CLOUD_SETTLEMENTS_ROW_ID` (2550) | סליקות זוגיות | שני הצדדים — guarded + append-merge |
| `backup-snapshot-<ts>` | `CLOUD_BACKUP_PREFIX` (2553) | snapshot | אוטומטי |
| `shared-expense-app` | `CLOUD_SYNC_ROW_ID` (2548) | **legacy — קפוא** | קריאה בלבד ע"י migration |

### RLS — ✅ תקין (אומת מול המסד החי 2026-09-10)

> ⚠️ גרסה קודמת של המסמך קבעה ש-RLS "פתוח ל-anon", על סמך `supabase-cloud-sync-setup.sql`. **הקובץ מיושן ביחס למה שפרוס.**

`pg_policies` מחזיר **9 policies, כולן `{authenticated}` — אף אחת ל-`anon`:**

| טבלה | פעולות | תנאי |
|---|---|---|
| `app_state` | SELECT/INSERT/UPDATE/DELETE | חברות ב-`app_state_allowed_users` **וגם** `owner_id = auth.uid() OR owner_id IS NULL` |
| `app_state_demo` | SELECT/INSERT/UPDATE/DELETE | אותו דפוס מול `app_state_demo_allowed_users` |
| `app_state_allowed_users` | SELECT | `user_id = auth.uid()` |

כלומר `supabase-household-read-policy-migration.sql` **הוחל בפועל**, וההפרדה בין רז לשירה קיימת **ברמת השרת** ולא רק ב-client.

**נוסף שלא היה מתועד:** טבלה נפרדת `app_state_demo` — demo ו-production מופרדים **גם ברמת המסד**, לא רק ב-`STORAGE_NS_PREFIX`.

**הערה על `get_advisors`:** ה-linter **אינו** מזהה policy מתירנית מדי — הוא בודק רק אם RLS מופעל. "advisors נקי" אינו שווה "מאובטח". כאן צריך היה לקרוא את ה-policies עצמן.

---

## 5. כללי תחזוקה — לפני שמוסיפים מפתח חדש

1. להוסיף ל-`getAllUserStorageKeys()` (שורה 2727) — **אחרת לא יסונכרן ולא יגובה**
2. להחליט: לפי משתמש או משותף? משותף → שורה נפרדת ב-Supabase, לא בשורת המשתמש
3. לוודא `STORAGE_NS_PREFIX` — אחרת demo ו-production יתערבבו
4. לבדוק גודל — `d87d2c0` תיקן חריגת מכסת `localStorage` בנקודות שחזור
5. לעדכן את הטבלה בסעיף 2 כאן

---

## 6. מה לא מופה כאן

- **מבנה ה-payload הפנימי** של כל מפתח (סכמת האובייקטים) — `UNKNOWN`, דורש סבב נוסף
- **לוגיקת ה-merge** בעת pull — נגזרת מ-`updated_at`, לא נבדקה לעומק
- **מסלול הייבוא** — `ccImportRows` staging → review → overrides — מתועד ב-`FULL_PRODUCT_SURFACE_MAP.md` ברמה גבוהה בלבד
