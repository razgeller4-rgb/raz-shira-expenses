# מפת לוגיקת חישוב

**נוצר:** 2026-09-10 · **מקור:** `expense-app-v37-demo.html` · **שיטה:** קריאת קוד עם מספרי שורות.

> `CLAUDE.md` מגדיר את האזור הזה **סיכון גבוה**: *"לוגיקת מאזן — `getDisplayedClosingBalance`, `getSharedExpenseSummary`, חישובי חובות"*. עד היום לא היה תיעוד של הנוסחאות עצמן.
>
> ⚠️ **הסתייגות:** הנוסחאות אומתו בקריאת קוד. **אף אחת מהן לא הורצה עם מספרים אמיתיים בסבב הזה.** שלושת הסעיפים המסומנים 🔴 הם **חשדות מנומקים**, לא באגים מוכחים — הם דורשים אימות מספרי לפני שפועלים.

---

## 1. יתרת פתיחה — `getDisplayedOpeningBalance(sheet)` · שורה 5203

```js
if (manual.openingBalance != null) return manual.openingBalance;   // עדיפות 1
if (currentUser === "raz") {                                        // עדיפות 2
  const summary = getSheetSummaryByName(sheet);
  if (summary.opening != null) return summary.opening;
}
return null;                                                        // אחרת
```

### 🔴 C-1 — אסימטריה בין רז לשירה

הנפילה־אחורה ל-`getSheetSummaryByName` **מותנית ב-`currentUser === "raz"`**. לשירה אין מסלול שני.

**התוצאה בשרשרת:** אם שירה לא הגדירה `openingBalance` ידנית →
`opening = null` → `getDisplayedClosingBalance` מחזיר `null` → `buildForecast` מחזיר `{closing:null}` → **גם היתרה וגם התחזית מוצגות כ-`—`**.

**לאמת:** להיכנס כשירה ולבדוק אם הדשבורד מציג יתרה. אם לא — זו כנראה הסיבה, ולא באג תצוגה.

---

## 2. יתרת סגירה — `getDisplayedClosingBalance(sheet)` · שורה 5212

```
closing = opening + income − expenses − bankMonthlyPayment
```

| רכיב | מקור |
|---|---|
| `opening` | §1 — אם `null`, כל החישוב `null` |
| `income` | `getIncomeTotal(sheet)` |
| `expenses` | `getExpenseStats(sheet).total` |
| `bankMonthlyPayment` | `getLoanScheduleEntryForSheet(sheet)?.principal` — **רק אם** `isDebtTrackingEnabled()` |

### 🟡 C-2 — רק `principal` נגרע

מהתשלום החודשי לבנק נגרעת **רק הקרן**, לא הריבית. אם התשלום בפועל כולל ריבית, היא חסרה מהמאזן — אלא אם היא נרשמת בנפרד כשורת הוצאה. `UNKNOWN` — לא נבדק.

---

## 3. תחזית סוף חודש — `buildForecast()` · שורה 5814

```js
avgDaily            = stats.total / dayNow;
remainingDays       = daysInMonth − dayNow;
projectedSpendRest  = avgDaily × remainingDays;
projected           = closing − projectedSpendRest;
```

מוצג למשתמש (שורה 5940): *"בקצב ההוצאות הנוכחי (X/יום), צפוי להישאר Y בסוף החודש"*.

### 🔴 C-3 — חשד לספירה כפולה

`closing` כבר גורע את **כל** ההוצאות הרשומות בגיליון — כולל כאלה שמתוארכות להמשך החודש (חיובי אשראי עתידיים במחזור, הוצאות קבועות).

`avgDaily` מחלק את **אותו** `stats.total` במספר הימים שחלפו, ואז מכפיל בימים שנותרו — **ומחסיר שוב** מ-`closing`.

**התרחיש הבעייתי:** היום ה-10 בחודש. נרשמו 10,000 ₪ הוצאות, מהן 6,000 ₪ מתוארכות ל-28 בחודש.
- `closing` כבר הפחית את כל ה-10,000
- `avgDaily = 10,000/10 = 1,000`
- `projectedSpendRest = 1,000 × 20 = 20,000`
- `projected = closing − 20,000` — **הפחתה של 20,000 נוספים על הוצאות שכבר נספרו**

**למה זה סביר דווקא כאן:** האפליקציה מייבאת חיובי אשראי למחזור שלם מראש, כולל תאריכי חיוב עתידיים. כלומר `stats.total` כמעט אף פעם אינו "מה שהוצאתי עד היום".

**לאמת לפני שנוגעים:** לבחור חודש עם הוצאות עתידיות רשומות, לרשום `closing`, `avgDaily` ו-`projected` בפועל, ולבדוק אם `projected` נמוך באופן לא סביר. **לא לתקן לפני שיש מספרים.**

---

## 4. מאזן זוגי — `getSharedExpenseSummary()` · שורה 4510

```js
// שלב 1 — מהוצאות משותפות
entry.payerId === currentUser  →  netBalance += entry.partnerAmount   // הפרטנר חייב לי
entry.payerId === partnerId    →  netBalance −= entry.partnerAmount   // אני חייב לפרטנר

// שלב 2 — סליקות
s.paidById === partnerId && s.receivedById === currentUser  →  netBalance −= s.amount
s.paidById === currentUser && s.receivedById === partnerId  →  netBalance += s.amount
```

**פרשנות:** `netBalance > 0` → הפרטנר חייב לי. `< 0` → אני חייב.
**חשוב:** התוצאה **תלוית-משתמש** (`currentUser`). רז ושירה אמורים לראות מספרים הפוכים בסימן. אם שניהם רואים אותו סימן — זה באג.

**מוחזר גם:** `totalShared` (כל התקופות), `monthShared` + `monthCount` (החודש הנבחר בלבד).

> 📌 שני הסיכונים שתועדו ב-06/2025 — היעדר tombstones ו-id חלש — **נסגרו**. ר' `DATA_MODEL_MAP.md` §2.

---

## 5. חוב לאבא — שורות 5624–5636

```js
getFatherNetAmount(row) = row.direction === "increase" ? −amount : +amount
```
`repayment` מקטין את היתרה · `increase` (הלוואה נוספת) מגדיל.

**איחוד מקורות** — `getCombinedFatherRepayments()`: היסטוריה ידנית + שורות הוצאה מכל הגיליונות, עם dedup לפי `normalizeRepaymentKey(date_raw, amount)`.

### 🔴 C-4 — dedup לפי תאריך+סכום בלבד

המפתח אינו כולל מזהה ייחודי. **שני החזרים אמיתיים באותו יום ובאותו סכום ייחשבו לאותו החזר**, ואחד מהם ייעלם מהחישוב.

**מתי זה קורה:** שני תשלומים של 500 ₪ באותו יום — תרחיש סביר.
**כיוון התיקון:** להוסיף מזהה שורה למפתח, לא רק תאריך+סכום.

---

## 6. סיכום — מה דורש אימות מספרי

| # | חשד | חומרה | איך מאמתים |
|---|---|---|---|
| C-1 | שירה ללא יתרת פתיחה → אין יתרה ואין תחזית | 🔴 גבוהה | להיכנס כשירה, לבדוק דשבורד |
| C-3 | ספירה כפולה בתחזית | 🔴 גבוהה | חודש עם הוצאות עתידיות — להשוות `closing` ל-`projected` |
| C-4 | dedup מוחק החזר כפול לגיטימי | 🔴 בינונית-גבוהה | שני החזרים זהים באותו יום |
| C-2 | ריבית לא נגרעת מהמאזן | 🟡 בינונית | להשוות תשלום בנק בפועל ל-`principal` |

**לפני תיקון של אחד מאלה:** `domain-risk-reviewer` + דוגמת before/after עם מספרים, לפי `CLAUDE.md`. אלה חישובי כסף אמיתי — לא לתקן על סמך המסמך הזה בלבד.
