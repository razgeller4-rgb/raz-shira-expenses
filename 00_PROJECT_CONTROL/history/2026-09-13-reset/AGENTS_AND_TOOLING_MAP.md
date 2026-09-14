# מפת סוכנים, פלאגינים, סקילים וקונקטורים

**נוצר:** 2026-09-10 · **שיטה:** קריאה ישירה של `.claude/agents/*.md`, `~/.claude/plugins/installed_plugins.json`, `~/.claude/plugins/cache/`, ורשימת ה-MCP הזמינה בסשן. **לא מהזיכרון.**

> **עיקרון:** הכלי הוא חלק מחבילת ראיות, לא מטרה. בכל משימה מדווחים `USED` / `SKIPPED — not needed` / `UNAVAILABLE`. דילוג בשתיקה הוא הכשל, לא הדילוג.

---

## 1. סוכני הפרויקט — `.claude/agents/` (17)

| סוכן | תפקיד | Tools | Perm | ראיית שימוש | הערכה |
|---|---|---|---|---|---|
| `chief-of-staff` | יעד גדול → תכנית | Read, Glob, Grep, LS, Skill | default | — | 🟡 חופף ל-main session |
| `feature-builder` | מימוש ממוקד | +Edit, MultiEdit, Write, Bash | default | ✅ `agent-memory/feature-builder/` — sync concurrency | 🟢 ליבה |
| `qa-release-reviewer` | סקירה לפני שחרור | +Bash | default | — | 🟢 ליבה |
| `domain-risk-reviewer` | סיכון דומיין | Read, Glob, Grep, LS, Skill | plan | ✅ `agent-memory/domain-risk-reviewer/` — settlement sync | 🟢 ליבה |
| `expense-ops-expert` | לוגיקת הוצאות | Read, Glob, Grep, LS, Skill | plan | — | 🟢 ייעודי לדומיין |
| `security-privacy-reviewer` | PII, auth, secrets | +Bash | plan | — | 🟢 ליבה |
| `codebase-cartographer` | מיפוי קוד | +Bash | plan | 🟡 `reports/map-code.md` (03/08) | 🟢 רלוונטי עכשיו |
| `database-designer` | סכמות | Read, Glob, Grep, WebSearch | plan | — | 🟡 רק ל-Supabase schema |
| `solution-architect` | חוזים, גבולות | +WebFetch | plan | — | 🟡 מותנה |
| `product-strategist` | scope, MVP | Read, Glob, Grep, LS, Skill | plan | — | 🟡 מותנה |
| `context-optimizer` | ייעול prompts | Read, Glob, Grep, LS, Edit | plan | — | 🟡 מותנה |
| `accessibility-expert` | WCAG | **כל הכלים** ⚠️ | default ⚠️ | — | 🔴 ר' פער A-1 |
| `agent-researcher` | מחקר סוכנים | WebSearch, WebFetch, Read, **Write** ⚠️ | default ⚠️ | — | 🔴 ר' פער A-2 |
| `ui-designer` | עיצוב ממשק | Write, Read, MultiEdit, WebSearch, WebFetch | default | 🟡 `reports/design-*.md` | 🟡 |
| `frontend-developer` | קומפוננטות | Write, Read, MultiEdit, Bash, Grep, Glob | default | — | 🟡 חופף ל-`feature-builder` |
| `brand-guardian` | עקביות מותג | Write, Read, MultiEdit, WebSearch, WebFetch | default | 🟡 `reports/botanic-*.md` | 🟡 |
| `whimsy-injector` | מיקרו-אינטראקציות | Read, Write, MultiEdit, Grep, Glob | default | — | ⚪ נמוך |

**כל 17 מוגדרים `model: inherit`** — אין בקרת עלות/latency לאף סוכן.

### 🔴 פערי הרשאה שנמצאו

**A-1 — `accessibility-expert` ללא הגבלת כלים.** אין שדה `tools:` ב-frontmatter כלל → יורש **את כל הכלים**, כולל `Write`, `Edit` ו-`Bash`. סוכן שתפקידו *לבקר* נגישות יכול לשכתב את הקוד שהוא מבקר.
**תיקון:** להוסיף `tools: Read, Glob, Grep, LS` ו-`permissionMode: plan`.

**A-2 — `agent-researcher` כותב ומביא מהרשת בלי `plan`.** `tools: WebSearch, WebFetch, Read, Write` ללא `permissionMode: plan`. סוכן שמוגדר "מחקר בלבד" יכול למשוך תוכן מהאינטרנט ולכתוב אותו לדיסק ללא אישור.
**תיקון:** להסיר `Write` או להוסיף `permissionMode: plan`.
> אותו פער בדיוק תועד ב-`AGENT_REGISTRY.md` של פרויקט המסחר. הוא לא תוקן, והועתק לכאן.

**A-3 — חפיפה לא מוכרעת.** `feature-builder` ↔ `frontend-developer`, ו-`ui-designer` ↔ `brand-guardian` ↔ `whimsy-injector`. אין כלל ניתוב שקובע מי מנצח, ולכן הבחירה נעשית לפי תחושה בכל פעם.

---

## 2. סוכנים גלובליים — `~/.claude/agents/` (18)

זמינים בכל פרויקט, **כולל כאן**. שישה מהם אינם רלוונטיים להוצאות ומייצרים רעש ניתוב:

| סוכן | שייך ל־ | מצב בפרויקט הזה |
|---|---|---|
| `payroll-domain-expert`, `payroll-qa-agent`, `compliance-reviewer` | תלושי שכר בלובירד | ❌ לא רלוונטי |
| `trading-risk-manager`, `pine-script-reviewer` | Swing Scanner | ❌ לא רלוונטי |
| `legacy-automation-auditor` | audit חד-פעמי | ⚪ לא נדרש |
| 12 הנותרים | חופפים לסוכני הפרויקט | 🟡 גרסת הפרויקט גוברת |

**המשמעות:** ברשימת הסוכנים שמוצגת בסשן מופיעים 6 סוכנים שאסור לבחור בהם כאן. אין מנגנון שחוסם אותם.

---

## 3. פלאגינים מותקנים (17)

| Plugin | גרסה | Skills שהוא מספק | רלוונטיות להוצאות |
|---|---|---|---|
| `chrome-devtools-mcp` | 1.7.0 | `chrome-devtools`, `a11y-debugging`, `debug-optimize-lcp`, `memory-leak-debugging`, `troubleshooting`, `chrome-devtools-cli` | 🟢 **הכלי המרכזי ל-QA ויזואלי** |
| `supabase` | 0.1.15 | `supabase`, `supabase-postgres-best-practices` | 🟢 גבוהה — הענן של האפליקציה |
| `github` | — | — | 🟢 PR/CI |
| `figma` | 2.2.96 | 12 skills (`figma-use`, `figma-design-to-code`, `figma-generate-design`…) | 🟡 רק אם יוחלט על סבב עיצוב |
| `frontend-design` | — | `frontend-design` | 🟡 |
| `pr-review-toolkit` | — | 5 סוכני review | 🟡 |
| `context7` | — | תיעוד ספריות עדכני | 🟡 ל-Chart.js / XLSX |
| `claude-md-management` | 1.0.0 | `claude-md-improver` | 🟢 רלוונטי — ל-`CLAUDE.md` יש 2 באגים |
| `security-guidance` | 2.0.7 | — | 🟡 |
| `hookify` | — | `writing-rules` | ⚪ דורש אישור מפורש |
| `project-artifact` | — | `project-artifact` | ⚪ |
| `axe-accessibility@deque` | 0.2.0 | — | ❓ ר' T-2 |
| `cloudflare` | 1.0.0 | 13 skills | ❌ לא רלוונטי — GitHub Pages |
| `railway` | 1.3.7 | `use-railway` | ❌ לא רלוונטי |
| `reflex@reflex-agent-skills` | — | — | ❌ שייך ל-Swing Scanner |
| `pyright-lsp` | 1.0.0 | — | ❌ אין Python |
| `typescript-lsp` | 1.0.0 | — | ❌ vanilla JS, ללא build |

---

## 4. קונקטורים (MCP) — מחוברים מול לא־מאומתים

**ההבחנה קריטית:** פלאגין מותקן ≠ קונקטור מחובר. רבים חושפים רק `authenticate` — כלומר **אינם זמינים בפועל**.

### ✅ מחוברים ופעילים

| קונקטור | יכולת | שימוש בפרויקט |
|---|---|---|
| **Supabase** | `execute_sql`, `apply_migration`, `list_tables`, `get_advisors`, `query_logs` | 🟢 **ליבה** — v37 מסונכרן דרכו |
| **Claude in Chrome** | ניווט, screenshot, DOM, console, network | 🟢 **הדרך היחידה ל-QA ויזואלי אמיתי** |
| **chrome-devtools** | + `lighthouse_audit`, `performance_trace`, `emulate` | 🟢 מדידה, לא רק צילום |
| **Playwright** | screenshots, flow assertions, resize | 🟢 רגרסיה ב-390×844 / 1440×900 |
| **Context7** | תיעוד ספריות עדכני | 🟡 Chart.js, XLSX |
| **Figma** | קריאה ויצירה של עיצוב | 🟡 |
| **Gmail** | קריאה, טיוטות, שליחה | ⚠️ שליחה דורשת אישור מפורש |
| **computer-use** | שליטה בדסקטופ | ⚪ מוצא אחרון |
| **Claude Preview** | preview מקומי | ❌ נכשל על נתיב עברי (תועד בפרויקט המסחר) |
| **Word, Control_your_Mac, terminal, mcp-registry, scheduled-tasks, visualize** | שונות | ⚪ |

### ⛔ לא־מאומתים — חושפים `authenticate` בלבד

`cloudflare` (api/bindings/builds/observability) · `bigquery` · `definite` · `hex` · `datadog` · `pagerduty` · `asana` · `atlassian` · `notion` · `slack` · `amplitude` · `clickup` · `fireflies` · `intercom` · `linear` · `monday` · `pendo` · `similarweb` · `reflex`

**לדווח עליהם `UNAVAILABLE`, לא `SKIPPED`.** אף אחד מהם אינו נדרש לפרויקט הזה.

---

## 5. Skills — 59 זמינים במיקום נפרד

> ⚠️ **תיקון לגרסה הראשונה של המסמך הזה (2026-09-10).** נכתב כאן שה-skills העיצוביים "אינם קיימים". **זה היה שגוי.** החיפוש נעשה ב-`~/.claude/plugins/` ובבינארי בלבד, ופספס את המיקום האמיתי. `/design-critique` הורץ בפועל ונטען בהצלחה.

**המיקום האמיתי:**
```
~/Library/Application Support/Claude/local-agent-mode-sessions/<session>/<id>/rpm/plugin_*/skills/
```
**לא** ב-`~/.claude/plugins/cache/`. כל חיפוש עתידי אחרי skill חייב לכלול את הנתיב הזה.

### משפחת העיצוב — כולם קיימים

`design-critique` · `accessibility-review` · `design-system` · `design-handoff` · `ux-copy`

### שאר ה-59 — רלוונטיים לפרויקט

| קטגוריה | Skills |
|---|---|
| קוד ואיכות | `code-review`, `debug`, `testing-strategy`, `tech-debt`, `architecture`, `system-design` |
| נתונים | `explore-data`, `data-visualization`, `create-viz`, `validate-data`, `sql-queries`, `write-query`, `statistical-analysis`, `build-dashboard` |
| מוצר ותכנון | `product-brainstorming`, `write-spec`, `roadmap-update`, `sprint-planning`, `change-request`, `risk-assessment` |
| תפעול | `deploy-checklist`, `incident-response`, `runbook`, `process-doc`, `documentation`, `status-report` |
| Figma | 13 skills |

**רלוונטיים במיוחד כאן:** `deploy-checklist` (לפני קידום demo→v37) · `risk-assessment` (לחשדות ב-`CALC_LOGIC_MAP.md`) · `validate-data` (לפער 190 ₪) · `accessibility-review` + `design-critique` (לסבב UX).

### 🔴 T-1 — אבל: skill אינו בדיקה

**אומת ישירות בסשן הזה.** `/design-critique` הורץ והפלט שלו הוא **checklist ותבנית פלט בלבד** — "First Impression", "Usability", "Visual Hierarchy", "Accessibility: Color contrast [Pass/fail]" — עם placeholders למילוי. **הוא לא מדד ולא בדק שום דבר.**

זה מאשר בראיה ישירה את מה שתועד בפרויקט המסחר: **"הרצתי את ה-skill" אינה ראיה.**

**איך משתמשים בהם נכון:** ה-skill מספק את ה-framework ואת מבנה הפלט. **המדידה עצמה** חייבת לבוא מ-`chrome-devtools` מול העמוד החי — contrast מחושב, tap targets נמדדים ב-JS, console נקרא, screenshot נלכד. ה-skill מארגן את התוצאה; הוא לא מייצר אותה.

**המשמעות ל-`CLAUDE.md`:** ההפניה ל-`design:design-critique` **תקינה מבחינת קיום**, אבל השם המדויק הוא `/design-critique` (ללא prefix `design:`). כדאי לתקן את התחביר, לא למחוק את השורה.

**T-2 — `axe-accessibility@deque` מותקן אך מצבו לא ידוע.**
מותקן ב-`~/.claude/plugins/cache/deque/axe-accessibility` (0.2.0, 03/09). בפרויקט המסחר תועד ש-Axe של Deque דורש מנוי בתשלום ושרז החליט ב-06/09 לא לרכוש. **הסתירה לא נפתרה** — לא ידוע אם הוא עובד כאן. לבדוק לפני שמסתמכים עליו.

**T-3 — לקח מתודולוגי: איפה לחפש skills.**
הטעות בגרסה הראשונה נבעה מחיפוש בשני מקומות בלבד (`~/.claude/plugins/`, הבינארי). skills חיים גם ב-`~/Library/Application Support/Claude/local-agent-mode-sessions/`.
**הכלל:** לפני שמצהירים ש-skill "לא קיים" — **פשוט להריץ אותו**. ההרצה היא הראיה, לא ה-`find`. אותו עיקרון בדיוק שהמסמך הזה דורש לגבי כל טענה אחרת.

---

## 6. ניתוב מומלץ — מתי איזה כלי

| טריגר | כלי | ראיה שהוא מייצר |
|---|---|---|
| יעד גדול → תכנית | `chief-of-staff` | תכנית עם gates |
| קוד לא מוכר / מפה מיושנת | `codebase-cartographer` | מפת קוד עם טווחי שורות |
| מימוש בדמו | `feature-builder` | diff |
| לוגיקת הוצאות/קטגוריות | `expense-ops-expert` | חוות דעת דומיין |
| **לפני שינוי מאזן/חיזוי/settlement** | `domain-risk-reviewer` | before/after עם מספרים |
| Supabase / PII / auth | `security-privacy-reviewer` + Supabase MCP `get_advisors` | דוח + advisors |
| **QA ויזואלי** | `chrome-devtools` → `take_screenshot` + `list_console_messages` | PNG + viewport + console |
| מדידת ביצועים/נגישות | `chrome-devtools` → `lighthouse_audit` | ציונים מדודים |
| רגרסיית UI | `playwright` — 390×844 ו-1440×900 | screenshots + assertions |
| לפני קידום demo → v37 | `qa-release-reviewer` | checklist מסומן |
| API של Chart.js / XLSX | `context7` | תיעוד עדכני |

---

## 7. פעולות מוצעות

| # | פעולה | סיכון | למה |
|---|---|---|---|
| 1 | לתקן `tools`/`permissionMode` ל-`accessibility-expert` ו-`agent-researcher` | נמוך | סוגר A-1, A-2 |
| 2 | לתקן את התחביר ב-`CLAUDE.md`: `design:design-critique` → `/design-critique` | נמוך | ה-skill קיים, השם שגוי |
| 3 | לבדוק אם `axe-accessibility` עובד | נמוך | סוגר T-2 |
| 4 | להכריע חפיפת `feature-builder`↔`frontend-developer` | נמוך | סוגר A-3 |
| 5 | לשקול הסרת 6 הפלאגינים הלא-רלוונטיים | נמוך | פחות רעש |

**אף שינוי לא בוצע.** המסמך הזה הוא inventory, לא policy.
