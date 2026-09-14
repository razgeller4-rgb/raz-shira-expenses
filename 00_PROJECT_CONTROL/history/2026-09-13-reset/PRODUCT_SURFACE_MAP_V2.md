# מפת משטח מוצר — V2

**נוצר:** 2026-09-10 · **מקור:** `expense-app-v37-demo.html` (9,221 שורות, 399 פונקציות) · **שיטה:** קריאה סטטית של הקוד.

> **מחליף את** `FULL_PRODUCT_SURFACE_MAP.md` (28/08, 40 שורות), שדיבר על "תשעת הטאבים" בזמן שיש **עשרה**, והחסיר 7 מתוך 8 פיצ'רים שנשלחו ב-09–10/09. המסמך הישן נשאר לצורך היסטוריה — אין למחוק.
>
> ⚠️ **מה זה לא:** זו קריאת קוד, **לא בדיקה חיה**. אין screenshots, אין מדידת ניגודיות, אין בדיקה באייפון. כל שורת "מצבים מיוחדים" כאן היא `INFERENCE` מהקוד עד שתיבדק ב-demo הפרוס.

---

## 10 הטאבים

| # | `data-tab` | תווית | render עיקרי |
|---|---|---|---|
| 1 | `dashboard` | דשבורד | `renderDashboardHero`, `renderDashboardReviewQueue`, `renderDashboardPrefsPanel` |
| 2 | `expenses` | הוצאות | `renderTable`, `renderMobileExpenseList` |
| 3 | `budget` | תקציב | `renderBudgetOverview`, `renderCategorySummary` |
| 4 | `shared` | משותף | `renderSharedExpensesTab`, `renderSharedExpenseCopy` |
| 5 | `income` | הכנסות | `renderIncomeTab`, `renderIncomeStats` |
| 6 | `cards` | אשראיים | `renderPaymentMethodTab` |
| 7 | `debts` | חובות והלוואות | `renderDebts`, `renderLoanScheduleRows` |
| 8 | **`goals`** | **יעדים** | `renderGoals` |
| 9 | `yearly` | סיכום שנתי | `renderYearly`, `renderYearlyStats`, `renderYearlyPrefsPanel` |
| 10 | `backup` | גיבוי נתונים | `renderRecoveryPoints`, `renderCloudSyncStatus`, `renderAppConnectionSummary` |

**`goals` נוסף ב-`371273e` (09/09) ולא הופיע באף מסמך בקרה עד עכשיו.**

**ניווט:** 5 טאבים ראשיים + תפריט "עוד" (`renderDrawerNav`, `closeMoreSheet`) שמכיל את `income`, `cards`, `debts`, `goals`, `yearly`, `backup`.

---

## פירוט לפי טאב

### 1. דשבורד
- **תצוגה:** hero עם יתרה, מדדי חודש, גרף (`renderChart`), KPI
- **תור בדיקה:** `getDashboardReviewItems` → פריטי תשומת לב. ניתן לסמן כטופל — נשמר ב-`expense_app_dismissed_review_items_v1` (`2e4bc93`)
- **התאמה אישית:** `getDashboardWidgetCatalog` + `renderDashboardPrefsPanel`
- **פיצ'רים חדשים (`a755ad5`, 10/09):** התראת הוצאה קבועה חסרה · תחזית תזרים לפי קצב · badge קטגוריה חסרה · צ'יפ חוב

### 2. הוצאות
- **תצוגה:** טבלה בדסקטופ (`renderTable`) / כרטיסים בנייד (`renderMobileExpenseList`)
- **סינונים — 6 פקדים מאומתים:** `searchInput` · `filterCategoryChips` · `filterPayment` · `filterType` · `filterImmediate` · `sortBy` + `sortDir`
- **סיכום מסונן:** `filteredExpenseSummary`
- **טופס הוספה:** `newAmount`, `newDate`
- **עריכה:** inline בדסקטופ · sheet בנייד · `renderEditSafetyBanner` במצב עריכה גלובלי

### 3. תקציב
- `renderBudgetOverview` — תכנון מול ביצוע · `renderCategorySummary` — פירוט
- **קטגוריות חודשיות (`c5a7475`, 10/09):** `getActiveCategoriesForSheet`, `getAllMonthlyCategoryStates` — בחירת קטגוריות רלוונטיות לכל חודש + תקציב ספציפי לחודש
- **drill-down** מקטגוריה להוצאות (`94094a9`) — מנקה סינון קודם במקום להוסיף עליו (`9b2ef7f`)

### 4. משותף
- מאזן זוגי, חלוקה, סליקות
- **סליקה:** `addSharedSettlement` / `deleteSharedSettlement` (שורות 4570, 4579) — עם tombstones ו-`confirm` מפורש
- סינון: משלם, חודש, מיון

### 5. הכנסות
- `renderIncomeTab` + **`renderIncomeStats` (`596e5ed`, 10/09)** — KPIs, פילוח לפי סוג, מגמת 6 חודשים
- מודל מאוחד: `type`, `recurring`, יום בחודש

### 6. אשראיים
- `renderPaymentMethodTab` — שם, 4 ספרות, יום מחזור, מיידי
- `getChargeDayGroups`, `getBillingSheetForExpense` — שיוך הוצאה למחזור חיוב

### 7. חובות והלוואות
- `renderDebts`, `renderLoanScheduleRows` — לוח סילוקין
- חוב לאבא: `getFatherHistory`, `getFatherNetAmount`, `getCombinedFatherRepayments`, `getFatherRepaymentRowsForSheet`
- קבוצות שנה מתקפלות · responsive בנייד (`1caa7bc`, `548bc22`)

### 8. יעדים ⭐ חדש
- `renderGoals` — הגדרת יעד, סכום, תאריך, התקדמות חיסכון
- מצב עריכה מפורש עם שמור/ביטול (`6c48d1e`)
- אחסון: `expense_app_goals_v1`

### 9. סיכום שנתי
- `renderYearlyStats`, `renderExcelKpis`, `getAvailableYears`, `yearSelect`
- **גרף מגמה שנתי + פילוח קטגוריות (`2a7cd3e`, 10/09)** · גריד KPI רב-עמודות (`0544e1b`)

### 10. גיבוי נתונים
- `renderCloudSyncStatus`, `renderAppConnectionSummary`, `renderRecoveryPoints`
- Google OAuth (`463e2b1`, `7e50b91`) · `renderAuthGate`, `renderAuthLoginState`
- push/pull, export/import, נקודות שחזור
- **`d87d2c0` (10/09):** הגנה מחריגת מכסת `localStorage` בנקודות שחזור — בלעדיה הייבוא נשבר

---

## משטחים חוצי-טאבים

| משטח | פונקציות | הערה |
|---|---|---|
| מעטפת | `renderTabs`, `renderDrawerNav`, `renderMiniNavMeta`, `renderUserSelect` | ניווט עליון/תחתון + "עוד" |
| מצב לילה | `expense_app_theme_v1` | 🔴 **ללא namespace** — משותף demo↔production |
| מצב עריכה גלובלי | `renderEditSafetyBanner`, `getEditableRows`, `getEditableRowsForUser` | |
| ייבוא אשראי | `ccImportModal`, `ccImportRows` staging | זיהוי fuzzy של עסק (`fa89864`) · זיכרון עסק (`94094a9`) · בטל ייבוא (`a755ad5`) |
| מודאלים — **3 בלבד** | `ccImportModal`, `debtDetailsModal`, sheet עריכה בנייד | focus-trap: `UNKNOWN` |
| Toast | — | success / error / info |
| מצבי ריק | 11 מופעים בקוד | לא נבדקו חזותית |

---

## פערים ידועים

| # | פער | סטטוס |
|---|---|---|
| 1 | QA חי ב-390×844 לכל 10 הטאבים | ❌ לא בוצע — אין screenshots |
| 2 | focus-trap במודאלים | `UNKNOWN` |
| 3 | ניגודיות מדודה (contrast ratio) | ❌ מעולם לא נמדד |
| 4 | גדלי מגע (touch targets) | ❌ לא נמדד |
| 5 | סכמת ה-payload של כל מפתח | `UNKNOWN` — ר' `DATA_MODEL_MAP.md` §6 |
| 6 | לוגיקת החישוב | ממופה בנפרד — `CALC_LOGIC_MAP.md` |

**הראיה היחידה שתסגור 1–4:** `chrome-devtools` מול ה-demo הפרוס. לא skill, לא קריאת קוד.
