#!/usr/bin/env node
/* Second half of the calendar-model simulation (Raz, 2026-09-16).
 *
 * The first script (calendar_model_sim.js) measured how rows would REGROUP.
 * This one measures the thing that actually matters: what happens to the
 * BALANCE, and whether the two numbers Raz asked for can be produced.
 *
 *   "עו״ש עכשיו"            = opening + income - money that already left
 *   "עו״ש אחרי חיובי אשראי" = the above, minus card bills still due this month
 *
 * Current model:  closing = opening + income - ALL expenses in the sheet - loan
 *                 (subtracts a card purchase in the month it was BOUGHT)
 * Proposed model: closing = opening + income - cash that actually LEFT - loan
 *                 (subtracts a card purchase in the month it is BILLED)
 *
 * Usage: node tools/calendar_balance_sim.js <backup.json>
 *
 * READ-ONLY. Never writes to disk, never mutates the backup.
 */

const fs = require("fs");

const [, , backupPath] = process.argv;
if (!backupPath) {
  console.error("usage: node tools/calendar_balance_sim.js <backup.json>");
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(backupPath, "utf8")).data || {};
const val = (k, f) => {
  const raw = data[k];
  if (raw == null) return f;
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch (e) { return f; } }
  return raw;
};

const HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
function parseSheet(s) {
  const m = String(s).trim().match(/^(\S+)\s+(\d{2,4})$/);
  if (!m) return null;
  const i = HE_MONTHS.indexOf(m[1]);
  if (i < 0) return null;
  let y = Number(m[2]); if (y < 100) y += 2000;
  return { year: y, month: i + 1 };
}
const fmt = (y, mo) => `${y}-${String(mo).padStart(2, "0")}`;
function shift(y, mo, by) { const t = y * 12 + (mo - 1) + by; return { year: Math.floor(t / 12), month: (t % 12) + 1 }; }
function isoOf(row) {
  const raw = String(row.date_raw || row.date || "").trim();
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };
  m = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return { year: y, month: +m[2], day: +m[1] }; }
  return null;
}

const users = [
  { id: "raz", suffix: "" },
  { id: "shira", suffix: "_shira" },
].map((u) => ({
  ...u,
  overrides: val("expense_app_overrides_v29" + u.suffix, {}),
  methods: val("expense_app_payment_methods_v1" + u.suffix, []),
  manual: val("expense_app_manual_settings_v35" + u.suffix, {}),
  income: val("expense_app_income_entries_v1" + u.suffix, {}),
}));

const out = [];
const log = (s = "") => out.push(s);

log("═".repeat(96));
log("סימולציה ב׳ — השפעה על היתרה, ועל שני המספרים שביקשת");
log("═".repeat(96));

for (const user of users) {
  const byName = new Map(user.methods.map((m) => [m.name, m]));
  log("");
  log("─".repeat(96));
  log(`משתמש: ${user.id}`);
  log("─".repeat(96));

  // Bucket every row two ways.
  const spentIn = new Map();   // calendar month of purchase (the report bucket)
  const leftIn = new Map();    // calendar month the cash leaves (the balance bucket)
  const cardBillIn = new Map();// only the CARD portion of leftIn, per month

  for (const sheet of Object.keys(user.overrides)) {
    for (const row of user.overrides[sheet] || []) {
      if (!row || row.deleted) continue;
      const amt = Number(row.amount || 0);
      if (!amt) continue;
      const iso = isoOf(row);
      if (!iso) continue;
      const method = row.payment ? byName.get(row.payment) : null;
      const isCard = Boolean(method && !method.isImmediate);

      const pm = fmt(iso.year, iso.month);
      spentIn.set(pm, (spentIn.get(pm) || 0) + amt);

      let cm = pm;
      if (isCard) {
        const billingDay = Number(method.cycleDay) || 10;
        if (iso.day >= billingDay) { const s = shift(iso.year, iso.month, 1); cm = fmt(s.year, s.month); }
      }
      leftIn.set(cm, (leftIn.get(cm) || 0) + amt);
      if (isCard) cardBillIn.set(cm, (cardBillIn.get(cm) || 0) + amt);
    }
  }

  // Walk the months in order, carrying the balance forward under both models.
  const months = [...new Set([...spentIn.keys(), ...leftIn.keys()])].sort();
  const sheetNameFor = (mo) => {
    const [y, m] = mo.split("-").map(Number);
    const full = `${HE_MONTHS[m - 1]} ${y}`;
    const short = `${HE_MONTHS[m - 1]} ${String(y).slice(2)}`;
    return user.manual[short] !== undefined ? short : (user.manual[full] !== undefined ? full : short);
  };
  const incomeFor = (mo) => {
    const key = sheetNameFor(mo);
    const rows = user.income[key];
    if (Array.isArray(rows)) return rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const ms = user.manual[key];
    return ms && ms.salary != null ? Number(ms.salary) : 0;
  };

  log("");
  log("   חודש     הכנסה   הוצאה-שנקנתה   מזומן-שיצא   מתוכו-אשראי   הפרש(יצא−נקנה)");
  let cumCurrent = 0, cumProposed = 0;
  for (const mo of months) {
    const inc = incomeFor(mo);
    const spent = Math.round(spentIn.get(mo) || 0);
    const left = Math.round(leftIn.get(mo) || 0);
    const card = Math.round(cardBillIn.get(mo) || 0);
    cumCurrent += inc - spent;
    cumProposed += inc - left;
    const diff = left - spent;
    const flag = Math.abs(diff) > 3000 ? "  ←" : "";
    log(`   ${mo}  ${String(Math.round(inc)).padStart(7)}  ${String(spent).padStart(13)}  ${String(left).padStart(11)}  ${String(card).padStart(12)}  ${String(diff).padStart(14)}${flag}`);
  }

  log("");
  log(`   מאזן מצטבר לפי המודל הנוכחי (מחסיר בחודש הקנייה):  ₪${Math.round(cumCurrent).toLocaleString()}`);
  log(`   מאזן מצטבר לפי המודל המוצע  (מחסיר בחודש החיוב):  ₪${Math.round(cumProposed).toLocaleString()}`);
  log(`   הפרש מצטבר: ₪${Math.round(cumProposed - cumCurrent).toLocaleString()}`);
  log("   ← ההפרש המצטבר קטן כי זו בעיקר הזזה בזמן, לא כסף שנעלם.");
  log("     המשמעות היא בתמונה החודשית, לא בסכום הכולל לאורך שנה.");

  // The two numbers Raz asked for, for the most recent complete month.
  const last = months[months.length - 1];
  if (last) {
    const inc = incomeFor(last);
    const leftAlready = Math.round((leftIn.get(last) || 0) - (cardBillIn.get(last) || 0));
    const cardDue = Math.round(cardBillIn.get(last) || 0);
    log("");
    log(`   דוגמה לשני המספרים שביקשת, לחודש ${last}:`);
    log(`      הכנסה החודש:                      ₪${Math.round(inc).toLocaleString()}`);
    log(`      כבר ירד מהעו״ש (מיידי + העברות):   ₪${leftAlready.toLocaleString()}`);
    log(`      עוד צפוי לרדת בחיובי אשראי:        ₪${cardDue.toLocaleString()}`);
    log(`      ← "עו״ש עכשיו" מול "אחרי אשראי" נבדלים ב-₪${cardDue.toLocaleString()}`);
  }
}

log("");
log("═".repeat(96));
console.log(out.join("\n"));
