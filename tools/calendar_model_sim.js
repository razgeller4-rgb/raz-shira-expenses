#!/usr/bin/env node
/* Simulation for the "unified calendar month + bank-statement cross-check"
 * direction (Raz, 2026-09-16). Measures, on REAL data, what changes if the app
 * stops using one sheet per row for both meanings and instead tracks two
 * separate calendar attributions:
 *
 *   purchaseMonth - calendar month of the transaction date. Answers
 *                   "what did we spend in August" (reports, stats, categories).
 *   chargeMonth   - calendar month the money actually leaves the bank.
 *                   Answers "what is the balance" (cash flow, forecast).
 *
 * Today these are collapsed into one value (the sheet the row physically sits
 * in), which is why a credit-card row can never be right for both questions at
 * once.
 *
 * Usage: node tools/calendar_model_sim.js <backup.json> [app.html]
 *
 * READ-ONLY. Never writes to disk, never touches localStorage, never mutates
 * the backup. Pure analysis of a file the developer passes on the command line.
 */

const fs = require("fs");

const [, , backupPath] = process.argv;
if (!backupPath) {
  console.error("usage: node tools/calendar_model_sim.js <backup.json>");
  process.exit(2);
}

const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
const data = backup.data || {};

const HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function parseSheet(sheet) {
  const m = String(sheet).trim().match(/^(\S+)\s+(\d{2,4})$/);
  if (!m) return null;
  const monthIdx = HE_MONTHS.indexOf(m[1]);
  if (monthIdx < 0) return null;
  let year = Number(m[2]);
  if (year < 100) year += 2000;
  return { year, month: monthIdx + 1 };
}
const fmtMonth = (y, mo) => `${y}-${String(mo).padStart(2, "0")}`;
function shift(y, mo, by) {
  const total = y * 12 + (mo - 1) + by;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}
function rowIsoDate(row) {
  const raw = String(row.date_raw || row.date || "").trim();
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };
  m = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return { year: y, month: +m[2], day: +m[1] };
  }
  return null;
}

// Backup values may be stored either as parsed objects or as JSON strings
// depending on which export path produced the file - handle both.
function val(key, fallback) {
  const raw = data[key];
  if (raw == null) return fallback;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  return raw;
}
function loadUser(suffix) {
  const key = (base) => base + suffix;
  return {
    overrides: val(key("expense_app_overrides_v29"), {}),
    methods: val(key("expense_app_payment_methods_v1"), []),
    manual: val(key("expense_app_manual_settings_v35"), {}),
    income: val(key("expense_app_income_entries_v1"), {}),
  };
}

const USERS = [
  { id: "raz", suffix: "", ...loadUser("") },
  { id: "shira", suffix: "_shira", ...loadUser("_shira") },
];

// ── The rule the app uses TODAY to decide which sheet a row belongs to.
// Mirrors getBillingSheetForExpense: cycleDay is read as CYCLE START, so a
// purchase before cycleDay is pushed BACK a month.
function currentRuleMonth(iso, method) {
  if (!method || method.isImmediate) return fmtMonth(iso.year, iso.month);
  const cycleStart = Number(method.cycleDay);
  if (cycleStart && iso.day < cycleStart) {
    const s = shift(iso.year, iso.month, -1);
    return fmtMonth(s.year, s.month);
  }
  return fmtMonth(iso.year, iso.month);
}

// ── The proposed model: when does the money actually LEAVE the bank?
// A card bills on cycleDay of a month; purchases from the cycle that closed
// before that date are on that bill. Reading cycleDay as the BILLING day
// (which is what Shira's Amex statement literally says, per D-08):
//   purchase day <  billingDay -> billed this month
//   purchase day >= billingDay -> billed next month
function proposedChargeMonth(iso, method) {
  if (!method || method.isImmediate) return fmtMonth(iso.year, iso.month);
  const billingDay = Number(method.cycleDay);
  if (!billingDay) return fmtMonth(iso.year, iso.month);
  if (iso.day < billingDay) return fmtMonth(iso.year, iso.month);
  const s = shift(iso.year, iso.month, 1);
  return fmtMonth(s.year, s.month);
}

let report = [];
const log = (s = "") => report.push(s);

log("═".repeat(78));
log("סימולציה — מודל חודש קלנדרי אחיד + הצלבה מול עו״ש");
log(`מקור: ${backupPath}`);
log("═".repeat(78));

const globalTotals = {
  rows: 0, dated: 0, undated: 0,
  sheetEqPurchase: 0, sheetNePurchase: 0,
  immediate: 0, card: 0, bankOnly: 0,
};

for (const user of USERS) {
  const methodByName = new Map(user.methods.map((m) => [m.name, m]));
  log("");
  log("─".repeat(78));
  log(`משתמש: ${user.id}`);
  log("─".repeat(78));
  log(`אמצעי תשלום (${user.methods.length}):`);
  for (const m of user.methods) {
    log(`   • ${m.name}  cycleDay=${m.cycleDay ?? "—"}  ${m.isImmediate ? "[מיידי]" : "[מחזור]"}`);
  }

  const sheets = Object.keys(user.overrides);
  // month -> {purchase: sum, charge: sum, sheet: sum}
  const byPurchase = new Map();
  const byCharge = new Map();
  const bySheet = new Map();
  const moves = [];

  for (const sheet of sheets) {
    const parsedSheet = parseSheet(sheet);
    const rows = Array.isArray(user.overrides[sheet]) ? user.overrides[sheet] : [];
    for (const row of rows) {
      if (!row || row.deleted) continue;
      const amount = Number(row.amount || 0);
      if (!amount) continue;
      globalTotals.rows++;

      const sheetMonth = parsedSheet ? fmtMonth(parsedSheet.year, parsedSheet.month) : "?";
      bySheet.set(sheetMonth, (bySheet.get(sheetMonth) || 0) + amount);

      const iso = rowIsoDate(row);
      if (!iso) { globalTotals.undated++; continue; }
      globalTotals.dated++;

      const method = row.payment ? methodByName.get(row.payment) : null;
      if (!row.payment) globalTotals.bankOnly++;
      else if (method && method.isImmediate) globalTotals.immediate++;
      else if (method) globalTotals.card++;

      const purchaseMonth = fmtMonth(iso.year, iso.month);
      const chargeMonth = proposedChargeMonth(iso, method);

      byPurchase.set(purchaseMonth, (byPurchase.get(purchaseMonth) || 0) + amount);
      byCharge.set(chargeMonth, (byCharge.get(chargeMonth) || 0) + amount);

      if (sheetMonth === purchaseMonth) globalTotals.sheetEqPurchase++;
      else {
        globalTotals.sheetNePurchase++;
        moves.push({ sheet: sheetMonth, purchase: purchaseMonth, charge: chargeMonth, amount, merchant: row.merchant || "", payment: row.payment || "עו״ש", day: iso.day });
      }
    }
  }

  log("");
  log(`שורות בגיליון שאינו חודש הקנייה הקלנדרי: ${moves.length}`);
  if (moves.length) {
    const sample = moves.slice(0, 12);
    log("   דוגמאות:");
    for (const mv of sample) {
      log(`   ${String(mv.merchant).slice(0, 22).padEnd(22)} ₪${String(Math.round(mv.amount)).padStart(6)}  יום ${String(mv.day).padStart(2)}  ${mv.payment.slice(0, 14).padEnd(14)} גיליון=${mv.sheet} קנייה=${mv.purchase} חיוב=${mv.charge}`);
    }
    if (moves.length > sample.length) log(`   ... ועוד ${moves.length - sample.length}`);
  }

  // Month-by-month comparison of the three groupings.
  const allMonths = [...new Set([...bySheet.keys(), ...byPurchase.keys(), ...byCharge.keys()])]
    .filter((m) => m !== "?").sort();
  log("");
  log("השוואת שלושת הקיבוצים (₪, מעוגל):");
  log("   חודש     גיליון-היום    חודש-קנייה     חודש-חיוב     קנייה−גיליון   חיוב−גיליון");
  for (const mo of allMonths) {
    const s = Math.round(bySheet.get(mo) || 0);
    const p = Math.round(byPurchase.get(mo) || 0);
    const c = Math.round(byCharge.get(mo) || 0);
    if (!s && !p && !c) continue;
    const dp = p - s, dc = c - s;
    const flag = (Math.abs(dp) > 500 || Math.abs(dc) > 500) ? "  ←" : "";
    log(`   ${mo}  ${String(s).padStart(10)}  ${String(p).padStart(12)}  ${String(c).padStart(12)}  ${String(dp).padStart(12)}  ${String(dc).padStart(12)}${flag}`);
  }
}

log("");
log("═".repeat(78));
log("סיכום כללי");
log("═".repeat(78));
log(`סה״כ שורות פעילות:              ${globalTotals.rows}`);
log(`   עם תאריך תקין:               ${globalTotals.dated}`);
log(`   ללא תאריך (לא ניתן לשייך):   ${globalTotals.undated}`);
log(`   העברות/עו״ש (ללא אמצעי):     ${globalTotals.bankOnly}`);
log(`   אמצעי מיידי:                 ${globalTotals.immediate}`);
log(`   כרטיס אשראי במחזור:          ${globalTotals.card}`);
log("");
log(`שורות שכבר יושבות בחודש הקנייה: ${globalTotals.sheetEqPurchase}  (${(100 * globalTotals.sheetEqPurchase / Math.max(1, globalTotals.dated)).toFixed(1)}%)`);
log(`שורות שיושבות בחודש אחר:        ${globalTotals.sheetNePurchase}  (${(100 * globalTotals.sheetNePurchase / Math.max(1, globalTotals.dated)).toFixed(1)}%)`);

console.log(report.join("\n"));
