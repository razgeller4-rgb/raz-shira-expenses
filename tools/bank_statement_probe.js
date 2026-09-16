#!/usr/bin/env node
/* Runs the app's OWN bank-statement parser + billing-day discovery against a
 * real bank export and real expense data, and asserts on the result.
 *
 * Usage:
 *   node tools/bank_statement_probe.js <app.html> <statement.xls> <backup.json> [user]
 *
 * The decisive assertion: for Raz's "חבר" card mapped to "הרשאה ישראכרט (י)",
 * discovery must independently find that the billing day was 2 and later 10 -
 * which he confirmed directly after it was measured. If this ever stops
 * holding, the discovery logic has regressed.
 *
 * READ-ONLY on disk. Writes only to the in-memory localStorage stub.
 *
 * SECURITY NOTE - same pattern as tools/balance_harness.js: `new Function()` on
 * interpolated source is the mechanism, not an accident. It runs the app's OWN
 * <script> so what is verified is what ships. Interpolated content is (a) the
 * app HTML at a developer-supplied path and (b) a hardcoded identifier list in
 * this file - no user- or network-supplied input. Developer-only harness: never
 * loaded by the browser, never bundled into expense-app-v37.html.
 *
 * PRIVACY: the statement holds a real account number and balances. This tool
 * reads it from wherever the developer points it and never copies it into the
 * repo. Do not move such a file into the project directory - the repo is public.
 */

const fs = require("fs");

const [, , appPath, statementPath, backupPath, userArg] = process.argv;
if (!appPath || !statementPath) {
  console.error("usage: node tools/bank_statement_probe.js <app.html> <statement.xls> <backup.json> [user]");
  process.exit(2);
}
const user = userArg || "raz";
const suffix = user === "raz" ? "" : `_${user}`;

const html = fs.readFileSync(appPath, "utf8");
const statementText = fs.readFileSync(statementPath, "utf8");

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => void store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
const noop = () => {};
const mk = () => new Proxy(function () {}, {
  get(_t, p) {
    if (p === "style") return new Proxy({}, { get: () => "", set: () => true });
    if (p === "classList") return { add: noop, remove: noop, toggle: noop, contains: () => false };
    if (p === "dataset") return {};
    if (p === "children" || p === "childNodes") return [];
    if (p === "value" || p === "textContent" || p === "innerHTML") return "";
    if (p === "length") return 0;
    if (p === Symbol.iterator) return function* () {};
    if (p === "then") return undefined;
    return mk();
  },
  set: () => true, apply: () => mk(),
});
const document = new Proxy({}, {
  get(_t, p) {
    if (p === "querySelectorAll" || p === "getElementsByClassName" || p === "getElementsByTagName") return () => [];
    if (p === "documentElement" || p === "body" || p === "head") return mk();
    if (p === "readyState") return "complete";
    if (p === "addEventListener" || p === "removeEventListener") return noop;
    if (p === "createElement" || p === "createElementNS") return () => mk();
    if (p === "getElementById" || p === "querySelector") return () => mk();
    return mk();
  },
});
const w = {
  addEventListener: noop, removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
  requestAnimationFrame: noop, cancelAnimationFrame: noop,
  setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  location: { href: "", protocol: "https:", search: "", hash: "" },
  navigator: { onLine: true, userAgent: "node", clipboard: { writeText: async () => {} } },
  localStorage, getComputedStyle: () => ({ getPropertyValue: () => "" }), devicePixelRatio: 1,
};
class C { constructor(){ this.data = { datasets: [] }; this.options = {}; } update(){} destroy(){} resize(){} static register(){} }
const X = { utils: { book_new: () => ({}), json_to_sheet: () => ({}), book_append_sheet: noop, sheet_to_json: () => [] }, writeFile: noop, read: () => ({ SheetNames: [], Sheets: {} }) };
process.on("unhandledRejection", () => {});

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");

const EXPORTS = [
  "parseBankStatementHtml", "verifyBankStatementBalance", "getBankCardLabelCandidates",
  "getOurCycleTotalForCard", "inferBillingDayForMonth", "discoverBillingDayHistory",
  "getPaymentMethods", "normalizeBillingDayHistory", "getBillingDayForDate",
];

// Seed real data BEFORE eval: currentUser is read at eval time and every key is
// namespaced + user-suffixed.
if (backupPath) {
  const data = JSON.parse(fs.readFileSync(backupPath, "utf8")).data || {};
  const raw = (k) => {
    const v = data[k];
    return v == null ? null : (typeof v === "string" ? v : JSON.stringify(v));
  };
  localStorage.setItem("demo__expense_app_active_user_v1", user);
  for (const base of ["expense_app_overrides_v29", "expense_app_payment_methods_v1",
                      "expense_app_manual_settings_v35", "expense_app_income_entries_v1"]) {
    const v = raw(base + suffix);
    if (v != null) localStorage.setItem(`demo__${base}${suffix}`, v);
  }
}

let api;
try {
  // eslint-disable-next-line no-new-func
  api = new Function(
    "localStorage", "document", "window", "navigator", "location",
    "matchMedia", "requestAnimationFrame", "getComputedStyle", "alert", "confirm", "prompt", "fetch", "Chart", "XLSX",
    `${main}\n;return { ${EXPORTS.map((n) => `${n}: typeof ${n} === "function" ? ${n} : undefined`).join(", ")} };`
  )(
    localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
    noop, () => true, () => null, async () => ({ ok: false, status: 0, json: async () => ({}) }), C, X
  );
} catch (e) {
  console.error("probe: app script failed to load —", e.message);
  process.exit(1);
}

let failed = 0;
const check = (label, cond, detail) => {
  if (cond) console.log(`PASS  ${label}`);
  else { failed++; console.log(`FAIL  ${label}${detail ? `\n      ${detail}` : ""}`); }
};

for (const n of EXPORTS) check(`${n} is defined`, typeof api[n] === "function");
if (failed) { console.log(`\n${failed} missing — stopping.`); process.exit(1); }

// ── 1. Parsing
const parsed = api.parseBankStatementHtml(statementText);
check("parse: transactions extracted", parsed.transactions.length > 100, `got ${parsed.transactions.length}`);
check("parse: header balance read", typeof parsed.headerBalance === "number" && parsed.headerBalance !== 0);
check("parse: transactions sorted ascending",
  parsed.transactions.every((t, i) => i === 0 || parsed.transactions[i - 1].dateIso <= t.dateIso));
check("parse: every row has a valid ISO date",
  parsed.transactions.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.dateIso)));
check("parse: debit and credit are numbers",
  parsed.transactions.every((t) => Number.isFinite(t.debit) && Number.isFinite(t.credit)));

// ── 2. Running-balance integrity (the property that lets this feed the anchor)
const verdict = api.verifyBankStatementBalance(parsed);
check(`balance: running column self-consistent (${verdict.checked} transitions, ${verdict.mismatches} mismatches)`,
  verdict.consistent, JSON.stringify(verdict));
check("balance: last row matches the header balance", verdict.headerMatchesLast === true,
  `last=${verdict.lastBalance} header=${parsed.headerBalance}`);

// ── 3. Label candidates
const labels = api.getBankCardLabelCandidates(parsed);
check("labels: card-like labels found", labels.length >= 2, JSON.stringify(labels.map((l) => l.label)));
console.log("      " + labels.slice(0, 6).map((l) => `${l.label} ×${l.count}`).join(" | "));

// ── 4. THE DECISIVE TEST — rediscover the "חבר" billing-day change
if (backupPath && user === "raz") {
  const cards = api.getPaymentMethods().map((m) => m.name);
  check("cards: real payment methods loaded", cards.includes("חבר"), JSON.stringify(cards));

  const result = api.discoverBillingDayHistory("חבר", "הרשאה ישראכרט (י)", parsed);
  console.log("");
  console.log("      חודש     יום  ביטחון   בנק        שלנו       פער");
  for (const m of result.months) {
    const tag = `${m.year}-${String(m.month).padStart(2, "0")}`;
    console.log(`      ${tag}  ${String(m.day ?? "—").padStart(3)}  ${String(m.confidence).padEnd(8)} ` +
      `${String(m.bankAmount != null ? m.bankAmount.toFixed(0) : "—").padStart(8)}  ` +
      `${String(m.ourAmount != null ? m.ourAmount.toFixed(0) : "—").padStart(8)}  ` +
      `${String(m.gap != null ? m.gap.toFixed(0) : "—").padStart(8)}`);
  }
  console.log("");
  console.log("      תקופות שזוהו: " + JSON.stringify(result.periods.map((p) => `${p.fromIso}→${p.day}`)));
  console.log("");

  const days = result.periods.map((p) => p.day);
  check("discovery: at least one confident period found", result.periods.length >= 1,
    `confident months: ${result.confidentMonths}/${result.totalMonths}`);
  check("discovery: finds day 2 (the real historical value Raz confirmed)", days.includes(2),
    `found days: ${JSON.stringify(days)}`);
  check("discovery: finds day 10 (the value after Raz changed it)", days.includes(10),
    `found days: ${JSON.stringify(days)}`);
  const i2 = days.indexOf(2), i10 = days.lastIndexOf(10);
  check("discovery: day 2 precedes day 10 chronologically", i2 >= 0 && i10 >= 0 && i2 < i10,
    `order: ${JSON.stringify(days)}`);

  // Exact-match months are the strongest evidence; require several.
  const exact = result.months.filter((m) => m.confidence === "exact");
  check(`discovery: ≥4 months match to within 1% (got ${exact.length})`, exact.length >= 4,
    JSON.stringify(exact.map((m) => `${m.year}-${m.month}:d${m.day} Δ${m.gap.toFixed(0)}`)));

  // The discovered history must actually drive routing once applied.
  const applied = api.normalizeBillingDayHistory(result.periods, 10);
  const method = { name: "חבר", cycleDay: 10, billingDayHistory: applied };
  check("discovery: applied history yields day 2 for a date inside the day-2 era",
    api.getBillingDayForDate(method, "2026-05-15") === 2,
    `got ${api.getBillingDayForDate(method, "2026-05-15")} | periods ${JSON.stringify(applied)}`);
  check("discovery: applied history yields day 10 for a recent date",
    api.getBillingDayForDate(method, "2026-09-15") === 10,
    `got ${api.getBillingDayForDate(method, "2026-09-15")}`);
} else {
  console.log("\nNOTE  discovery assertions skipped (need a backup and user=raz).");
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
