#!/usr/bin/env node
/* F-20 evidence gathering: which archived statements actually contain more than
 * one card, and how is that expressed in the file?
 *
 * Every Max export carries a per-row "4 ספרות אחרונות של כרטיס האשראי" column,
 * but parseCCStatement's max branch captures last4/cardName ONCE, globally,
 * from whichever row it happened to detect first. If a file mixes two cards,
 * every transaction is therefore attributed to the same card. This script
 * establishes, from real files only, whether that situation occurs.
 *
 * READ-ONLY. Usage: node tools/multicard_scan.js [xlsx-lib-path]
 */
const fs = require("fs");
const path = require("path");
const XLSX = require(process.argv[2] || "/tmp/xlsx.full.min.js");

let multi = 0, single = 0;
for (const f of fs.readdirSync("data").filter(x => /\.xlsx$/i.test(x))) {
  const full = path.join("data", f);
  let wb;
  try { wb = XLSX.read(fs.readFileSync(full), { type: "buffer" }); } catch (e) { continue; }
  const perSheet = [];
  const cards = new Map();
  for (const sn of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: null });
    const hi = rows.findIndex(r => (r||[]).some(c => /תאריך עסקה/.test(String(c||""))));
    if (hi < 0) continue;
    const hdr = rows[hi].map(c => String(c||"").trim());
    const li = hdr.findIndex(x => /4 ספרות/.test(x));
    if (li < 0) continue;
    let n = 0;
    const local = new Set();
    for (let i = hi+1; i < rows.length; i++) {
      const v = String((rows[i]||[])[li] ?? "").trim();
      if (!v) continue;
      n++; local.add(v);
      cards.set(v, (cards.get(v) || 0) + 1);
    }
    if (n) perSheet.push(`${sn}: ${n} txns, cards ${[...local].join("+")}`);
  }
  if (!cards.size) continue;
  if (cards.size > 1) {
    multi++;
    console.log(`\n*** MULTI-CARD  ${f}`);
    for (const [c, n] of cards) console.log(`      card ${c}: ${n} transactions`);
    perSheet.forEach(s => console.log(`      ${s}`));
  } else {
    single++;
  }
}
console.log(`\n${multi} multi-card file(s), ${single} single-card file(s).`);
if (!multi) console.log("No archived file mixes cards - F-20 cannot be reproduced from data/ alone.");
