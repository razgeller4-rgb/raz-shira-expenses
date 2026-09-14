#!/usr/bin/env node
/* Measures how much of the real income data actually carries a date.
 *
 * Why this exists: BALANCE_ANCHOR_SPEC §2.4 declares mid-month anchoring
 * impossible because "income rows are not reliably dated". That claim is the
 * single blocker on the model Raz asked for (anchor as-of a real date, checked
 * against the app's state on that date). Before building around the blocker or
 * removing it, measure it — the claim was written from reading one function
 * (inferIncomeRows), not from counting the data.
 *
 * usage: node tools/income_date_audit.js [backup.json]
 */
const fs = require("fs");
const path = require("path");

const file =
  process.argv[2] ||
  path.join(
    "backups",
    fs
      .readdirSync("backups")
      .filter((n) => /^raz-expenses-backup-.*\.json$/.test(n))
      .sort()
      .pop()
  );

const backup = JSON.parse(fs.readFileSync(file, "utf8"));
const data = backup.data || {};
console.log(`backup: ${file}`);
console.log(`exportedAt: ${backup.exportedAt}\n`);

const incomeKeys = Object.keys(data).filter((k) => /income/i.test(k));
if (!incomeKeys.length) console.log("(no income keys found)");

for (const key of incomeKeys) {
  const map = data[key];
  if (!map || typeof map !== "object") {
    console.log(`${key}: not a map (${typeof map})`);
    continue;
  }
  let rows = 0, dated = 0, withRecurringDay = 0, recurring = 0;
  const perSheet = [];
  const byType = {};
  for (const [sheet, list] of Object.entries(map)) {
    if (!Array.isArray(list)) continue;
    let sDated = 0;
    for (const r of list) {
      rows++;
      byType[r.type || "(none)"] = (byType[r.type || "(none)"] || 0) + 1;
      if (String(r.date_raw || "").trim()) { dated++; sDated++; }
      if (r.recurringDay != null) withRecurringDay++;
      if (r.recurring) recurring++;
    }
    if (list.length) perSheet.push(`${sheet}: ${sDated}/${list.length}`);
  }
  console.log(`── ${key}`);
  console.log(`   rows ................. ${rows}`);
  console.log(`   with date_raw ........ ${dated}  (${rows ? Math.round((dated / rows) * 100) : 0}%)`);
  console.log(`   with recurringDay .... ${withRecurringDay}`);
  console.log(`   flagged recurring .... ${recurring}`);
  console.log(`   by type .............. ${JSON.stringify(byType)}`);
  console.log(`   per sheet (dated/total): ${perSheet.join(" | ") || "(none)"}`);
  const sample = Object.entries(map).find(([, l]) => Array.isArray(l) && l.length);
  if (sample) console.log(`   sample [${sample[0]}]: ${JSON.stringify(sample[1].slice(0, 3))}`);
  console.log("");
}

// Expenses are the control group: if they are well dated, a mid-month
// expectation is computable for everything except income, which narrows the
// blocker from "impossible" to "one field on one row type".
const expenseKeys = Object.keys(data).filter((k) => /expense|sheet/i.test(k) && !/summar/i.test(k));
for (const key of expenseKeys) {
  const map = data[key];
  if (!map || typeof map !== "object") continue;
  let rows = 0, dated = 0;
  for (const list of Object.values(map)) {
    if (!Array.isArray(list)) continue;
    for (const r of list) {
      if (!r || typeof r !== "object" || !("amount" in r)) continue;
      rows++;
      if (String(r.date_raw || r.date || "").trim()) dated++;
    }
  }
  if (rows) {
    console.log(`── ${key} (control)`);
    console.log(`   rows ${rows}, dated ${dated} (${Math.round((dated / rows) * 100)}%)\n`);
  }
}
