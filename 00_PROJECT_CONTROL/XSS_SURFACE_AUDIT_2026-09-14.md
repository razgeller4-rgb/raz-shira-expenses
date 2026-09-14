# XSS Surface Audit — expense-app-v37-demo.html

**תאריך:** 2026-09-14
**קובץ:** `expense-app-v37-demo.html` (9,965 שורות)
**סוקר:** security-privacy-reviewer
**סטטוס:** סקירה בלבד — לא בוצע שינוי בקוד האפליקציה
**סוגר:** CARRY-02 ב-`FEATURE_MASTER_BACKLOG.md` (מיון הקשר-הקשר של 66 מופעי `.innerHTML =`)

---

## תקציר

| מדד | מספר |
|-----|------|
| מופעי `.innerHTML =` | 66 |
| מופעים עם ערך ניתן-לשליטה **ולא** מוגן | **20** |
| מופעים בסיכון נמוך / לא ודאי | 7 |
| מופעים בטוחים (טקסט קבוע / מספרים / `escapeHtmlAttr`) | 39 |
| מופעי `escapeHtmlAttr` | 32 |

**מסקנה:** `escapeHtmlAttr` קיים ומופעל נכון ברוב מסכי העריכה, אבל **מסכי התצוגה** (פיד, רשימת מובייל, סליקות, היסטוריית אבא) ו**כל בוני ה-`<option>`** מרנדרים את אותם שדות בדיוק בלי escape. הבאג אינו "אין escaping" — הוא **חוסר עקביות בין מצב עריכה למצב תצוגה** על אותה רשומה.

מקורות התוכן הבעייתיים מצטמצמים ל-6 שדות בלבד: `merchant`, `notes`, `category` / `c.name`, `payment` / `method.name`, `source`, `date_raw`.

---

## מודל האיום (הקשר)

האפליקציה משפחתית, שני משתמשים (רז ושירה), אין דיירים זרים. אבל שני דברים מעלים את הסיכון מעל "self-XSS":

1. **הנתונים מסונכרנים בין שני המשתמשים** דרך Supabase — מחרוזת שאחד מקליד מתרנדרת בדפדפן של השני (Stored XSS, לא Reflected).
2. **`merchant` מגיע מקובץ אשראי מיובא** — טקסט שמקורו בחברת האשראי/בית העסק, לא במשפחה. `parseStatement` שומר אותו עם `.replace(/\s+/g," ")` בלבד (שורה 9592) ומתחייב כפי שהוא (9891). זהו וקטור שאינו בשליטת הבית.

**השפעה אם מנוצל:** `access_token` + `refresh_token` של Supabase נשמרים ב-`localStorage` (מפתח `expense_app_supabase_session_v1`, שורות 3105–3120) — כלומר קוד שרץ ב-origin יכול לגנוב session ולקרוא/לכתוב את כל הנתונים הפיננסיים של שני המשתמשים בענן.

---

## חולשה בפונקציית ה-escape עצמה

```js
function escapeHtmlAttr(value){        // שורה 9149
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
```

**`'` (גרש בודד) אינו מוברח.** בשני מקומות הפלט נכנס לתוך מחרוזת JS עטופה בגרשים בודדים:

- שורה 6635 — `onchange="updateCategoryBudgetForSheet('${escapeHtmlAttr(c.name)}', ...)"`
- שורה 6640 — `onchange="toggleMonthlyCategoryActive('${escapeHtmlAttr(c.name)}', ...)"`

שם קטגוריה שמכיל `'` שובר את מחרוזת ה-JS → הזרקת JS בתוך ה-handler. שם הקטגוריה נשמר ללא סינון (`updateCategoryRow`, שורה ~5947: `String(value||"").trim()`).

---

## טבלת ממצאים — 20 מופעים לא-מוגנים

| שורה | רנדרר | מקור התוכן | הקשר | מוגן | סיכון |
|------|-------|------------|------|------|-------|
| **7946** | `renderTable` — פיד הוצאות | `merchant` (7977), `category` (7971), `payment` (7978), `type`, `date_raw` | טקסט HTML | ❌ | **גבוה** |
| **8875** | `renderMobileExpenseList` | `merchant` (8891), `category` (8892/8903), `date_raw` (8887/8904), `payment` (8901), `notes` (8905) | טקסט HTML | ❌ | **גבוה** |
| 8014 | `renderTable` — chips קטגוריה | `opt` בתוך `onclick="...('${opt.replace(/'/g,"\\'")}')"` | JS ב-attribute | ❌ (`"` לא מוברח → שבירת attribute) | גבוה |
| 6989 | `renderNewCategoryChips` | אותו דפוס בדיוק | JS ב-attribute + טקסט | ❌ | גבוה |
| 5914 | `renderFilterOptions` — chips סינון | `c` = שם קטגוריה | `data-category="…"` + טקסט | ❌ | בינוני |
| 5908 | `renderFilterOptions` — select אשראי | `opt.value` / `opt.label` = שם כרטיס | `value="…"` + טקסט | ❌ | בינוני |
| 6977 | `renderNewCategoryOptions` | שם קטגוריה | `value="…"` + טקסט | ❌ | בינוני |
| 7006 | `renderPaymentSelectOptions` | שם כרטיס | `value="…"` + טקסט | ❌ | בינוני |
| 8030 | select אשראי בתוך הפיד | `opt.value` / `opt.label` | `value="…"` + טקסט | ❌ | בינוני |
| 8967/8969 (ב-8970) | `openMxpEdit` modal | `c.name` / `m.name` | `value="…"` + טקסט | ❌ | בינוני |
| 9685 | `ccImportPayment` select | `o.value` / `o.label` = שם כרטיס | `value="…"` + טקסט | ❌ | בינוני |
| 9241 (ב-9828) | `buildCCImportOptionMarkup` | `label` (ה-`value` כן מוברח) | טקסט | ❌ חלקית | בינוני |
| 6108 | `renderExcelKpis` | `item.label` = שם קטגוריה/כרטיס; `item.sub` = `biggestExpense.merchant` (5626) | טקסט | ❌ | בינוני |
| 6131 (ב-6108) | `buildBentoPinnedTiles` — גן הקטגוריות | `c.name` | `title="…"` + טקסט | ❌ | בינוני |
| 6651 | `renderSummary` — כרטיסי תקציב | `c.name` (6667) | טקסט | ❌ | בינוני |
| 6635 / 6640 (ב-6651) | אותו רנדרר, מצב עריכה | `c.name` | מחרוזת JS בגרש בודד | ⚠️ `escapeHtmlAttr` אך `'` לא מוברח | בינוני |
| 6852 | גרף bullet תקציב | `item.label` = שם קטגוריה | `title="…"` + טקסט | ❌ | בינוני |
| 5778 | `renderDashboardPrefsPanel` | `item.label` = שם קטגוריה/כרטיס | טקסט | ❌ | בינוני |
| 7187 (ב-7100) | `renderPaymentMethods` — מצב תצוגה | `method.name` | טקסט | ❌ (ב-7137/7146 כן מוברח) | בינוני |
| 8196/8197 (ב-8218) | שורות סליקה | `s.notes`, `s.date_raw` | טקסט | ❌ | בינוני |
| 8247/8248 (ב-8221) | כרטיס הוצאה משותפת | `entry.payment`, `entry.notes` | טקסט | ❌ (merchant/date כן מוברחים ב-8230/8231) | בינוני |
| 8504/8505 (ב-8449) | היסטוריית חוב לאבא | `row.date_raw`, `row.payment` | טקסט | ❌ | נמוך-בינוני |
| 9713 | `ccImportDetected` | `result.cardName`, `result.last4`, `result.chargeDate` מתוך קובץ מיובא | טקסט | ❌ | בינוני |
| 7397 (ב-7353) | רשימת הכנסות | `row.date_raw` (`source` כן מוברח) | טקסט | ❌ | נמוך |

---

## מופעים בסיכון נמוך / לא ודאי (7)

| שורה | תוכן | הערכה |
|------|------|-------|
| 2629, 2639, 2645 | `message` / `source` / `error.stack` מ-`window.onerror` | טקסט מהדפדפן; הזרקה רק דרך `throw new Error(userString)` — לא אותר מסלול כזה |
| 2850, 2859 | פרמטר `message` ל-debug box + `.replace(/\n/g,"<br>")` | נקראת רק עם מחרוזות מפתח |
| 4069 | `meta.reason` מתוך payload נקודת שחזור בענן | נכתב ע"י האפליקציה עצמה (קבועי מפתח); ניתן לשיבוש רק ע"י מי שכבר כותב ל-DB |
| 5899 | `SHEET_OPTIONS` | שמות גיליונות נוצרים ע"י `formatSheetFromMonth`, לא הוקלדו |

---

## מופעים בטוחים (39)

טקסט קבוע, מספרים דרך `fmt()`, תוויות מ-catalog קבוע במקור, או `escapeHtmlAttr` מלא:

2626, 2700, 2867, 3305, 3816, 3819, 4034, 5797, 5822, 5869, 6226, 6298, 6312, 6491, 6543, 6611, 6735, 7096, 7287, 7297, 7340, 7756, 7771, 7920, 7926, 8066, 8096, 8379, 8428, 8443, 8444, 8555, 8578, 8593, 8594, 8610, 8870, 9209, 9704

הערות:
- 8578 / 5802 / 5810 — `item.label` שם, אבל `getYearlyWidgetCatalog` (5701–5717) ו-`getYearlyColumnCatalog` (5724–5729) מחזירים אך ורק קבועי מפתח. בטוח **כל עוד** לא יוסיפו שם ווידג'ט נגזר-קטגוריה — בניגוד ל-`getDashboardWidgetCatalog` (5589–5602) שכן עושה זאת, ולכן 6108/5778 כן דגולים.
- 8066 `feedEl.innerHTML = feedEl.innerHTML` — re-parse מלא. לא ממצא אבטחה, אבל מנתק כל listener שנוסף ב-JS (כאן ה-handlers inline, ולכן אין תקלה בפועל).

---

## המלצת תיקון — ממוקדת, לא סוחפת

**לא** לעטוף 66 מופעים. שלושה שינויים סגורים מכסים את כל ה-20:

### תיקון 1 — משורה אחת: להשלים את `escapeHtmlAttr`
```js
.replace(/'/g, "&#39;")
```
סוגר את 6635 ו-6640, ואינו שובר אף אחד מ-32 השימושים הקיימים (ישות `&#39;` מתפענחת חזרה ל-`'` בכל הקשר טקסט/attribute).

### תיקון 2 — בונה `<option>` אחד במקום שבעה
`buildCCImportOptionMarkup` (9235) כבר קיים, כבר מבריח את ה-`value`, ורק ה-`label` חסר. להוסיף `escapeHtmlAttr` ל-`label` ולנתב אליו את ששת הבונים הכפולים: 5908, 6977, 7006, 8030, 8967/8969, 9685. פונקציה אחת + שישה call-sites.

### תיקון 3 — ארבעת רנדררי התצוגה
`renderTable` (7946), `renderMobileExpenseList` (8875), סליקות (8218/8221), היסטוריית אבא (8449) — להבריח `merchant` / `category` / `payment` / `notes` / `date_raw`. זה המסלול היחיד שמקבל טקסט **חיצוני למשפחה** (`merchant` מקובץ אשראי), ולכן העדיפות הראשונה.

### תיקון 4 (אופציונלי, מבני) — chips
6989 ו-8014 בונים `onclick="fn('…')"` עם `.replace(/'/g,"\\'")` שלא מטפל ב-`"`. הדפוס הנכון כבר קיים בקובץ: `renderFilterOptions` (5914–5920) משתמש ב-`data-category` + delegated listener. להעביר את שני ה-chips לאותו דפוס במקום להוסיף עוד escaping.

---

## אימות מוצע לפני סגירת CARRY-02

1. ליצור קטגוריה בשם `<img src=x onerror=alert(1)>` בדמו → לוודא שהיא מוצגת כטקסט בכל: filter chips, כרטיסי תקציב, גרף bullet, dashboard prefs, גן קטגוריות, select הוספת הוצאה.
2. ליצור קטגוריה בשם `it's ok` → לוודא ש-`onchange` של התקציב עדיין עובד (רגרסיה של תיקון 1).
3. להקליד `merchant` בשם `<svg onload=alert(1)>` → לוודא טקסט בפיד, ברשימת המובייל, בכרטיס ההוצאה המשותפת.
4. `notes` בשם `"><script>alert(1)</script>` → לוודא שדה הערות בפיד ובמודל המובייל.
5. שם כרטיס אשראי `a" onmouseover="alert(1)` → לוודא כל ששת ה-selects.

**מה כן נבדק בנוסף:** `document.write` / `eval(` / `insertAdjacentHTML` — **0 מופעים** בקובץ. `.innerHTML +=` — מופע אחד (2633, `error.stack` בתיבת ה-debug, אותה קטגוריית סיכון נמוך כמו 2629).

**מה לא נבדק:** לא הורץ exploit חי בדפדפן — הממצאים מבוססים על קריאת קוד וניתוח הקשר-פלט בלבד. לא נבדקו מדיניות ה-RLS בפועל ב-Supabase. **אין CSP בקובץ** (0 מופעים של `Content-Security-Policy`); CSP עם `script-src` ללא `unsafe-inline` היה חוסם את כל הווקטורים הללו, אך דורש הסרת כל ה-inline handlers — שינוי גדול מדי לשלב הזה, ולכן לא מומלץ כרגע.
