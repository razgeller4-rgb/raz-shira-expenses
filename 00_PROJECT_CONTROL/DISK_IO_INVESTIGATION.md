# חקירת Disk IO — Supabase

**נוצר:** 2026-09-10 · **טריגר:** מייל Supabase 10/09 11:05 — *"running out of Disk IO Budget"*
**מסקנה:** 🎯 **נמצא הגורם. זה באג בדפוס הכתיבה, לא צורך אמיתי בשדרוג.**

---

## מה קורה בכל שינוי נתונים

`scheduleCloudSync()` (שורה 4040 ב-`expense-app-v37.html`) — debounce של **900 מילישניות** אחרי כל שינוי. ואז `pushCloudSnapshot()` (3928) מבצע **ארבע פעולות מסד**:

| # | פעולה | שורה | היקף |
|---|---|---|---|
| 1 | `upsertCloudRow('user-<id>')` | 3936 | UPDATE — 11 מפתחות של המשתמש |
| 2 | `pushSettlementsRow()` — אם dirty | 3940 | UPDATE |
| 3 | 🔴 **`saveCloudRecoveryPoint(collectCloudSnapshot())`** | **3945** | **INSERT של שורה חדשה עם snapshot מלא של שני המשתמשים** |
| 4 | `pruneCloudRecoveryPoints()` → DELETE | 3678 | מוחק את העודפים |
| 5 | `refreshRecoveryPoints()` → SELECT | 3955 | קורא 8 שורות |

**שורה 3943 בקוד מסבירה את הכוונה:**
> *"Recovery point stays a FULL snapshot (both users) so restore points remain complete."*

הכוונה נכונה. **התדירות היא הבעיה** — זה רץ בכל סנכרון אוטומטי, כלומר אחרי כל עריכה.

---

## הראיות מהמסד

```sql
select count(*), count(*) filter (where id like 'backup-snapshot-%'), ...
```
| מדד | ערך |
|---|---|
| שורות סה"כ | 24 |
| מהן `backup-snapshot-` | **20** |
| נפח payload כולל | **1001 kB** |
| payload הגדול ביותר | **46 kB** |
| טווח | 26/06 → 10/09 |

```sql
select relname, n_tup_ins, n_tup_upd, n_tup_del, n_dead_tup from pg_stat_user_tables
```
| טבלה | INSERT | UPDATE | DELETE | dead tuples | live |
|---|---|---|---|---|---|
| `app_state` | 30 | 33 | 30 | **25** | 24 |
| `app_state_demo` | 42 | 43 | 41 | 7 | 25 |

**הקריאה:** `n_tup_del` ≈ `n_tup_ins` — מחזור INSERT/DELETE מתמיד. ב-`app_state` יש **25 dead tuples מול 24 live** — יותר מתים מחיים. autovacuum רץ פעם אחת בלבד (09/09).

---

## למה זה ממצה את ה-IO

כל עריכה מייצרת:
1. **כתיבת שורת jsonb של עד 46KB** — page writes + WAL
2. **INSERT ואז DELETE** → dead tuples → autovacuum רץ שוב ושוב → **עוד IO**
3. SELECT של 8 שורות אחרי כל push

באפליקציה לשני משתמשים זה נראה זניח, אבל **המכפיל הוא מספר העריכות, לא מספר המשתמשים**. סשן עריכה של 20 שינויים = 20 INSERT של snapshot מלא + 20 מחזורי prune. על free tier עם תקציב IO קטן, זה מצטבר מהר.

---

## למה זה גם מסביר את ההשהיה (F-10)

הפרויקט מושהה אחרי 7 ימי **חוסר** פעילות. זה לא סותר — הדפוס הוא התפרצויות: ימים של אפס פעילות, ואז סשן עריכה שמייצר עשרות כתיבות כבדות.

---

## כיוון התיקון — לא לממש עכשיו

**העיקרון:** נקודת שחזור בענן היא רשת ביטחון, לא לוג שינויים. היא לא צריכה להיכתב בכל עריכה.

| אפשרות | מה | השפעה |
|---|---|---|
| **A (מומלץ)** | להוציא את `saveCloudRecoveryPoint` מ-`pushCloudSnapshot`, ולהשאיר אותו רק באירועים משמעותיים: לפני pull, לפני שחזור, לפני ייבוא, ובקשה ידנית | מסיר את רוב ה-IO. נקודות שחזור **מקומיות** כבר קיימות (`LOCAL_RECOVERY_POINTS_KEY`) ונשמרות כל 30 שניות |
| **B** | throttle — נקודת שחזור ענן פעם בשעה לכל היותר | פשוט יותר, פחות יעיל |
| **C** | לדחוף delta במקום snapshot מלא | הכי יעיל, הכי מורכב, סיכון גבוה |

**מחלקת סיכון:** A — נוגע בנתיב הגיבוי. דורש `domain-risk-reviewer` ובדיקה שהשחזור עדיין עובד.

**מה שלא צריך:** שדרוג compute בתשלום. הבעיה אינה עומס אמיתי.

---

## אימות אחרי תיקון

```sql
select n_tup_ins, n_tup_del, n_dead_tup from pg_stat_user_tables where relname='app_state';
```
אחרי סשן עריכה של ~20 שינויים: `n_tup_ins` צריך לגדול ב-**0–1**, לא ב-20.
