# Audit מבנה תיקיות — 2026-08-03

## סיווג קבצים

| קטגוריה | מיקום | הערה |
|---|---|---|
| קוד פעיל (production) | `expense-app-v37.html`, `index.html` | לא נגעתי |
| קוד פעיל (sandbox) | `expense-app-v37-demo.html` | כאן בוצעו כל שינויי גל 1–2 |
| קוד פעיל עצמאי | `payroll/index.html` | כלי נפרד, לא מחובר ל-Supabase, לא תלוי בשאר האפליקציה |
| תצורה | `.gitignore`, `.nojekyll`, `supabase-cloud-sync-setup.sql` | תקינים |
| תיעוד פרויקט | `CLAUDE.md` (root, מחייב) | נוסף `README.md` חדש כמבוא קצר |
| תיעוד תהליך | `.claude/PLAN.md`, `.claude/reports/*.md` | דוחות מיפוי/עיצוב שהופקו על ידי סוכנים |
| scripts | `.claude/check.sh` | חדש — בדיקת תחביר, אין build/lint אחר בפרויקט |
| ארכיון (read-only) | `archive/` | v34–v36 + דמואים ישנים. CLAUDE.md: "לא לגעת" — לא נגעתי |
| נתוני משתמש | `backups/*.json`, `backups/*.html`, `data/*.xlsx` | לא נגעתי, לא נמחק |

## ממצאים ותיקונים

| # | ממצא | פעולה |
|---|---|---|
| F1 | `.claude/agents/.claude/agent-memory/feature-builder/` — נתיב מקונן שגוי, כפילות מבנה `.claude` בתוך `.claude/agents` | ✅ תוקן — הועבר ל-`.claude/agent-memory/feature-builder/` (המיקום הנכון), תיקיות ריקות הוסרו |
| F2 | `raz-expenses-backup-2026-06-18_19-21.json` יושב ב-**root** במקום ב-`backups/` | ⏸️ **נחסם על ידי permission — גיבוי, דורש אישור מפורש**. לא הועבר. |
| F3 | `.claude/worktrees/` — 3 git worktrees ישנים משיחות סוכנים קודמות (`festive-bohr`, `priceless-pasteur`, `reverent-davinci`) | נבדק: כל השלושה **ממוזגים במלואם ל-main** (`git merge-base --is-ancestor` = כן, אין commits ייחודיים). אבל שניים מהם מכילים קבצים לא-tracked/uncommitted מקומיים (`festive-bohr`: `CLAUDE.md` שונה + 2 קבצי backup לא tracked; `reverent-davinci`: `expense-app-v36.html` לא tracked). **⏸️ נחסם על ידי permission** (`git worktree remove --force`) — לא הוסר. כבר ב-`.gitignore`, לא משפיע על git, רק על מקום בדיסק (3.6MB). |
| F4 | `document.title` "Expense App V36" בקובץ v37 | תוקן בגל 1 (demo בלבד עדיין) |
| F5 | מפתח Supabase `anonKey` גלוי בקוד (`sb_publishable_...`) | **לא סוד** — מפתח publishable/anon מוגן ב-RLS, זו הפרקטיקה הסטנדרטית של Supabase לצד קליינט. לא נדרשת פעולה. |
| F6 | `.env`/credentials בפרויקט | לא נמצא אף קובץ `.env*` בכל הפרויקט |
| F7 | קבצים רגישים ב-git | נבדק `git ls-files` — **אין** `.json`/`.xlsx`/`.env` tracked. `.gitignore` כבר חוסם את כולם נכון. |
| F8 | `.DS_Store` | untracked, מכוסה ב-`.gitignore` |
| F9 | דוחות עיצוב ישנים (`botanic-*.md`, `design-spec.md`, `design-ux-research.md`, `sync-concurrency-plan.md`) תחת `.claude/reports/` | נשארו במקום — הם כבר מאורגנים תחת תיקייה ייעודית, קריאת iteration ישנה של סוכנים. לא נוצר `docs/` כפול — יצירת עוד שכבה הייתה מפצלת את אותו תוכן בלי תועלת. |

## מה לא שונה ולמה

- **`archive/`** — CLAUDE.md אוסר נגיעה במפורש.
- **`backups/`, `data/`** — נתוני משתמש/גיבויים. שום מחיקה או שינוי שם.
- **`expense-app-v37.html`** — production, לא נגעתי לפני אישור על demo.
- **מבנה `.claude/reports/`** — כבר מרוכז, לא פוצל לתיקיית `docs/` נפרדת כדי לא ליצור שני מקורות אמת.

## פריטים שממתינים להחלטת רז

1. העברת `raz-expenses-backup-2026-06-18_19-21.json` מה-root ל-`backups/` (ארגון בלבד, לא מחיקה).
2. ניקוי `.claude/worktrees/` — 3 worktrees ישנים ממוזגים במלואם, חלקם עם קבצים מקומיים לא-tracked. מומלץ לבדוק ידנית מה יש שם לפני מחיקה (`git -C .claude/worktrees/festive-bohr-b24bd6 status`), ואז `git worktree remove <path> --force`.
