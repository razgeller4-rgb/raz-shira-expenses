# מפת קוד — expense-app-v37-demo.html

קובץ יחיד, 7437 שורות. HTML + CSS inline + vanilla JS. תלויות חיצוניות: Chart.js (שורה 15), XLSX 0.18.5 (שורה 16).

---

## 1. מפת אזורים (טווחי שורות)

| טווח | תוכן |
|------|------|
| 1–16 | `<head>`, meta, CDN scripts |
| 17–1377 | **CSS מלא**. `:root` design tokens בשורה 26. זהויות צבע לכל טאב: `[data-panel=...] .panel-hero` 199–207, `.kpi::before` 268–275, overrides לטאב shared 665–666 |
| 1378–1379 | סוף head / פתיחת body |
| 1382–1400 | backup banner (`#backupBanner`) |
| 1401–1440 | topbar: mini-nav, `#userSelect`, `#sheetSelect`, KPI עליון, כפתור dark mode |
| 1442–1468 | `#tabbar`, drawer צדדי (`#sideDrawer`, `#drawerNav`) |
| **1470–1524** | panel `dashboard` — hero (`#dashboardHero`), `#dashboardPrefsPanel`, bento `#excelKpis`, גרף `#budgetChart` |
| **1525–1544** | panel `budget` — `#budgetOverviewHero`, `#categorySummary` |
| **1545–1567** | panel `income` — `#incomeMonthTotal`, `#incomeList` |
| **1568–1589** | panel `cards` (אמצעי תשלום) — `#paymentMethodList` |
| **1590–1689** | panel `expenses` — סרגל סינון (1598–1610), כפתורי פעולה (1623–1635), `#addExpenseForm` (1638+), `#table`, `#mobileExpenseList` |
| **1690–1739** | panel `shared` — כרטיסי מאזן, סינון נפרד, `#sharedExpensesList` |
| **1740–1808** | panel `debts` — `#debtDisabledState` (1755) |
| **1809–1835** | panel `yearly` — `#yearlyKpis`, `#yearlyTable` |
| **1836–1922** | panel `backup` — sync card, recovery points, ייצוא/ייבוא |
| 1923–1938 | `#debtDetailsModal` (המודאל היחיד המוגדר ב-HTML) |
| 1939–1967 | script #1 — namespace + הזרקת `panel-hero` לכל טאב ב-DOMContentLoaded |
| **1970–2180** | קבועות ו-state גלובלי (ראו §2) |
| **2180–2340** | storage keys, recovery points מקומיות |
| **2340–2575** | הגדרות: payment methods, ui prefs, categories, debt settings |
| **2576–3240** | **שכבת ענן** — snapshot, Supabase fetch/push/pull, per-user rows, settlements row, bootstrap+migration |
| 3240–3470 | נירמול שורות, משתמשים, **הוצאות משותפות** (ledger, summary, settlements) |
| 3469–3630 | manual settings, **מודל הכנסות** + מיגרציות, loan schedule, father history |
| 3630–3740 | גיבוי JSON (collect/export/import) |
| 3742–3945 | utils: פורמט, תאריכים, גיליונות, recurring rows, שיוך חיוב |
| 3945–4230 | **חישובי מאזן וסטטיסטיקה**, קטלוגי widgets לדשבורד ולשנתי |
| 4231–4470 | מודאל חובות, selects, מנהל קטגוריות, החזרי אבא, סינון |
| 4481–4830 | רינדור דשבורד: KPIs, bento, forecast, hero, budget, category summary, chart |
| 5095–5450 | טופס הוצאה חדשה, טאב אשראיים, טאב הכנסות |
| 5450–5945 | CRUD הוצאות: מחיקה, עריכה inline, העתקה לחודש הבא, הוספה |
| 5947–6090 | `renderTable` — feed דסקטופ |
| 6091–6300 | drawer, ניווט, טאב shared, `renderTabs`, `renderDebts` |
| 6433–6505 | `renderYearly`, `renderHero`, dark mode, FAB |
| **6506–6590** | `render()` — הצינור המרכזי |
| 6590–6670 | קישור כל ה-event handlers (`onclick=` ב-JS) |
| 6674–6900 | banner גיבוי, hero collapse, **רשימת הוצאות מובייל** + מודאל עריכה מובייל |
| 6914–6955 | keepalive ל-Supabase, pull-on-focus |
| 6955–7405 | **ייבוא דוח אשראי** (XLSX) — parse, זיהוי כפילויות, מודאל, אישור |

---

## 2. מודל הנתונים

State גלובלי (2119–2150): `selectedSheet`, `activeTab`, `selectedYear`, `currentUser`, `editMode`, `incomeEditMode`, `debtEditMode`, `categoryEditMode`, `cardEditMode`, `dashboardPrefsOpen`, `yearlyPrefsOpen`, `selectedExpenseRows:Set`, `inlineEditingExpenseRows:Set`, `inlineExpenseDrafts:{}`, `cloudSyncState`, `settlementsDirty`.

מפתחות localStorage (2189–2196), כולם עם prefix `demo__` ו-suffix `_shira` למשתמש שאינו raz:

### הוצאה (`expense_app_overrides_v29[sheet][]`)
מאומת מול הגיבוי `backups/raz-expenses-backup-2026-06-26_21-29.json`:
```
row, date_raw ("DD/MM/YYYY"), merchant, amount, category, type ("קבועה"|"משתנה"),
payment (שם כרטיס | ""), notes, immediate ("כן"|""),
billingShiftMonths (0|1), copiedFromKey ("<sheet>::<row>"), recurringId,
sharedExpense:bool, sharedWith, sharedPaidBy, sharedEntryId,
sharedSplitMode ("percent"|"amount"), sharedSplitPercent, sharedOwnerAmount
```
המפתח הלוגי הוא `row` (מספר רץ בתוך הגיליון) — לא id גלובלי.

### הכנסה (`expense_app_income_entries_v1[sheet][]`) — 3532
`id ("income-<ts>")`, `source`, `amount`, `date_raw`, `type` ("salary"|"other"|"bitpay"), `recurring:bool`, `recurringDay`.
בגיבוי יש רשומות ישנות ללא `type/recurring` → מכוסה ע"י `normalizeIncomeRow`.

### הגדרות חודש (`expense_app_manual_settings_v35[sheet]`)
`{openingBalance:number|null, salary:number|null}`. `salary` הוא שריד — מהוגר להכנסות ע"י `migrateManualSalaryToIncomeEntry` (3492).

### חובות (`expense_app_debt_entries_v1`) — אובייקט יחיד, לא per-sheet
`enabled:bool`, `fatherDebtStart:number`, `fatherHistory:[{date_raw, amount, description, source}]`, `loanSchedule:[{installment, dueDate, total, interest, principal}]`.

### קטגוריות (`expense_app_categories_v1`) — מערך `{name, budget:number|null}`
### כרטיסים (`expense_app_payment_methods_v1`) — `{id, name, cycleDay, isImmediate, last4}`. אצל raz בגיבוי הערך `null` → נופל ל-`DEFAULT_PAYMENT_METHODS` (2047).
### העדפות UI (`expense_app_ui_prefs_v1`) — `{dashboardWidgets[], yearlyWidgets[], yearlyColumns[]}`
### סליקות (`expense_app_shared_settlements_v1`) — **גלובלי, לא per-user** (3408). נשמר בשורת ענן נפרדת `shared-settlements`. יש tombstones (3411).

### קבועות קשיחות בקוד (לא ב-storage)
`BASE_SHEET_OPTIONS` (2021), `LOAN_SCHEDULE` 36 תשלומים (2078–2116), `FATHER_REPAYMENTS_HISTORY` (2069), `FATHER_DEBT_START=15750` (2068) — אבל בגיבוי הערך בפועל 18250. **מקור אמת כפול.**

---

## 3. צינור הרינדור

`render()` (6506) הוא נקודת כניסה יחידה וגסה: הוא מרנדר **את כל התשעה טאבים בכל קריאה**, ללא קשר ל-`activeTab`.

סדר: `syncRecurringFixedRows` → `renderTabs` → `renderSelect` → `renderYearSelect` → `renderFilterOptions` → `renderDashboardPrefsPanel` → `renderYearlyPrefsPanel` → `renderNewCategoryOptions` → `renderPaymentSelectOptions` → `renderSharedExpenseCopy` → `syncNewSharedExpenseState` → `renderPaymentMethodTab` → `renderHero` → `renderDashboardHero` → `renderExcelKpis` → `renderBudgetOverview` → `renderCategorySummary` → `renderChart` → `renderIncomeTab` → `renderTable` → `renderSharedExpensesTab` → `renderDebts` → `renderYearly` → `renderCloudSyncStatus` → `renderRecoveryPoints`, ואז ~40 שורות של סנכרון טקסט/`style.display` לכפתורים ידנית (6541–6588).

מי קורא ל-`render()`: כל שינוי select/סינון (6591–6604), מעבר טאב (6605), כל toggle של מצב עריכה, כל CRUD (`addNewExpense`, `updateRow`, `deleteRow`, `saveInlineExpenseEdit`, copy/move), pull מהענן, resize רוחב (6665).

**re-render מיותר / בעיות:**
- הקלדה ב-`#searchInput` (`oninput=render`, 6593) מרנדרת גם את הגרף, הטאב השנתי, החובות והמשותפות. זה המקור העיקרי לתחושת איטיות במובייל.
- `renderChart` (4826) בונה `new Chart` מחדש בכל render.
- `renderMobileExpenseList` נקרא **מתוך `renderCategorySummary`** (4824) ולא מ-`render()` — צימוד מוסתר; שינוי בטאב תקציב שובר את רשימת ההוצאות במובייל.
- `renderTabs`+`render` נקראים ברצף בכמה מקומות (6605, `switchToTab` 6112) — `renderTabs` רץ פעמיים.

---

## 4. חוב טכני קונקרטי

**XSS / innerHTML עם קלט משתמש** (58 שימושי `innerHTML`, רק פונקציית escape אחת — `escapeHtmlAttr` 6967 — ומשמשת אך ורק בייבוא אשראי):
- `renderTable` 6009–6012: `${e.merchant}` נזרק ל-innerHTML ללא escape. גם 6019 (`draft.merchant` בכותרת כרטיס).
- 6039: `value="${...replace(/"/g,"&quot;")}"` — escape חלקי, בורח מגרשיים בלבד, לא מ-`<`.
- `renderMobileExpenseList` 6750: `${e.merchant}` גולמי.
- `renderSharedExpensesTab` 6241, `renderIncomeTab` 5373+, `renderPaymentMethodTab` 5199, `renderDebts` 6413 — כולם משרשרים שדות טקסט חופשי.
- הסיכון מעשי נמוך (שני משתמשים, אין קלט חיצוני) פרט ל**ייבוא דוח אשראי** — שם שמות בתי עסק מגיעים מקובץ חיצוני. `parseCCStatement` 7101.

**inline onclick מול addEventListener:** 96 מופעי `onclick` מול 9 `addEventListener`. שלושה סגנונות מעורבים באותו קובץ: `onclick=` ב-HTML (1420, 1456, 1475, 7435), `onclick=` במחרוזות innerHTML (רוב 96), ו-`el.onclick=` ב-JS (6605–6664). ה-handlers במחרוזות מייצרים תלות סמויה בשמות פונקציות גלובליים ומונעים מודולריזציה.

**קוד כפול:**
- שני מסלולי עריכת הוצאה שלמים: דסקטופ `renderTable` (5947) ומובייל `showMobileEditSheet` (6813) + `saveMobileEdit` (6859) — לוגיקת שמירה מיושמת פעמיים.
- שתי המרות תאריך כמעט זהות: `toIsoDate` (3769), `parseDisplayDateToISO` (4293), `dateRawToISO` (6849).
- `getPaymentMethodChargeForSheet` / `...CountForSheet` / `...Scheduled...` (5169–5187) — ארבע וריאציות של אותו לולאה.
- כל טאב מייצר `empty-state` משלו: 5380 (הכנסות), 5959 (הוצאות, עם SVG), 6227 (משותפות), 6731 (מובייל — טקסט פשוט בלבד).

**פונקציות מתות / כמעט מתות:**
- `cycleMiniNavTab` (6129) — מוגדרת, אף פעם לא נקראת.
- `toggleHeroCollapse` (6707) — מוגדרת, אף פעם לא נקראת. `initHeroCollapse` (6716) קורא ל-`#heroCard`/`#heroCollapseBtn` שאינם קיימים ב-HTML הנוכחי (ה-hero הוא `#dashboardHero`) → no-op שקט.
- `renderMiniNavMeta` (6137) — קיימת עם קריאה אחת בלבד; `#miniNavUserChip`/`#miniNavSheetChip` מוגדרים `display:none` (1403–1404).
- `showLocalDraftDebug`/`append`/`clear` (2151–2178) — פעילים רק ב-`file://`, שהוא אסור לפי workflow הפרויקט.

**חוסר עקביות בין טאבים:**
- טאב הוצאות: חיפוש + 5 סינונים + מיון (1598–1610). טאב משותפות: חיפוש + 3 סינונים (1719–1723). טאב הכנסות, אשראיים, חובות: **אין חיפוש/סינון בכלל**.
- טאב הוצאות מקבל שתי תצוגות (feed דסקטופ + כרטיסי מובייל). שאר הטאבים — תצוגה אחת שנשברת במובייל (הטאב השנתי הוא `<table>` גולמי, 1826–1831).
- `render()` מסנכרן טקסט כפתורי "מצב עריכה" ידנית לחמישה טאבים בנפרד (6552–6577) במקום דפוס אחד.

**מחרוזות ומספרי קסם:**
- `"קבועה"`/`"משתנה"`/`"כן"` פזורים כליטרלים בעשרות מקומות (למשל 3953–3954, 6079).
- `"raz"` מקודד קשיח כמשתמש-ברירת-מחדל בלוגיקת מפתחות (2187) וגם בחישוב יתרת פתיחה (3967) — הוספת משתמש שלישי תשבור.
- ערכי סף: `CLOUD_PULL_ON_FOCUS_MIN_MS=30000` (2030), `MAX_LOCAL_RECOVERY_POINTS=12`, `MAX_CLOUD_RECOVERY_POINTS=20` — מוגדרים כקבועות (טוב), אך `1200`/`3000` (6932–6933) ו-`dur=700` (4590) קשיחים.
- מפתח קטגוריה מקודד ב-URI בתוך ברירת מחדל: `"category_%D7%9E%D7%A1%D7%97%D7%A8"` (2059) — שביר.

---

## 5. רכיבים משותפים שכבר קיימים

| רכיב | מצב |
|------|-----|
| **מודאל** | `.modal-backdrop`/`.modal-card` — קיים ב-CSS ומיושם ב-`#debtDetailsModal` (1923). מיובא מחדש ידנית ב-`showMobileEditSheet` (6825, עם style inline) וב-`showCCImportModal` (7238). **אין פונקציית `openModal(title, html)` גנרית.** |
| **Toast** | **לא קיים.** במקומו: `#backupBanner` (1382), `setBackupStatus` (3661) שכותב לאלמנט קבוע, `cloudSyncState.message` (2369), ו-`alert()` במקומות אחרים. |
| **טבלה** | אין רכיב טבלה. שלוש מימושים: feed מבוסס div (5947), `<table>` בטאב השנתי (1826), טבלת ייבוא שנבנית ב-DOM API (`buildCCImportTable` 7325). |
| **כרטיס** | `.kpi`, `.section`, `.info-box`, `.compact-badge` — טוקנים משותפים ועקביים יחסית. זה החלק הבריא. |
| **Empty state** | `.empty-state` + `.empty-art` קיימים ב-CSS, אבל כל טאב כותב markup משלו (ראו §4). |
| **אישור מחיקה** | `confirm()` נטיב, לא אחיד: יש ב-`deleteRow`? (5498) ובהסתרת טאב חובות (6612). חלק מהמחיקות (`deleteIncomeRow` 3579, `deleteCategoryRow` 4380, `deletePaymentMethodRow` 5360) — לבדוק פרטנית לפני שינוי. |
| **Sections מתקפלים** | `toggleSection(el)` (3737) — כן משותף, בשימוש עקבי. |

---

## 6. אזורי סיכון

**חישובי מאזן**
- `getDisplayedClosingBalance` (3972) = `openingBalance + הכנסות − סה"כ הוצאות − קרן הלוואה חודשית`. תלוי ב-`getDisplayedOpeningBalance` (3963) שמחזיר `null` אם אין `openingBalance` ידני ואין summary מוזרם — ואז כל שרשרת ה-KPI מקבלת `null`.
- `getExpenseStats` (3945) — סוכם **את כל השורות בגיליון**, כולל הוצאות משותפות במלוא הסכום (לא רק החלק של המשתמש). זה עקבי עם המודל ("ההוצאה נשארת אצל מי ששילם") אבל אינטואיטיבית מבלבל.
- `getSharedExpenseSummary` (3379) — מאזן נטו מחושב מחדש מכל ההיסטוריה בכל קריאה, ומופחת בסליקות. **אין snapshot** — שינוי רטרואקטיבי בהוצאה ישנה משנה את המאזן הנוכחי.
- `buildSharedExpenseLedger` (3336) — ה-id הוא `sharedEntryId` אם קיים, אחרת fallback `${user}-${sheet}-${row}` (3348). `row` הוא מספר רץ בגיליון → **מחיקה של שורה קודמת יכולה לשנות זהות של רשומה**.

**Sync**
- שלוש שורות ענן שונות: `user-raz`, `user-shira` (per-device write), ו-`shared-settlements` (co-edited, 2027). מכשיר כותב רק לשורה שלו — הפרדה נכונה.
- `getCloudSyncKeysForUser` (2216) **מכוון** לא כולל את הסליקות. הערה מפורשת בקוד 2213–2215 — אל תשנה.
- `pushSettlementsRow` (2865) עם `retry=true` ו-append-merge; `applySettlementsRow` (2908). tombstones (3411/3424) קיימים — טוב, אבל התלות בין tombstone ל-id החלש מ-3348 היא נקודת הכשל.
- `scheduleCloudSync` (3031) — debounce; `suppressCloudSync` (2147) משמש בעת pull. כל `saveXxx` קורא ל-`markLocalDataChanged`+`scheduleCloudSync`.
- בקובץ demo: `DEFAULT_CLOUD_SYNC_CONFIG.disabled = true` (2043) — הסנכרון כבוי. זו ההגנה היחידה מפני נגיעה בנתוני production; **אל תשנה שורה זו בדמו**.

**Migrations**
- `runIncomeMigrations` (3511) — רצה ב-DOMContentLoaded (1990). מהגרת `manualSettings.salary` → רשומת הכנסה. flag ב-localStorage.
- `migrateBlobToPerUserRows` (3129) — חד-פעמית, מוגנת ב-`CLOUD_SPLIT_MIGRATION_FLAG` (2029). קוראת מהשורה הישנה `shared-expense-app`.
- `normalizeLegacyRows` (3248), `normalizeIncomeRow` (3532), `normalizePaymentMethodItem` (2387), `normalizeDebtData` (2492) — כולן רצות בקריאה, לא בכתיבה. משמע: נתונים ישנים בגיבוי נשארים ישנים בדיסק.
- `syncRecurringFixedRows` (3886) רצה **בתחילת כל `render()`** ויכולה לכתוב ל-localStorage → כל render עלול להדליק `scheduleCloudSync`. אזור רגיש.
