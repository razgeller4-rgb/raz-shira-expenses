# Design Spec — High-End Expense App (רז ושירה)

**Date:** 2026-06-25
**Target file (apply to DEMO only):** `expense-app-v37-demo.html`
**Stack constraints:** single-file vanilla JS, no build step, Chart.js + XLSX loaded via CDN, Hebrew RTL, mobile-first (iPhone Safari, `100dvh`, safe-area insets).
**Source of direction:** `/Users/mac/Library/Mobile Documents/com~apple~CloudDocs/הוצאות/.claude/reports/design-ux-research.md`

This spec is implementation-ready: real CSS values, ready-to-paste tokens, and a mapping of every item to the exact tab/section/DOM id in the current app.

---

## 0) Current-app map (where each section lives)

Verified from the demo file so the spec targets real UI:

| Area | Current location | Spec section |
|------|------------------|--------------|
| Token block `:root` | line ~17–45 | §1 |
| Dark tokens `[data-theme="dark"]` | line ~723–733 | §1 |
| Topbar (logo, month/sheet selects, dark btn `#darkModeBtn`) | line ~1040–1052 | §1, §5 |
| Pill nav `.pill-nav` (9 tabs) | line ~1055–1065 | §5 tab transition |
| **Dashboard** panel `[data-panel="dashboard"]` | line ~1100–1139 | §2 hero, §3 bento |
| Dashboard KPI grid `#excelKpis` (`renderExcelKpis`, line ~3803) | line ~1112 | §3 bento cards |
| Dashboard chart `#budgetChart` (pie/bar/daily/budgetProgress) | line ~1135 | §6 forecast |
| **Budget** `#categorySummary` + `#budgetOverviewHero` (`renderBudgetOverview` ~3833) | line ~1142–1159 | §4 category chip/row |
| **Income** `#incomeList`, `.income-topbar` | line ~1162–1182 | §4 payment item |
| **Cards** `#paymentMethodList` | line ~1185–1204 | §4 card item |
| **Expenses** filter + list, `#addExpenseBtn`, `#importCCBtn`/`#importCCFile` | line ~1207–1244 | §4 expense row, import |
| **Shared** `[data-panel="shared"]` (`getSharedExpenseSummary` ~2721) | line ~1307 | §3 settlement card |
| Modal system `.modal-backdrop`/`.modal-card` | line ~647–661, ~899–904 | §4 modal |
| Mobile edit modal (built in JS, line ~5816) | — | §4 modal |
| Balance calc `getDisplayedClosingBalance` | line ~3294 | §2 hero number, §6 |

Hard rule from `CLAUDE.md`: **no new external dependencies.** Everything below is CSS + the already-loaded Chart.js. Fonts are the one exception (see §1 note) — self-hosting optional, single `<link>` acceptable per Heebo's value-per-byte.

---

## 1) Design tokens (paste-ready)

Replace the current `:root` block. Keeps existing variable names (`--bg`, `--surface`, `--good`, `--bad`, `--accent`, `--sp-*`, `--r-*`, `--shadow-*`, V35 compat aliases) so nothing downstream breaks, and **adds** a data-viz palette, semantic income/expense, a type scale, and font tokens.

### 1a. Light theme + global tokens

```css
:root {
  /* ── Surfaces ───────────────────────────── */
  --bg: #f4f6fb;            /* app background — a hair cooler/softer than #f1f5f9 */
  --surface: #ffffff;       /* cards */
  --surface-2: #f8fafc;     /* nested/zebra */
  --surface-3: #eef1f8;     /* sunken (skeleton, track) */
  --border: #e6e9f2;
  --border-2: #cdd3e3;

  /* ── Text ───────────────────────────────── */
  --text: #0d1326;          /* near-black, slightly blue */
  --text-2: #3a4257;
  --muted: #6b7488;

  /* ── Brand accent (ONE accent — confident violet) ── */
  --accent: #5b5bf0;        /* primary action / focus / active */
  --accent-2: #7c7cf7;      /* lighter, gradients */
  --accent-strong: #4140d6; /* pressed */
  --accent-light: rgba(91,91,240,.10);
  --accent-ring: rgba(91,91,240,.32);  /* focus ring */

  /* ── Semantic income / expense / warning ── */
  --income: #0e9f6e;        /* green — money in */
  --income-light: #e7f7f0;
  --expense: #e02424;       /* red — money out */
  --expense-light: #fdecec;
  --warn: #d9820a;
  --warn-light: #fef4e6;
  --info: #2563eb;
  --info-light: #e8f0ff;
  /* keep old names alive */
  --good: var(--income); --good-light: var(--income-light);
  --bad: var(--expense);  --bad-light: var(--expense-light);

  /* ── Data-viz palette (charts) — 8 saturated, distinct, color-blind-aware ── */
  --dv-1: #5b5bf0;  /* violet (accent) */
  --dv-2: #0ea5b7;  /* teal */
  --dv-3: #f5a524;  /* amber */
  --dv-4: #e0457b;  /* pink */
  --dv-5: #6ad05a;  /* green */
  --dv-6: #8b5cf6;  /* purple */
  --dv-7: #2dd4bf;  /* aqua */
  --dv-8: #fb7185;  /* coral */
  /* soft fills for area/bg (same hues @ low alpha) */
  --dv-1-soft: rgba(91,91,240,.16);
  --dv-2-soft: rgba(14,165,183,.16);

  /* ── Per-tab accent (kept; used by pills/heroes) ── */
  --c-dashboard:#5b5bf0; --c-budget:#0e9f6e; --c-income:#16a34a;
  --c-cards:#8b5cf6; --c-expenses:#f97316; --c-shared:#e0457b;
  --c-debts:#e02424; --c-yearly:#2563eb; --c-backup:#64748b;

  /* ── Typography ─────────────────────────── */
  --font-sans: 'Heebo','Rubik',system-ui,'Segoe UI',Arial,sans-serif;
  --font-num:  'Heebo','Rubik',system-ui,Arial,sans-serif; /* tabular for money */
  /* Type scale (1.250 major-third, mobile-first) */
  --fs-display: clamp(40px, 11vw, 64px);  /* hero balance */
  --fs-h1: clamp(24px, 6vw, 30px);
  --fs-h2: 20px;
  --fs-h3: 17px;
  --fs-body: 15px;
  --fs-sm: 13px;
  --fs-xs: 11px;
  --fs-micro: 10px;
  --lh-tight: 1.05;  /* big numerals */
  --lh-snug: 1.25;
  --lh-body: 1.55;
  --ls-display: -.022em;  /* negative tracking on big numbers = premium */
  --ls-tight: -.01em;
  --fw-reg:400; --fw-med:500; --fw-semi:600; --fw-bold:700; --fw-black:800;

  /* ── Spacing (4px base) ─────────────────── */
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px;
  --sp-6:24px; --sp-8:32px; --sp-10:40px; --sp-12:48px;

  /* ── Radius ─────────────────────────────── */
  --r-sm:8px; --r-md:12px; --r-lg:16px; --r-xl:20px; --r-2xl:26px; --r-pill:999px;

  /* ── Elevation (layered, soft, premium) ── */
  --shadow-xs: 0 1px 2px rgba(13,19,38,.05);
  --shadow-sm: 0 1px 3px rgba(13,19,38,.06), 0 2px 6px rgba(13,19,38,.04);
  --shadow-md: 0 4px 14px rgba(13,19,38,.08), 0 2px 4px rgba(13,19,38,.05);
  --shadow-lg: 0 12px 32px rgba(13,19,38,.12), 0 4px 8px rgba(13,19,38,.06);
  --shadow-accent: 0 6px 20px rgba(91,91,240,.28);

  /* ── Motion ─────────────────────────────── */
  --ease-out: cubic-bezier(.22,.61,.36,1);
  --ease-spring: cubic-bezier(.34,1.56,.64,1); /* slight overshoot */
  --dur-fast: .14s; --dur-med: .24s; --dur-slow: .42s;

  /* V35/V37 compat aliases — keep */
  --card: var(--surface); --line: var(--border);
  --radius: var(--r-xl); --shadow: var(--shadow-sm);
  --topbar-h:56px; --pillnav-h:52px; --content-max:1100px;
}
```

### 1b. Dark theme (tuned, not inverted — finance reads premium in dark)

Replace `[data-theme="dark"] { ... }`. Surfaces are warm-neutral navy, not pure black; accent brightened for contrast; data-viz hues lifted ~8% lightness so they stay vivid on dark.

```css
[data-theme="dark"] {
  --bg:#0b1020;            /* deep ink, not black */
  --surface:#161d31;       /* card */
  --surface-2:#1d2540;
  --surface-3:#10172a;
  --border:#283356;
  --border-2:#3a4670;

  --text:#eef1fb;
  --text-2:#c2cae0;
  --muted:#8b96b5;

  --accent:#7d7dff;        /* brightened for dark contrast */
  --accent-2:#9a9aff;
  --accent-strong:#6a6af5;
  --accent-light:rgba(125,125,255,.16);
  --accent-ring:rgba(125,125,255,.42);

  --income:#34d399; --income-light:rgba(52,211,153,.14);
  --expense:#f87171; --expense-light:rgba(248,113,113,.14);
  --warn:#fbbf24; --warn-light:rgba(251,191,36,.14);
  --info:#60a5fa; --info-light:rgba(96,165,250,.14);
  --good:var(--income); --good-light:var(--income-light);
  --bad:var(--expense);  --bad-light:var(--expense-light);

  --dv-1:#7d7dff; --dv-2:#22c7dc; --dv-3:#ffbd4a; --dv-4:#f56aa0;
  --dv-5:#7fe06f; --dv-6:#a78bfa; --dv-7:#4fe3d0; --dv-8:#ff8fa0;
  --dv-1-soft:rgba(125,125,255,.20); --dv-2-soft:rgba(34,199,220,.20);

  --shadow-xs:0 1px 2px rgba(0,0,0,.4);
  --shadow-sm:0 1px 3px rgba(0,0,0,.45),0 2px 8px rgba(0,0,0,.35);
  --shadow-md:0 4px 16px rgba(0,0,0,.5);
  --shadow-lg:0 14px 36px rgba(0,0,0,.6);
  --shadow-accent:0 6px 22px rgba(125,125,255,.4);
}
```

### 1c. Font load

Add once in `<head>` (single request, `display=swap` so text never blocks paint):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Then change `body { font-family: 'Inter', ... }` → `font-family: var(--font-sans);`. Heebo is Hebrew-first, has true 800 weight for big numerals, and covers Latin digits cleanly. (Rubik is the listed fallback.) If the offline/self-contained rule must hold strictly, skip the `<link>` and let `system-ui` fall through — the rest of the spec is unaffected.

**Money numerals everywhere:** add `font-variant-numeric: tabular-nums; font-feature-settings:"tnum" 1;` to `.kpi-value`, `.panel-hero-value`, `.hero-balance`, summary amounts, and table cells so digits don't jitter on count-up.

---

## 2) Hero — big balance + sparkline (Dashboard)

**Where:** top of `[data-panel="dashboard"]`, **above** `#excelKpis` (line ~1112). This is the single highest perceived-quality lift (Copilot pattern). Replace the small `.dashboard-note` intro with the hero; keep "התאם כרטיסיות" button as a quiet icon in the hero's top-right.

### Layout & sizing

- Full-bleed card, `--r-2xl`, `--shadow-lg`, subtle gradient skin in accent.
- Stack (mobile): label → **balance number** → delta chip → **sparkline** (last ~12 data points: daily running balance or last 6 months' closing balance from `getDisplayedClosingBalance`).
- The number is the visual anchor: `--fs-display` (40→64px), `--fw-black`, `--ls-display`, tabular-nums. Currency symbol `₪` at `0.5em`, `--muted`, set **after** the number in source but rendered to its left in RTL (digits never reverse — see §7).

```html
<!-- insert as first child of [data-panel="dashboard"] -->
<section class="hero" aria-labelledby="heroLabel">
  <div class="hero-top">
    <span class="hero-label" id="heroLabel">יתרת סגירה — <span id="heroMonthName">יוני 2026</span></span>
    <button class="hero-cfg" id="toggleDashboardPrefsBtn" aria-label="התאם כרטיסיות">⚙</button>
  </div>
  <div class="hero-balance" id="heroBalance"
       data-target="0" role="text" aria-live="polite">
    <span class="hero-int">0</span><span class="hero-cur">₪</span>
  </div>
  <div class="hero-delta" id="heroDelta"><!-- ▲ 4.2% מהחודש שעבר --></div>
  <div class="hero-spark"><canvas id="heroSpark" height="48" aria-hidden="true"></canvas></div>
  <span class="visually-hidden" id="heroSparkAlt"><!-- JS: "מגמה: 6 חודשים, עלייה" --></span>
</section>
```

```css
.hero{
  position:relative; overflow:hidden; color:#fff;
  border-radius:var(--r-2xl); padding:var(--sp-6) var(--sp-6) var(--sp-5);
  margin-bottom:var(--sp-5);
  background:
    radial-gradient(120% 120% at 100% 0, rgba(255,255,255,.14), transparent 55%),
    linear-gradient(135deg, var(--accent-strong), var(--accent) 55%, var(--accent-2));
  box-shadow:var(--shadow-accent), var(--shadow-md);
}
.hero-top{ display:flex; align-items:center; justify-content:space-between; gap:var(--sp-3); }
.hero-label{ font-size:var(--fs-sm); font-weight:var(--fw-semi); opacity:.86; letter-spacing:var(--ls-tight); }
.hero-cfg{ background:rgba(255,255,255,.16); border:0; color:#fff; width:32px; height:32px;
  border-radius:var(--r-pill); font-size:15px; line-height:1; transition:background var(--dur-fast); }
.hero-cfg:hover{ background:rgba(255,255,255,.28); }
.hero-balance{
  margin:var(--sp-3) 0 var(--sp-2); display:flex; align-items:baseline; gap:.12em;
  direction:ltr; justify-content:flex-end; /* number block LTR, sits at trailing (right) edge */
  font-family:var(--font-num); font-weight:var(--fw-black);
  font-size:var(--fs-display); line-height:var(--lh-tight); letter-spacing:var(--ls-display);
  font-variant-numeric:tabular-nums; text-shadow:0 1px 0 rgba(0,0,0,.08);
}
.hero-cur{ font-size:.46em; font-weight:var(--fw-bold); opacity:.78; align-self:center; }
.hero-delta{ display:inline-flex; align-items:center; gap:6px; font-size:var(--fs-sm);
  font-weight:var(--fw-semi); padding:4px 10px; border-radius:var(--r-pill);
  background:rgba(255,255,255,.16); width:max-content; }
.hero-delta.up::before{ content:"▲"; color:#bbf7d0; }
.hero-delta.down::before{ content:"▼"; color:#fecaca; }
.hero-spark{ margin-top:var(--sp-4); height:48px; }
.visually-hidden,.hero-spark canvas[aria-hidden]{}
.visually-hidden{ position:absolute; width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0); }
```

When the balance is negative, swap the gradient to a restrained red-violet so it reads "alert" without alarm:
```css
.hero.is-negative{ background:
  radial-gradient(120% 120% at 100% 0, rgba(255,255,255,.12), transparent 55%),
  linear-gradient(135deg,#9f1239,#c0354f 55%,#e0457b); }
```

### Count-up micro-interaction (a11y-safe)

JS-driven (CSS can't count an arbitrary number), `requestAnimationFrame`, ~700ms, eased. Respects reduced-motion and runs once per data change.

```js
function countUp(el, target, {dur=700, fmt=v=>Math.round(v).toLocaleString('he-IL')}={}){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intEl = el.querySelector('.hero-int') || el;
  if (reduce){ intEl.textContent = fmt(target); el.dataset.target=target; return; }
  const start = Number(el.dataset.target||0), t0 = performance.now();
  const ease = p => 1-Math.pow(1-p,3); // easeOutCubic
  (function step(now){
    const p = Math.min((now-t0)/dur,1);
    intEl.textContent = fmt(start+(target-start)*ease(p));
    if(p<1) requestAnimationFrame(step); else el.dataset.target=target;
  })(performance.now());
}
```
- `aria-live="polite"` announces the final value once (don't announce every frame — set text via the same node; screen readers debounce, but to be safe only the settled value matters because the rapid changes coalesce).
- Trigger on: dashboard render, month/sheet change. **Not** on tab re-entry if value unchanged (guard with `dataset.target`).

### Sparkline (Chart.js, already loaded)

Minimal line, no axes/grid/legend, accent stroke, soft area fill. Last 6 closing balances (or 12 daily points). Time axis LTR per §7.

```js
new Chart(document.getElementById('heroSpark'), {
  type:'line',
  data:{ labels: spark.labels, datasets:[{
    data: spark.values, borderColor:'#fff', borderWidth:2,
    fill:true, backgroundColor:'rgba(255,255,255,.18)',
    tension:.4, pointRadius:0, pointHoverRadius:4 }]},
  options:{ responsive:true, maintainAspectRatio:false, animation:{duration:500},
    plugins:{legend:{display:false}, tooltip:{enabled:true, rtl:true}},
    scales:{ x:{display:false, reverse:false}, y:{display:false} } }
});
```

---

## 3) Bento-grid dashboard

**Where:** the `#excelKpis` grid (line ~1112, rendered by `renderExcelKpis` ~3803). Today it's uniform `auto-fill minmax(175px,1fr)`. Replace the *container* with an asymmetric bento; cards stay driven by the existing widget catalog so user prefs still work. Add **two new bento tiles** the catalog doesn't have yet: **forecast** and **shared-settlement**.

### Bento card set (priority order)

1. **Balance** → already the hero (§2); the bento's job is the supporting metrics.
2. **This-month spend** (large tile) — total out + mini progress vs budget (`renderBudgetOverview` data).
3. **Top categories** (tall tile) — 3–4 bars with category color + amount; pulls from `#categorySummary` source.
4. **Month-end forecast** (wide tile) — projected closing number + tiny trend (links to §6 chart).
5. **Shared-settlement status** (`getSharedExpenseSummary`, line ~2721) — "מי חייב למי" with a settle CTA; accent = `--c-shared`.
6. Remaining catalog KPIs (income, fixed, variable, immediate) fill standard 1×1 cells.

### Responsive RTL bento grid

Mobile: single column, but a few tiles span 2 (so it's not a boring stack). Tablet+: 4-col asymmetric. RTL handled automatically by grid (no left/right hardcoding) plus `direction:rtl` inherited.

```css
.dashboard-mini-grid, .bento{
  display:grid; gap:var(--sp-3);
  grid-template-columns:repeat(2, minmax(0,1fr));   /* mobile: 2 cols */
  grid-auto-flow:dense;
}
.bento .span-2{ grid-column:span 2; }
.bento .tall{ grid-row:span 2; }
@media (min-width:560px){ .bento{ grid-template-columns:repeat(4,minmax(0,1fr)); } }

/* Premium card surface — replaces per-tab tinted .kpi gradients with a calmer base */
.kpi, .bento-card{
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-lg); padding:var(--sp-4) var(--sp-4);
  box-shadow:var(--shadow-sm); min-height:104px;
  display:flex; flex-direction:column; justify-content:space-between;
  position:relative; overflow:hidden;
  transition:transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast);
}
.kpi:hover, .bento-card:hover{ transform:translateY(-2px); box-shadow:var(--shadow-md); }
/* accent edge instead of full tint = cleaner */
.bento-card::before{ content:""; position:absolute; inset-block:0; inset-inline-start:0;
  width:3px; background:var(--accent); opacity:.9; }
.bento-card.is-income::before{ background:var(--income); }
.bento-card.is-expense::before{ background:var(--expense); }
.bento-card.is-shared::before{ background:var(--c-shared); }
.bento-card.is-forecast::before{ background:var(--info); }

.kpi-label,.kpi .label{ font-size:var(--fs-micro); font-weight:var(--fw-bold);
  color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
.kpi .value,.kpi-value{ font-size:clamp(22px,5vw,28px); font-weight:var(--fw-black);
  letter-spacing:var(--ls-display); color:var(--text); margin-top:var(--sp-1);
  font-variant-numeric:tabular-nums; }
.kpi-value.is-income{ color:var(--income); } .kpi-value.is-expense{ color:var(--expense); }
```

In `renderExcelKpis`, add `class="bento-card span-2 is-forecast"` etc. to the relevant items and let the catalog drive the rest. Spend = `.span-2`; top-categories = `.tall`; forecast = `.span-2 is-forecast`; settlement = `.span-2 is-shared`.

### Shared-settlement tile (content)

```
[label]  התחשבנות משותפת
[value]  שירה חייבת לרז  +320 ₪      (color = direction)
[cta]    יישוב חשבון →                (button → existing shared settlement flow)
```
If settled: value "מאוזן ✓" in `--income`, no CTA (empty-positive state).

---

## 4) Components — states

### 4a. Expense row (Expenses list, line ~1233+)

Row = leading category dot, merchant + meta stacked, trailing amount. Amount in `--expense` (out) / `--income` (refund). Logical props throughout.

```css
.exp-row{ display:flex; align-items:center; gap:var(--sp-3);
  padding:var(--sp-3) var(--sp-3); border-radius:var(--r-md);
  background:var(--surface); border:1px solid transparent;
  transition:background var(--dur-fast), border-color var(--dur-fast); }
.exp-row + .exp-row{ margin-top:6px; }
.exp-row:hover{ background:var(--surface-2); }
.exp-row:active{ transform:scale(.995); }
.exp-dot{ width:10px; height:10px; border-radius:var(--r-pill); flex:0 0 auto; } /* color = category */
.exp-main{ flex:1; min-width:0; }
.exp-merchant{ font-size:var(--fs-body); font-weight:var(--fw-semi); color:var(--text);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.exp-meta{ font-size:var(--fs-xs); color:var(--muted); margin-top:2px; }
.exp-amount{ font-size:var(--fs-body); font-weight:var(--fw-bold); direction:ltr;
  font-variant-numeric:tabular-nums; color:var(--expense); flex:0 0 auto; }
.exp-amount.refund{ color:var(--income); }
.exp-row.is-immediate{ border-inline-start:3px solid var(--warn); } /* מיידי flag */
```
**States:** default / hover (surface-2) / active (scale) / selected (`border-color:var(--accent-ring)` + `--accent-light` bg) / **empty** (`.exp-empty` centered illustration glyph + "אין הוצאות לחודש זה — הוסיפו הוצאה ראשונה" + CTA) / **error** (failed import row: `--expense-light` bg, `border-inline-start:3px solid var(--expense)`).

### 4b. Category chip (filter chips line ~1219; budget categories ~1155)

```css
.chip{ display:inline-flex; align-items:center; gap:6px;
  padding:6px 12px; border-radius:var(--r-pill);
  font-size:var(--fs-sm); font-weight:var(--fw-semi);
  background:var(--surface-2); color:var(--text-2);
  border:1.5px solid var(--border); white-space:nowrap;
  transition:all var(--dur-fast) var(--ease-out); }
.chip .dot{ width:8px;height:8px;border-radius:50%; }
.chip:hover{ border-color:var(--border-2); }
.chip[aria-pressed="true"], .chip.active{
  background:var(--accent-light); border-color:var(--accent); color:var(--accent-strong); }
.chip:focus-visible{ outline:none; box-shadow:0 0 0 3px var(--accent-ring); }
```
States: default / hover / active(pressed) / focus / disabled (`opacity:.5; pointer-events:none`).

### 4c. Card / payment item (Cards ~1201, Income ~1179)

Tile with leading brand glyph, last-4 in LTR mono, trailing status/amount.

```css
.pay-item{ display:flex; align-items:center; gap:var(--sp-3);
  padding:var(--sp-4); border-radius:var(--r-lg);
  background:var(--surface); border:1px solid var(--border); box-shadow:var(--shadow-xs); }
.pay-icon{ width:40px;height:40px;border-radius:var(--r-md);
  display:grid;place-items:center; font-size:18px; color:#fff;
  background:linear-gradient(135deg,var(--c-cards),#a78bfa); }
.pay-last4{ direction:ltr; font-variant-numeric:tabular-nums; letter-spacing:.08em;
  font-size:var(--fs-sm); color:var(--muted); }
.pay-amount{ margin-inline-start:auto; font-weight:var(--fw-bold); direction:ltr;
  font-variant-numeric:tabular-nums; }
```
States: default / hover (`box-shadow:var(--shadow-sm)`) / edit-mode (drag handle + delete appear) / empty ("אין כרטיסים — הוסיפו כרטיס" + CTA).

### 4d. Modal (`.modal-card` ~653; mobile edit modal ~5816)

- **Desktop/tablet:** centered, max-width 460px, `--r-2xl`, `--shadow-lg`, backdrop `rgba(13,19,38,.45)` + `backdrop-filter:blur(2px)`.
- **Mobile:** **bottom sheet** (the mobile edit modal already docks to `align-items:flex-end`) — formalize it:

```css
.modal-card{ background:var(--surface); border-radius:var(--r-2xl);
  box-shadow:var(--shadow-lg); padding:var(--sp-6);
  width:min(460px,calc(100% - 32px));
  animation:modalIn var(--dur-med) var(--ease-spring); }
@media (max-width:600px){
  .modal-backdrop.open{ align-items:flex-end; }
  .modal-card{ width:100%; border-radius:var(--r-2xl) var(--r-2xl) 0 0;
    padding-bottom:max(var(--sp-6),calc(var(--sp-6)+env(safe-area-inset-bottom)));
    animation:sheetUp var(--dur-med) var(--ease-out); }
  /* grabber */
  .modal-card::before{ content:""; display:block; width:38px;height:4px;border-radius:2px;
    background:var(--border-2); margin:0 auto var(--sp-4); }
}
@keyframes modalIn{ from{opacity:0; transform:translateY(8px) scale(.98)} to{opacity:1; transform:none} }
@keyframes sheetUp{ from{transform:translateY(100%)} to{transform:none} }
```
States: open / closing (add `.is-closing` → reverse animation, then remove) / loading (skeleton rows in `.modal-detail-list`) / error (inline `--expense` banner at top of card). **Focus trap + Esc to close + restore focus** to trigger (a11y).

### 4e. Import modal (Expenses → `#importCCBtn`, line ~1241)

Current import is a bare file input. Upgrade to a 3-state modal so users trust the output (auditability matters per global rules):
1. **Pick** — dropzone card: "גררו קובץ אשראי או בחרו" + format hint `.xlsx .xls .csv`.
2. **Preview/map** — table of parsed rows, count badge ("נמצאו 42 עסקאות"), per-row category guess as editable chip, duplicates flagged with `--warn` row. Confirm/cancel.
3. **Done** — success state with checkmark animation (§5) + "יובאו 42 הוצאות".
Error state: parse failure → `--expense` banner "לא הצלחנו לקרוא את הקובץ" + "נסו שוב".

---

## 5) Micro-interactions (CSS-first, a11y + perf)

Wrap everything motion-related in a global guard:
```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{ animation-duration:.001ms!important; animation-iteration-count:1!important;
    transition-duration:.001ms!important; scroll-behavior:auto!important; }
}
```

### 5a. Save confirmation — checkmark (CSS-only)
Toast or inline; SVG stroke-draw, no JS beyond toggling a class.
```css
.save-check{ width:22px;height:22px; }
.save-check .tick{ stroke:var(--income); stroke-width:3; fill:none;
  stroke-dasharray:24; stroke-dashoffset:24; }
.save-check.go .tick{ animation:draw .45s var(--ease-out) forwards; }
@keyframes draw{ to{ stroke-dashoffset:0; } }
.save-toast{ position:fixed; inset-block-end:calc(88px + env(safe-area-inset-bottom));
  inset-inline:0; margin-inline:auto; width:max-content;
  background:var(--surface); color:var(--text); box-shadow:var(--shadow-lg);
  border-radius:var(--r-pill); padding:10px 18px; display:flex; gap:8px; align-items:center;
  transform:translateY(20px); opacity:0; transition:all var(--dur-med) var(--ease-spring); z-index:200; }
.save-toast.show{ transform:none; opacity:1; }
```
Announce via `role="status"` (polite) so screen readers hear "נשמר".

### 5b. Number count-up — §2 `countUp()`. Reuse for KPI values on dashboard render. Guard with `dataset.target` to skip no-op renders (perf).

### 5c. Shake on invalid field
```css
.field.invalid input,.field.invalid select{ border-color:var(--expense)!important;
  animation:shake .32s var(--ease-out); }
@keyframes shake{ 10%,90%{transform:translateX(-2px)} 30%,70%{transform:translateX(3px)}
  50%{transform:translateX(-4px)} }
```
Pair with `aria-invalid="true"` + an inline `--expense` helper message (don't rely on color alone).

### 5d. Tab transition (pill-nav line ~1055; panels `.tab-panel`)
The pill already has `transition:all .15s`. Add a content fade/slide on panel switch — CSS-only via a class the existing tab handler can toggle:
```css
.tab-panel.active{ animation:panelIn var(--dur-med) var(--ease-out); }
@keyframes panelIn{ from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:none} }
/* active pill: animated underline-free, the bg pill already moves; add press feedback */
.pill-btn:active{ transform:scale(.96); }
```
Perf: animate only `transform`/`opacity` (GPU-composited, no layout/paint). Never animate `width/height/top/left`. `will-change` only on the hero balance during count-up, removed after.

### 5e. Card tap spring (mobile)
`.bento-card:active{ transform:scale(.98); transition:transform .1s var(--ease-out); }` — gives the "haptic-style" press the research calls for, CSS-only.

---

## 6) Month-end forecast (Chart.js)

**Where:** Dashboard chart `#budgetChart` (line ~1135) gains a 5th option `forecast` in `#chartTypeSelect`, and the forecast bento tile (§3) links to it. Pattern = Monarch: a line that continues **past "today"** as a dashed projection toward projected month-end balance.

Data: actual daily running balance (solid) from start of month to today using existing expense/income data; projection (dashed) from today to month-end using average daily burn (or known recurring items). Final point = projected closing balance.

```js
function forecastChart(ctx, {labels, actual, projected, todayIdx}){
  // actual: values up to today then null; projected: nulls then values from today→EOM
  return new Chart(ctx,{
    type:'line',
    data:{ labels, datasets:[
      { label:'בפועל', data:actual, borderColor:getCss('--accent'), borderWidth:2.5,
        backgroundColor:getCss('--dv-1-soft'), fill:true, tension:.35, pointRadius:0 },
      { label:'תחזית', data:projected, borderColor:getCss('--info'), borderWidth:2,
        borderDash:[6,5], fill:false, tension:.35, pointRadius:0,
        pointHoverRadius:4 } ]},
    options:{ responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index', intersect:false},
      plugins:{
        legend:{ display:true, rtl:true, labels:{font:{family:'Heebo'}, usePointStyle:true} },
        tooltip:{ rtl:true, textDirection:'rtl', callbacks:{ label:c=>` ${c.formattedValue} ₪` } },
        // "today" marker via annotation-free approach: a vertical via a 1-pt dataset or grid line
      },
      scales:{
        x:{ reverse:false, grid:{display:false}, ticks:{font:{family:'Heebo'}} }, // time LTR, §7
        y:{ position:'right', grid:{color:getCss('--border')},
            ticks:{ callback:v=>v.toLocaleString('he-IL'), font:{family:'Heebo'} } } }
    }
  });
}
function getCss(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
```
- **Today divider:** simplest dep-free option — set the actual series' last real point to a visible `pointRadius:4` with accent fill, and start the dashed series at that same index so they visually connect. Optionally draw a faint vertical via a thin `segment` styling.
- **Y axis on the right** (`position:'right'`) so it sits at the leading edge for RTL readers; **X axis stays LTR** (past→future, left→right) per the research decision.
- Colors pulled live from CSS vars so dark mode recolors the chart for free. Re-read on theme toggle and call `chart.update()`.

Forecast tile copy: `value` = projected closing (count-up), `sub` = "בקצב הנוכחי, צפי לסוף יוני" with up/down chip vs current balance.

---

## 7) RTL Hebrew rules (enforce app-wide)

1. **Logical properties only** in new CSS: `margin-inline-start/end`, `padding-inline-*`, `inset-inline-*`, `border-inline-start`, `text-align:start/end`. Never `left/right/margin-left`. (Existing code uses some physical props like `border-right` on `.section` — leave them, but write all new rules logical.)
2. **Numerals never reverse.** Any numeric run (amounts, last-4, dates, %, phone) sits in a `direction:ltr` inline box, right-aligned within its RTL container. Already applied to `.hero-balance`, `.exp-amount`, `.pay-amount`, `.pay-last4`.
3. **`%` placement:** in RTL the percent sign goes to the **left** of the number. With `direction:ltr` on the number box, write `<span dir="ltr">42%</span>` and it renders correctly as a unit; for inline Hebrew sentences use `42%` inside an `ltr` span so it doesn't flip.
4. **Currency:** `₪` to the left of the number (after it in source within the `ltr` block, as in §2). Keep one convention everywhere.
5. **Charts:** time/X axis **LTR** (left→right = past→future), Y axis on the **right**. Tooltips/legends `rtl:true` + `textDirection:'rtl'`. Decision is locked — apply to sparkline, forecast, and existing daily-timeline chart.
6. **Icons that imply direction** (arrows for "back"/"next", trend ▲▼ are fine): mirror navigational chevrons via `scaleX(-1)` in RTL; do **not** mirror logos, media controls, or trend arrows.
7. **Flex budget:** Hebrew is compact but give buttons `min-width` room; avoid truncation on labels like "יישוב חשבון".

---

## 8) Phased rollout (effort per item)

Effort key: **S** ≤1h, **M** 1–3h, **L** half-day+. All applied to `expense-app-v37-demo.html` first, then promoted to v37 only after Raz approves on iPhone (per `CLAUDE.md` workflow).

### Phase 1 — Quick wins (tokens + hero) — biggest perceived lift, lowest risk
| Item | Where | Effort |
|------|-------|--------|
| Paste new token block §1a + dark §1b (keeps old names) | `:root`, `[data-theme=dark]` | **M** |
| Heebo font load + `font-family` swap + tabular-nums on money | `<head>`, `body`, value classes | **S** |
| Hero balance + delta + sparkline §2 | top of dashboard panel | **M** |
| Count-up + reduced-motion guard §2/§5b | new JS + global CSS | **S** |

Ship Phase 1 alone — it already reads "premium." UI-only, no data logic touched (read-only from `getDisplayedClosingBalance`).

### Phase 2 — Bento dashboard
| Item | Where | Effort |
|------|-------|--------|
| Bento grid container §3 + premium card surface | `.dashboard-mini-grid` / `#excelKpis` | **M** |
| Forecast tile + shared-settlement tile (catalog additions) | `renderExcelKpis` ~3803 | **L** |
| Forecast chart §6 + new `chartTypeSelect` option | `#budgetChart` ~1135 | **L** |

### Phase 3 — Micro-interactions + component polish
| Item | Where | Effort |
|------|-------|--------|
| Save toast + checkmark §5a | global + save handlers | **S** |
| Shake-on-invalid §5c + `aria-invalid` | form fields | **S** |
| Tab/panel transition §5d, card tap spring §5e | `.tab-panel`,`.pill-btn`,`.bento-card` | **S** |
| Expense row / chip / pay-item restyle §4a–4c | lists in expenses/budget/cards/income | **M** |
| Modal → bottom-sheet formalization + focus trap §4d | `.modal-card`, mobile edit modal | **M** |
| Import modal 3-state §4e | `#importCCBtn` flow | **L** |

### Phase 4 — RTL correctness pass (cheap, prevents "translated" feel)
| Item | Where | Effort |
|------|-------|--------|
| Logical-prop audit on new CSS, `%`/`₪` placement, LTR numeral boxes §7 | app-wide new rules | **S–M** |
| Chart axis direction lock + live CSS-var theming §6/§7 | all Chart.js instances | **S** |

**Risk note:** §1–§3 and §5 are presentation-only and safe to iterate on the demo freely. Anything touching forecast math (§6) or settlement display (§3 shared tile) reads from `getDisplayedClosingBalance` / `getSharedExpenseSummary` — do **not** alter those calc functions; only render their output. Back up before promoting per project iron rules.
```
