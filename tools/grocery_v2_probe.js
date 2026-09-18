#!/usr/bin/env node
/* Verifies the grocery-tab v2 additions (price field, per-item icons, stats)
 * against the app's own shipped code. READ-ONLY on disk. Same new-Function
 * harness pattern as the other tools/*.
 */
const fs = require("fs");
const appPath = process.argv[2] || "expense-app-v37-demo.html";
const html = fs.readFileSync(appPath, "utf8");

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
  }, set: () => true, apply: () => mk(),
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
class C { constructor(){ this.data={datasets:[]}; this.options={}; } update(){} destroy(){} resize(){} static register(){} }
const X = { utils:{book_new:()=>({}),json_to_sheet:()=>({}),book_append_sheet:noop,sheet_to_json:()=>[]}, writeFile:noop, read:()=>({SheetNames:[],Sheets:{}}) };
process.on("unhandledRejection", () => {});

localStorage.setItem("demo__expense_app_active_user_v1", "raz");

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
const EXPORTS = ["addGroceryItem", "getGroceryItems", "updateGroceryItemPrice", "getGroceryItemIcon",
                 "getGroceryCategoryIcon", "normalizeGroceryItem", "GROCERY_ITEM_ICONS"];
let api;
try {
  api = new Function(
    "localStorage","document","window","navigator","location","matchMedia",
    "requestAnimationFrame","getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render",
    `${main}\n;return { ${EXPORTS.map(n=>`${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(", ")} };`
  )(
    localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
    noop, () => true, () => null, async () => ({ok:false,status:0,json:async()=>({})}), C, X, noop
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

check("addGroceryItem is defined", typeof api.addGroceryItem === "function");
check("getGroceryItemIcon is defined", typeof api.getGroceryItemIcon === "function");
check("dictionary has real entries", Object.keys(api.GROCERY_ITEM_ICONS || {}).length > 100,
  `count=${Object.keys(api.GROCERY_ITEM_ICONS || {}).length}`);

api.addGroceryItem({ name: "לחם", category: "לחמים ומאפים", status: "catalog", important: true, price: 7.9 });
api.addGroceryItem({ name: "פריט לא מוכר לגמרי", category: "ירקות ופירות", status: "catalog" });
const items = api.getGroceryItems();
const bread = items.find(i => i.name === "לחם");
const unknown = items.find(i => i.name === "פריט לא מוכר לגמרי");

check("price round-trips through normalizeGroceryItem", bread && bread.price === 7.9, JSON.stringify(bread));
check("known item gets its specific icon", api.getGroceryItemIcon(bread) === "🍞");
check("unknown item falls back to category icon, never blank",
  api.getGroceryItemIcon(unknown) === api.getGroceryCategoryIcon("ירקות ופירות") && api.getGroceryItemIcon(unknown) !== "");

api.updateGroceryItemPrice(bread.id, "12.5");
const updated = api.getGroceryItems().find(i => i.id === bread.id);
check("updateGroceryItemPrice updates the price", updated.price === 12.5, JSON.stringify(updated));

api.updateGroceryItemPrice(bread.id, "");
const cleared = api.getGroceryItems().find(i => i.id === bread.id);
check("updateGroceryItemPrice(id, '') clears back to unknown (null, not 0)", cleared.price === null, JSON.stringify(cleared));

api.updateGroceryItemPrice(bread.id, "-5");
const rejected = api.getGroceryItems().find(i => i.id === bread.id);
check("negative price rejected, stays null rather than storing -5", rejected.price === null, JSON.stringify(rejected));

console.log(failed ? `\n${failed} check(s) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
