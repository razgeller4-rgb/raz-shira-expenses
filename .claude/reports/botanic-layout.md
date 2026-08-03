# Botanic Layout Blueprint — Expense App (רז ושירה)

**Date:** 2026-06-26
**Target (DEMO only):** `expense-app-v37-demo.html` — do NOT touch v37 until approved on iPhone.
**Builds on:** `.claude/reports/design-spec.md` (hero §2, bento §3, forecast §6, RTL §7) and `design-ux-research.md`. This document **reskins** that spec to a Scandinavian-organic botanical aesthetic and adds: iOS bottom-tab bar, empty states, bottom-sheet formalization, the "category garden" tile, and a forecast chart option.
**Constraints (locked):** single-file vanilla JS, no build step, no new external deps (Chart.js + XLSX only), Hebrew RTL, mobile-first iPhone Safari, `100dvh`, safe-area insets. All new CSS uses **logical properties** only.

This is a layout/component blueprint. **No app HTML is edited here** — markup is illustrative for the implementer.

---

## 0) Botanic design tokens (override the §1 palette — keep all variable NAMES)

Drop-in replacement for the `:root` color block. Variable names stay identical so nothing downstream breaks; only values change from violet-tech to warm-organic. Type scale, spacing, radii, motion from design-spec.md §1 are **kept as-is** (with two radius tweaks below for organic softness).

```css
:root{
  /* ── Surfaces — cream / linen / paper ── */
  --bg:        #f5f1e8;   /* warm linen canvas */
  --surface:   #fdfbf6;   /* cream card (paper white) */
  --surface-2: #f1ece0;   /* nested / zebra — oat */
  --surface-3: #e8e1d2;   /* sunken track / skeleton */
  --border:    #e3dccc;   /* soft sand hairline */
  --border-2:  #d2c8b2;

  /* ── Text — walnut ink ── */
  --text:   #3a322a;   /* walnut near-black */
  --text-2: #5d5345;
  --muted:  #8a7d6b;   /* warm taupe */

  /* ── Brand accent — sage green ── */
  --accent:        #7c9473;  /* sage — primary action / active / focus */
  --accent-2:      #9aae90;  /* light sage — gradients */
  --accent-strong: #5f7657;  /* deep sage — pressed */
  --accent-light:  rgba(124,148,115,.14);
  --accent-ring:   rgba(124,148,115,.40);

  /* ── Walnut wood — secondary warm accent ── */
  --wood:        #a9805e;
  --wood-2:      #c2a07f;
  --wood-strong: #8a6446;
  --wood-light:  rgba(169,128,94,.14);

  /* ── Semantic (botanical-tuned, not neon) ── */
  --income:  #6f9b6a;  --income-light:  #e8f0e4;   /* leaf green */
  --expense: #c06b5a;  --expense-light: #f6e6e1;   /* terracotta (calmer than red) */
  --warn:    #cc9a52;  --warn-light:    #f7eeda;   /* honey amber */
  --info:    #6b8aa3;  --info-light:    #e6edf2;   /* dusty blue */
  --good:var(--income); --good-light:var(--income-light);
  --bad:var(--expense); --bad-light:var(--expense-light);

  /* ── Data-viz — botanical garden palette (8 distinct earth tones) ── */
  --dv-1:#7c9473; /* sage   */  --dv-2:#a9805e; /* walnut */
  --dv-3:#cc9a52; /* honey  */  --dv-4:#c06b5a; /* terracotta */
  --dv-5:#6b8aa3; /* dusty blue */ --dv-6:#9d8aa8; /* dried lavender */
  --dv-7:#8aa088; /* eucalyptus */ --dv-8:#d4a373; /* sand */
  --dv-1-soft:rgba(124,148,115,.18); --dv-2-soft:rgba(169,128,94,.18);

  /* ── Per-tab accent (re-tinted, kept) ── */
  --c-dashboard:#7c9473; --c-budget:#6f9b6a; --c-income:#6f9b6a;
  --c-cards:#a9805e; --c-expenses:#c06b5a; --c-shared:#9d8aa8;
  --c-debts:#c06b5a; --c-yearly:#6b8aa3; --c-backup:#8a7d6b;

  /* ── Elevation — warm shadows (brown-tinted, not gray) ── */
  --shadow-xs: 0 1px 2px rgba(58,50,42,.05);
  --shadow-sm: 0 1px 3px rgba(58,50,42,.07), 0 2px 6px rgba(58,50,42,.04);
  --shadow-md: 0 4px 14px rgba(58,50,42,.09), 0 2px 4px rgba(58,50,42,.05);
  --shadow-lg: 0 12px 32px rgba(58,50,42,.13), 0 4px 8px rgba(58,50,42,.07);
  --shadow-accent: 0 6px 20px rgba(124,148,115,.28);

  /* ── Radii — slightly rounder for organic feel (override only these two) ── */
  --r-lg:18px; --r-xl:22px; /* others from spec: sm8 md12 2xl26 pill999 */
}
```

### Dark theme — "forest at dusk" (replace `[data-theme="dark"]` colors)

```css
[data-theme="dark"]{
  --bg:#1c1a16;          /* dark walnut */
  --surface:#26231d;     /* card */
  --surface-2:#2f2b23;
  --surface-3:#1f1c17;
  --border:#3a352b; --border-2:#4a4336;
  --text:#efe9dc; --text-2:#cabf a8; --muted:#9a8f7c;

  --accent:#9aae90; --accent-2:#b3c4a8; --accent-strong:#809478;
  --accent-light:rgba(154,174,144,.16); --accent-ring:rgba(154,174,144,.42);
  --wood:#c2a07f; --wood-2:#d4b896; --wood-strong:#a9805e; --wood-light:rgba(194,160,127,.16);

  --income:#8ab884; --income-light:rgba(138,184,132,.14);
  --expense:#d68a78; --expense-light:rgba(214,138,120,.14);
  --warn:#dcb877; --warn-light:rgba(220,184,119,.14);
  --info:#8aa6bc; --info-light:rgba(138,166,188,.14);
  --good:var(--income); --good-light:var(--income-light);
  --bad:var(--expense);  --bad-light:var(--expense-light);

  --dv-1:#9aae90; --dv-2:#c2a07f; --dv-3:#dcb877; --dv-4:#d68a78;
  --dv-5:#8aa6bc; --dv-6:#b3a3bd; --dv-7:#a3b8a0; --dv-8:#e0b88a;
  --dv-1-soft:rgba(154,174,144,.20); --dv-2-soft:rgba(194,160,127,.20);

  --shadow-xs:0 1px 2px rgba(0,0,0,.4);
  --shadow-sm:0 1px 3px rgba(0,0,0,.45),0 2px 8px rgba(0,0,0,.35);
  --shadow-md:0 4px 16px rgba(0,0,0,.5);
  --shadow-lg:0 14px 36px rgba(0,0,0,.6);
  --shadow-accent:0 6px 22px rgba(154,174,144,.4);
}
```
(Fix the `--text-2` typo above — `#cabfa8` — when pasting.)

### Subtle botanical canvas texture (optional, near-free)
A faint leaf-vein pattern on the app `body`, low opacity, inline data-URI SVG so it stays self-contained:
```css
body{
  background:
    radial-gradient(140% 90% at 100% 0, var(--accent-light), transparent 45%),
    var(--bg);
}
```
Keep it this light — no busy wallpaper. The "botanical" feel comes from accents and SVG motifs, not a noisy background.

---

## 1) iOS bottom tab bar (mobile <600px)

### Concept
At `<600px` the 9-item `.pill-nav` is **hidden** and replaced by a fixed 5-slot iOS-style bottom tab bar. Desktop/tablet (`≥600px`) keeps the existing top `.pill-nav` and **hides** the bottom bar. The bottom bar's 5 slots map to the 5 primary tabs; a 6th "עוד" (More) slot opens a **bottom sheet** listing the remaining 4 tabs. The existing `.side-drawer` (hamburger) stays as a desktop/legacy fallback but is no longer the primary mobile nav.

### 5 primary + More
| Slot | Tab | `data-tab` | Leaf/plant icon |
|------|-----|-----------|-----------------|
| 1 | דשבורד   | `dashboard` | potted seedling |
| 2 | הוצאות   | `expenses`  | falling leaf |
| 3 | משותף    | `shared`    | two-leaf sprig |
| 4 | תקציב    | `budget`    | growing stem / bar-leaves |
| 5 | עוד      | (sheet)     | three dots / fern frond |

"עוד" sheet lists: **הכנסות** (`income`), **אשראיים** (`cards`), **חובות** (`debts`), **שנתי** (`yearly`), **גיבוי** (`backup`).

### Coexistence rules (critical — no JS rewrite)
- The existing tab handler keys off `.tab-btn[data-tab]`. The bottom bar buttons reuse **the same** `data-tab` values and class `tab-btn`, so tapping them flows through the existing switch logic with **zero JS changes** to the router.
- Keep the hidden `#tabbar` (line ~1141) untouched — it's the JS compatibility source of truth.
- Active sync: the bottom bar's active state is driven by the same code that toggles `.pill-btn.active`. Add a tiny one-liner in the existing tab-activate function: also toggle `.active` on `.btab[data-tab="<id>"]`. (Implementer note only — not edited here.)
- The FAB (`.fab` ~856, `bottom:24px`) must **lift above** the new bar: change its `inset-block-end` to `calc(78px + env(safe-area-inset-bottom))` at `<600px` so it floats over the tab bar's trailing edge.
- `.main` already pads `padding-bottom: calc(88px + safe-area)` (line 742) — keep; it clears the bar.

### Markup pattern (illustrative)
```html
<!-- sibling of <main>, rendered once -->
<nav class="botanic-tabbar" aria-label="ניווט תחתון" role="tablist">
  <button class="btab tab-btn active" data-tab="dashboard" role="tab" aria-selected="true">
    <svg class="btab-ico" viewBox="0 0 24 24" aria-hidden="true"><!-- seedling --></svg>
    <span class="btab-lbl">דשבורד</span>
  </button>
  <button class="btab tab-btn" data-tab="expenses" role="tab"> … הוצאות </button>
  <button class="btab tab-btn" data-tab="shared"   role="tab"> … משותף </button>
  <button class="btab tab-btn" data-tab="budget"   role="tab"> … תקציב </button>
  <button class="btab btab-more" type="button" aria-haspopup="dialog" onclick="openMoreSheet()">
    <svg class="btab-ico" viewBox="0 0 24 24" aria-hidden="true"><!-- fern/dots --></svg>
    <span class="btab-lbl">עוד</span>
  </button>
</nav>

<!-- More sheet (reuses bottom-sheet pattern §5) -->
<div class="more-backdrop" id="moreBackdrop" onclick="closeMoreSheet()"></div>
<nav class="more-sheet" id="moreSheet" aria-label="טאבים נוספים">
  <span class="sheet-grab"></span>
  <button class="more-row tab-btn" data-tab="income" onclick="closeMoreSheet()"><svg …/>הכנסות</button>
  <button class="more-row tab-btn" data-tab="cards"  onclick="closeMoreSheet()"><svg …/>אשראיים</button>
  <button class="more-row tab-btn" data-tab="debts"  onclick="closeMoreSheet()"><svg …/>חובות</button>
  <button class="more-row tab-btn" data-tab="yearly" onclick="closeMoreSheet()"><svg …/>שנתי</button>
  <button class="more-row tab-btn" data-tab="backup" onclick="closeMoreSheet()"><svg …/>גיבוי</button>
</nav>
```

### CSS
```css
.botanic-tabbar{ display:none; }              /* hidden on desktop */
@media (max-width:600px){
  .pill-nav{ display:none; }                  /* hide top pills on phone */
  .botanic-tabbar{
    display:grid; grid-template-columns:repeat(5,1fr);
    position:fixed; inset-inline:0; inset-block-end:0; z-index:60;
    background:color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter:blur(12px);
    border-block-start:1px solid var(--border);
    padding-block:6px;
    padding-block-end:calc(6px + env(safe-area-inset-bottom,0px));
    box-shadow:0 -4px 18px rgba(58,50,42,.08);
  }
  .btab{
    display:flex; flex-direction:column; align-items:center; gap:3px;
    min-height:44px; padding:5px 4px;             /* ≥44px hit target */
    background:none; border:0; cursor:pointer;
    color:var(--muted); transition:color var(--dur-fast) var(--ease-out);
  }
  .btab-ico{ width:24px; height:24px; stroke:currentColor; fill:none; stroke-width:1.6; }
  .btab-lbl{ font-size:10px; font-weight:var(--fw-semi); letter-spacing:-.01em; }
  .btab.active{ color:var(--accent-strong); }
  .btab.active .btab-ico{ stroke:var(--accent); }
  /* active "growing" cue: tiny sprout dot under the icon */
  .btab.active::before{
    content:""; position:absolute; inset-block-start:2px;
    width:5px; height:5px; border-radius:50%;
    background:var(--accent); opacity:.9;
  }
  .btab{ position:relative; }
  .btab:active .btab-ico{ transform:scale(.9); transition:transform .1s; }
}
```

### Icon set (inline SVG line icons, ~24px, `currentColor` stroke)
Keep them single-stroke, 1.6 width, rounded caps — botanical line-art:
- **דשבורד** — potted seedling: small pot trapezoid + two sprout leaves.
- **הוצאות** — single falling leaf with center vein.
- **משותף** — two-leaf sprig sharing one stem (couple metaphor).
- **תקציב** — three rising stems of increasing height, each topped by a leaf (bar-chart-as-plants).
- **עוד** — fern frond OR three dots; fern reads more on-brand.
All inline so the file stays self-contained (no icon-font dep). Active = `stroke:var(--accent)`.

---

## 2) Bento dashboard grid — "the garden"

Reuses design-spec.md §3 bento grid (mobile 2-col, desktop 4-col, `grid-auto-flow:dense`, RTL-correct via logical grid). Botanic reskin = warm card surface, sage accent edge, plus one new bespoke tile: **category garden**.

### Tile set (replaces uniform `#excelKpis`)
| # | Tile | Span | Reads from | Accent |
|---|------|------|-----------|--------|
| — | **Balance / hero** | full-bleed above grid | `getDisplayedClosingBalance` | sage gradient (§3) |
| 1 | **הוצאות החודש** (this-month spend) | `.span-2` | `renderExcelKpis` total + `renderBudgetOverview` progress | `--expense` edge |
| 2 | **גן הקטגוריות** (category garden — top categories) | `.tall` | `#categorySummary` source / `getDashboardWidgetCatalog` | `--accent` edge |
| 3 | **צפי סוף חודש** (month-end forecast) | `.span-2 is-forecast` | forecast calc (§7) on `getDisplayedClosingBalance` | `--info` edge |
| 4 | **התחשבנות זוגית** (couple settlement) | `.span-2 is-shared` | `getSharedExpenseSummary` | `--c-shared` edge |
| 5+ | remaining catalog KPIs (income, fixed, variable, immediate) | 1×1 | `renderExcelKpis` + `getDashboardWidgetCatalog` | per-tab |
| — | yearly mini-trend (optional 1×1) | 1×1 | `getYearlyRowsData` | `--wood` edge |

The existing widget-catalog/prefs system still drives which 1×1 KPIs show — only the 4 hero tiles are pinned. User's "התאם כרטיסיות" prefs keep working.

### Responsive grid (botanic card surface)
```css
.dashboard-mini-grid, .bento{
  display:grid; gap:var(--sp-3);
  grid-template-columns:repeat(2,minmax(0,1fr));   /* mobile 2-col */
  grid-auto-flow:dense;
}
.bento .span-2{ grid-column:span 2; }
.bento .tall{ grid-row:span 2; }
@media (min-width:560px){ .bento{ grid-template-columns:repeat(4,minmax(0,1fr)); } }

.kpi, .bento-card{
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-lg); padding:var(--sp-4);
  box-shadow:var(--shadow-sm); min-height:104px;
  display:flex; flex-direction:column; justify-content:space-between;
  position:relative; overflow:hidden;
  transition:transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast);
}
.kpi:hover, .bento-card:hover{ transform:translateY(-2px); box-shadow:var(--shadow-md); }
.bento-card::before{                       /* organic accent edge, leading side */
  content:""; position:absolute; inset-block:0; inset-inline-start:0;
  width:3px; background:var(--accent); opacity:.85; border-radius:0 2px 2px 0;
}
.bento-card.is-expense::before{ background:var(--expense); }
.bento-card.is-forecast::before{ background:var(--info); }
.bento-card.is-shared::before{ background:var(--c-shared); }
.bento-card.is-income::before{ background:var(--income); }
/* faint leaf watermark in trailing-top corner of the big tiles */
.bento-card.span-2::after, .bento-card.tall::after{
  content:""; position:absolute; inset-block-start:-8px; inset-inline-end:-8px;
  width:64px; height:64px; opacity:.06;
  background:center/contain no-repeat url("data:image/svg+xml,<leaf>");
  pointer-events:none;
}
```

### Category garden tile (the signature moment)
3–4 horizontal "growth bars" — each category is a stem that grows from the leading edge, tipped with a small leaf, bar length = share of spend, color = category color (`--dv-*`).
```html
<article class="bento-card tall garden-tile">
  <div class="kpi-label">גן הקטגוריות</div>
  <ul class="garden-list">
    <li class="garden-row">
      <span class="garden-name">מזון</span>
      <span class="garden-bar"><i style="--w:78%;--c:var(--dv-1)"></i></span>
      <span class="garden-val" dir="ltr">2,340 ₪</span>
    </li>
    <!-- repeat 3–4 -->
  </ul>
</article>
```
```css
.garden-list{ display:flex; flex-direction:column; gap:var(--sp-3); margin-block-start:var(--sp-3); }
.garden-row{ display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:var(--sp-2);
  font-size:var(--fs-sm); }
.garden-name{ color:var(--text-2); font-weight:var(--fw-semi); white-space:nowrap; }
.garden-bar{ height:8px; border-radius:var(--r-pill); background:var(--surface-3); position:relative; overflow:hidden; }
.garden-bar i{ position:absolute; inset-block:0; inset-inline-start:0; width:var(--w);
  background:linear-gradient(90deg, color-mix(in srgb,var(--c) 70%,transparent), var(--c));
  border-radius:var(--r-pill);
  animation:grow .6s var(--ease-out) both; }     /* stems "grow in" */
.garden-val{ font-variant-numeric:tabular-nums; color:var(--muted); font-size:var(--fs-xs); }
@keyframes grow{ from{ width:0 } to{ width:var(--w) } }
```
RTL: bar fills from `inset-inline-start` so it grows from the leading (right) edge inward — correct for Hebrew.

### Settlement tile content
```
[label] התחשבנות זוגית
[value] שירה חייבת לרז · +320 ₪    (color = direction; sage if owed-to-you, terracotta if you owe)
[cta]   יישוב חשבון ←              (existing shared settlement flow)
```
Settled → value "מאוזן ✓" in `--income`, CTA hidden (positive-empty state).

---

## 3) Hero finish — botanical

Reuses the §2 hero structure/markup (already in the file, lines 1171–1182) — reskin the gradient + add a potted-plant SVG motif + "growth" framing for `#heroSpark`.

```css
.hero, #dashboardHero{
  position:relative; overflow:hidden; color:#fdfbf6;
  border-radius:var(--r-2xl); padding:var(--sp-6) var(--sp-6) var(--sp-5);
  margin-block-end:var(--sp-5);
  background:
    radial-gradient(120% 120% at 100% 0, rgba(255,255,255,.12), transparent 55%),
    linear-gradient(135deg, var(--accent-strong) 0%, var(--accent) 55%, var(--accent-2) 100%);
  box-shadow:var(--shadow-accent), var(--shadow-md);
}
/* potted-plant / leaf motif, bottom-leading corner, low contrast */
.hero::after{
  content:""; position:absolute; inset-block-end:-10px; inset-inline-start:-6px;
  width:120px; height:120px; opacity:.16; pointer-events:none;
  background:bottom left/contain no-repeat url("data:image/svg+xml,<potted-plant>");
}
.hero-balance{ font-variant-numeric:tabular-nums; direction:ltr; justify-content:flex-end; }
.hero-cur{ font-size:.46em; opacity:.8; }
.hero-delta.up{   background:rgba(255,255,255,.18); }
.hero-delta.up::before{ content:"↑"; }   /* "growth" arrow, leaf-green tint via ::before color */
.hero-delta.down::before{ content:"↓"; }
.hero-cfg{ background:rgba(255,255,255,.18); color:#fff; }
.hero.is-negative{ background:
  radial-gradient(120% 120% at 100% 0, rgba(255,255,255,.10), transparent 55%),
  linear-gradient(135deg,#8a5a4a,#a96b58 55%,#c06b5a); }  /* restrained terracotta */
```
- **Balance + delta layout:** label row top (`hero-top`), big balance number (`--fs-display`, tabular-nums, `₪` at `.46em`), delta chip below as a pill ("↑ 4.2% מהחודש שעבר"). All from existing markup.
- **Count-up:** reuse the §2 `countUp()` (already in spec/file), reduced-motion safe, triggered on dashboard render + month/sheet change, guarded by `dataset.target`.
- **"Growth" sparkline:** `#heroSpark` styled as a vine — white 2px stroke, soft white area fill (`rgba(255,255,255,.18)`), `tension:.45` for organic curve, no axes/grid. Last 6 closing balances. Add tiny leaf-dot at the final (latest) point: `pointRadius:[0,0,0,0,0,3]`, point color `#fdfbf6` — reads as a bud at the tip of the growing vine. X axis LTR (past→future) per RTL §7.

---

## 4) Component restyle (cascades to all tabs)

One rule-set each; warm shadows, organic radii, generous spacing. All from design-spec.md §4, reskinned to botanic vars (the vars already carry the new palette, so most cascade for free). Botanic-specific deltas noted.

### .kpi card → see §2 `.kpi/.bento-card`. Edge accent + lift on hover.

### .section header / body
```css
.section{ background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-xl); box-shadow:var(--shadow-sm); overflow:hidden;
  margin-block-end:var(--sp-4); }
.section .header{ display:flex; align-items:center; justify-content:space-between;
  padding:var(--sp-4) var(--sp-5); font-size:var(--fs-h3); font-weight:var(--fw-bold);
  color:var(--text); cursor:pointer; gap:var(--sp-3);
  border-inline-start:3px solid var(--accent); }   /* leaf-stem edge on header */
.section .header:hover{ background:var(--surface-2); }
.section .content{ padding:var(--sp-4) var(--sp-5) var(--sp-5); }
```

### .feed-row / .exp-row (expense row)
```css
.feed-row, .exp-row{ display:flex; align-items:center; gap:var(--sp-3);
  padding:var(--sp-3); border-radius:var(--r-md);
  background:var(--surface); border:1px solid transparent;
  transition:background var(--dur-fast), border-color var(--dur-fast); }
.feed-row + .feed-row{ margin-block-start:6px; }
.feed-row:hover{ background:var(--surface-2); }
.feed-row:active{ transform:scale(.995); }
.exp-dot{ width:10px; height:10px; border-radius:var(--r-pill); flex:0 0 auto; }  /* category color */
.exp-merchant{ font-size:var(--fs-body); font-weight:var(--fw-semi); color:var(--text);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.exp-meta{ font-size:var(--fs-xs); color:var(--muted); margin-block-start:2px; }
.exp-amount{ direction:ltr; font-variant-numeric:tabular-nums; font-weight:var(--fw-bold);
  color:var(--expense); flex:0 0 auto; }
.exp-amount.refund{ color:var(--income); }
.exp-row.is-immediate{ border-inline-start:3px solid var(--warn); }   /* מיידי flag */
.exp-row.is-selected{ background:var(--accent-light); border-color:var(--accent-ring); }
```

### Buttons — .primary-cta / .secondary
```css
.primary-cta{ background:linear-gradient(135deg,var(--accent),var(--accent-2));
  color:#fdfbf6; border:0; border-radius:var(--r-pill);
  padding:11px 22px; font-size:var(--fs-body); font-weight:var(--fw-bold);
  box-shadow:var(--shadow-accent); cursor:pointer;
  transition:transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast); }
.primary-cta:hover{ transform:translateY(-1px); box-shadow:0 8px 26px rgba(124,148,115,.36); }
.primary-cta:active{ transform:scale(.97); }
.primary-cta:disabled{ opacity:.5; box-shadow:none; cursor:not-allowed; }
.secondary{ background:var(--surface); color:var(--text-2);
  border:1.5px solid var(--border-2); border-radius:var(--r-pill);
  padding:9px 18px; font-weight:var(--fw-semi); cursor:pointer;
  transition:all var(--dur-fast); }
.secondary:hover{ border-color:var(--accent); color:var(--accent-strong); background:var(--accent-light); }
.secondary:focus-visible{ outline:none; box-shadow:0 0 0 3px var(--accent-ring); }
```

### Chips — .filter-chip / .tag-*
```css
.filter-chip,.chip,.tag-*{ display:inline-flex; align-items:center; gap:6px;
  padding:6px 13px; border-radius:var(--r-pill);
  font-size:var(--fs-sm); font-weight:var(--fw-semi);
  background:var(--surface-2); color:var(--text-2);
  border:1.5px solid var(--border); white-space:nowrap;
  transition:all var(--dur-fast) var(--ease-out); }
.filter-chip .dot{ width:8px; height:8px; border-radius:50%; }
.filter-chip:hover{ border-color:var(--border-2); }
.filter-chip.active,.filter-chip[aria-pressed="true"]{
  background:var(--accent-light); border-color:var(--accent); color:var(--accent-strong); }
.filter-chip:focus-visible{ outline:none; box-shadow:0 0 0 3px var(--accent-ring); }
```

### .modal-card → see §5 (bottom-sheet on mobile). Cream surface, `--r-2xl`, warm `--shadow-lg`.

### .field inputs
```css
.field label{ font-size:var(--fs-xs); font-weight:var(--fw-bold); color:var(--muted);
  letter-spacing:.04em; margin-block-end:5px; display:block; }
.field input,.field select,.field textarea{
  width:100%; background:var(--surface); color:var(--text);
  border:1.5px solid var(--border-2); border-radius:var(--r-md);
  padding:10px 13px; font-size:var(--fs-body); font-family:var(--font-sans);
  transition:border-color var(--dur-fast), box-shadow var(--dur-fast); }
.field input:focus,.field select:focus,.field textarea:focus{
  outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-ring); }
.field.invalid input{ border-color:var(--expense); animation:shake .32s var(--ease-out); }
```

---

## 5) Mobile modals → bottom-sheets (<600px)

Formalizes design-spec.md §4d. Applies to **both** the generic `.modal-card`/`.modal-backdrop` (lines 709–723) **and** the JS-built mobile edit modal (~5816) — give the edit modal the same `.modal-card` class so one rule covers both.

```css
.modal-card{ background:var(--surface); border-radius:var(--r-2xl);
  box-shadow:var(--shadow-lg); padding:var(--sp-6);
  width:min(460px, calc(100% - 32px));
  animation:modalIn var(--dur-med) var(--ease-spring); }
.modal-backdrop{ background:rgba(58,50,42,.45); backdrop-filter:blur(3px); }

@media (max-width:600px){
  .modal-backdrop.open{ align-items:flex-end; }       /* dock to bottom */
  .modal-card{
    width:100%; border-radius:var(--r-2xl) var(--r-2xl) 0 0;   /* rounded TOP corners */
    padding-block-end:max(var(--sp-6), calc(var(--sp-6) + env(safe-area-inset-bottom)));
    animation:sheetUp var(--dur-med) var(--ease-out);
    max-height:92dvh; overflow-y:auto;
  }
  .modal-card::before{                                  /* drag handle / grabber */
    content:""; display:block; width:38px; height:4px; border-radius:2px;
    background:var(--border-2); margin:0 auto var(--sp-4);
  }
}
@keyframes modalIn{ from{opacity:0; transform:translateY(8px) scale(.98)} to{opacity:1; transform:none} }
@keyframes sheetUp{ from{transform:translateY(100%)} to{transform:none} }
```
- **Slide-up** via `sheetUp`. Closing: add `.is-closing` → reverse transform, then remove on `animationend`.
- **Drag-to-dismiss** (optional, JS): track `touchstart/move/end` on `.modal-card`, translateY follows finger, dismiss past ~40% height. Pure enhancement; tap-backdrop and the ✕ button remain.
- **More sheet** (§1) reuses the identical pattern (`.more-sheet` = a `.modal-card` variant).
- A11y: focus-trap, Esc closes, restore focus to trigger.

---

## 6) Empty states — botanical

Pattern: centered inline-SVG botanical illustration (line-art, `--muted`/`--accent` strokes) + warm Hebrew copy + optional CTA. One reusable block, three contexts.

```html
<div class="empty-state">
  <svg class="empty-art" viewBox="0 0 120 120" aria-hidden="true"><!-- illustration --></svg>
  <p class="empty-title">אין הוצאות החודש</p>
  <p class="empty-sub">הגן עוד ריק — הוסיפו את ההוצאה הראשונה.</p>
  <button class="primary-cta" onclick="document.getElementById('addExpenseBtn').click()">הוספת הוצאה</button>
</div>
```
```css
.empty-state{ display:flex; flex-direction:column; align-items:center; text-align:center;
  gap:var(--sp-3); padding:var(--sp-10) var(--sp-5); }
.empty-art{ width:96px; height:96px; opacity:.9; stroke:var(--accent); fill:none; stroke-width:1.4; }
.empty-title{ font-size:var(--fs-h3); font-weight:var(--fw-bold); color:var(--text); }
.empty-sub{ font-size:var(--fs-sm); color:var(--muted); max-width:30ch; }
```

| Context | Illustration | Title | Sub |
|---------|--------------|-------|-----|
| No expenses this month (Expenses list) | empty terracotta pot with soil | אין הוצאות החודש | הגן עוד ריק — הוסיפו את ההוצאה הראשונה. |
| No income (Income tab) | watering can, no drops | עדיין לא הוזנו הכנסות | הוסיפו מקור הכנסה כדי להשקות את התקציב. |
| No settlements (Shared, settled) | two balanced leaves on a sprig | הכל מאוזן | אין חוב פתוח בין רז לשירה כרגע. ✓ |

Use `--income` stroke for the "settled/balanced" positive state, `--muted` for neutral-empty.

---

## 7) Forecast chart — 5th `#chartTypeSelect` option

Add `<option value="forecast">תחזית סוף חודש</option>` to `#chartTypeSelect` (line 1209–1214). Implements design-spec.md §6 with botanic colors read live from CSS vars.

- **Solid line = בפועל** (actual daily running balance, start-of-month → today): `borderColor:getCss('--accent')` (sage), `borderWidth:2.5`, `backgroundColor:getCss('--dv-1-soft')`, `fill:true`, `tension:.35`, `pointRadius:0`.
- **Dashed line = תחזית** (today → month-end, projected by avg daily burn / known recurring): `borderColor:getCss('--wood')` (walnut), `borderWidth:2`, `borderDash:[6,5]`, `fill:false`, `tension:.35`.
- **Today join:** actual series' last real point `pointRadius:4` accent fill (a "bud"); dashed series starts at the same index so the two visually connect.
- **Axes (RTL §7):** Y axis `position:'right'` (leading edge), X axis LTR (past→future), grid `getCss('--border')`, tooltips `rtl:true, textDirection:'rtl'`.
- **Live theming:** colors pulled via `getCss()` so dark mode recolors for free — re-read + `chart.update()` on theme toggle.
- **Data source:** reads existing expense/income + `getDisplayedClosingBalance`. **Do NOT alter the balance/forecast calc functions** — render their output only (project iron rule).
- Forecast **bento tile** (§2 #3) links here: value = projected closing (count-up), sub = "בקצב הנוכחי, צפי לסוף החודש" + up/down chip.

---

## 8) RTL rules (inherit design-spec.md §7 verbatim)
Logical props only; numerals/last-4/dates/`%`/`₪` in `direction:ltr` boxes; charts X-axis LTR + Y-axis right + `rtl:true` tooltips; mirror only navigational chevrons (`scaleX(-1)`), never trend arrows or the plant motifs. All new CSS above already follows this.

## 9) Effort / phasing
1. **Tokens (§0)** — swap palette, M, zero risk (names unchanged). Biggest instant lift.
2. **Hero finish (§3)** — reskin existing hero + plant motif, S.
3. **Bottom tab bar (§1)** — new nav, M; reuses tab router, no JS rewrite.
4. **Bento + category garden (§2)** — M–L.
5. **Components (§4) + bottom-sheets (§5)** — M.
6. **Empty states (§6)** — S.
7. **Forecast chart (§7)** — L; render-only, don't touch calc.

All on `expense-app-v37-demo.html` first → iPhone check → Raz approves → promote to v37. Back up JSON before any promotion.
