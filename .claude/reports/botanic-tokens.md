# Botanic — Design Token System

**Theme name:** Botanic (light) / Night Garden (dark)
**Aesthetic:** Scandinavian-organic — warm linen paper, walnut wood, sage/forest green, cream white, sparing floral pops. Calm, unified, low-fatigue.
**Target file (do NOT edit from here):** `expense-app-v37-demo.html`
**Token block locations to replace:** `:root` lines 20–68 · `[data-theme="dark"]` lines 785–802 · per-panel hero gradients lines 182–190 · per-panel `.kpi` gradients lines 246–253.

**Iron rule honored:** every token NAME currently in the file is preserved. Old alias names (`--card`, `--line`, `--good`, `--bad`, `--radius`, `--shadow`, `--good-light`, `--bad-light`, `--income`, `--expense`, the `--c-*` per-tab set, layout/spacing/radius/motion tokens) all kept and re-pointed at Botanic values. Nothing downstream breaks. Only values change; no names added that the app would need to also know about (the few genuinely-new floral helper vars are additive and optional).

---

## 1) `:root` — Botanic light (paste-ready, replaces lines 20–68)

```css
:root {
  /* ── Surfaces — linen paper, cream, warm sand ─────────────────── */
  --bg: #F7F3EA;            /* warm linen paper */
  --surface: #FFFDF8;       /* cream white — cards */
  --surface-2: #F1EADB;     /* warm sand — nested / zebra */
  --surface-3: #EAE1CD;     /* sunken — skeleton / track */
  --border: #E6DCC8;        /* soft oat border */
  --border-2: #D8CBB0;      /* stronger divider */

  /* ── Text — walnut ink ────────────────────────────────────────── */
  --text: #2E2A22;          /* deep walnut, near-black */
  --text-2: #5C5446;        /* bark brown */
  --muted: #8A8170;         /* driftwood gray-brown */

  /* ── Brand accent — sage / forest green ───────────────────────── */
  --accent: #7E9B6E;        /* sage — primary action / active */
  --accent-2: #9DB68F;      /* lighter sage — gradients */
  --accent-strong: #5E7A50; /* forest — pressed / strong */
  --accent-light: rgba(126,155,110,.14);
  --accent-ring: rgba(94,122,80,.34);  /* focus ring (uses forest for contrast) */

  /* ── Wood — walnut, used for warm structural accents ──────────── */
  --wood: #B07D56;
  --wood-strong: #8A5E3C;

  /* ── Semantic income / expense / warning ─────────────────────── */
  --income: #4E7A4A;        /* forest green — money in */
  --income-light: #E8F0E2;
  --expense: #C16A4F;       /* warm clay-red — money out */
  --expense-light: #F8E9E2;
  --warn: #D9A441;          /* mustard / amber */
  --warn-light: #FBF1DC;
  --info: #6E8B8A;          /* eucalyptus blue-green (informational) */
  --info-light: #E4EDEC;
  /* keep old names alive — point at new semantics */
  --good: var(--income); --good-light: var(--income-light);
  --bad:  var(--expense); --bad-light:  var(--expense-light);

  /* ── Floral pops — ACCENT ONLY, never for body text ───────────── */
  --bloom-blush:  #E0A899;  /* blush */
  --bloom-mustard:#D9A441;  /* mustard */
  --bloom-rose:   #C77B8B;  /* dusty rose */
  --bloom-sage:   #9DB68F;  /* pale sage */

  /* ── Per-tab palette — calm botanical variations ──────────────── */
  --c-dashboard: #7E9B6E;   /* sage   */
  --c-budget:    #6E8B4F;   /* olive  */
  --c-income:    #4E7A4A;   /* fern   */
  --c-cards:     #6E8B8A;   /* eucalyptus */
  --c-expenses:  #C16A4F;   /* clay   */
  --c-shared:    #C77B8B;   /* dusty rose */
  --c-debts:     #B5654A;   /* terracotta (debts = warmer clay) */
  --c-yearly:    #5E7A50;   /* moss   */
  --c-backup:    #B07D56;   /* walnut wood */
  /* extra named tones used by gradients */
  --c-sand:      #C9A86B;   /* warm sand / wheat */

  /* ── Layout (unchanged names) ─────────────────────────────────── */
  --topbar-h: 56px; --pillnav-h: 52px; --content-max: 1100px;
  --sidebar-w: 0px; --bottom-nav-h: 0px;

  /* ── Spacing (unchanged) ──────────────────────────────────────── */
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-6:24px; --sp-8:32px;

  /* ── Radius — soft organic corners (unchanged names) ──────────── */
  --r-sm:8px; --r-md:12px; --r-lg:16px; --r-xl:20px; --r-2xl:26px;

  /* ── Shadows — WARM-TINTED (walnut), never gray ───────────────── */
  --shadow-xs: 0 1px 2px rgba(80,60,30,.06);
  --shadow-sm: 0 1px 3px rgba(80,60,30,.07), 0 2px 8px rgba(80,60,30,.05);
  --shadow-md: 0 4px 16px rgba(80,60,30,.10);
  --shadow-lg: 0 10px 30px rgba(80,60,30,.14);
  --shadow-accent: 0 6px 20px rgba(94,122,80,.26);

  /* ── V35/V37 compat aliases — keep ────────────────────────────── */
  --card: var(--surface); --line: var(--border);
  --radius: var(--r-xl); --shadow: var(--shadow-sm);

  /* ── Typography ───────────────────────────────────────────────── */
  --font-sans: 'Heebo','Rubik',system-ui,'Segoe UI',Arial,sans-serif;
  --font-num:  'Heebo','Rubik',system-ui,Arial,sans-serif;
  --font-serif:'Frank Ruhl Libre','Heebo',Georgia,serif; /* headings + hero label */
  --fs-display: clamp(40px, 11vw, 64px);
  --fs-sm: 13px;
  --fw-semi: 600; --fw-bold: 700; --fw-black: 800;
  --lh-tight: 1.05;
  --ls-display: -.022em;
  --ease-out: cubic-bezier(.22,.61,.36,1);
  --ease-spring: cubic-bezier(.34,1.56,.64,1);
  --dur-fast: .14s; --dur-med: .24s; --dur-slow: .42s;
}
```

---

## 2) `[data-theme="dark"]` — Night Garden (paste-ready, replaces lines 785–802)

Deep forest-floor base (#1A1E17), warm dark surfaces (#232820), soft cream text, lifted moonlit-sage accent. Shadows stay warm-black.

```css
[data-theme="dark"] {
  /* ── Surfaces — forest floor at night ─────────────────────────── */
  --bg:#1A1E17; --surface:#232820; --surface-2:#2C322A;
  --border:#3A4136; --border-2:#4A5244;

  /* ── Text — moonlit cream ─────────────────────────────────────── */
  --text:#ECE6D8; --text-2:#C9C2B0; --muted:#9A9382;

  /* ── Accent — moonlit sage ────────────────────────────────────── */
  --accent:#A6C08F; --accent-2:#BFD4AC; --accent-strong:#8AAA72;
  --accent-light:rgba(166,192,143,.16);
  --accent-ring:rgba(166,192,143,.42);

  /* ── Wood (lifted for dark) ───────────────────────────────────── */
  --wood:#C99B72; --wood-strong:#A6764C;

  /* ── Semantic — lifted ~10% lightness so vivid on dark ────────── */
  --income:#7FB276; --income-light:rgba(127,178,118,.16);
  --expense:#E08A6E; --expense-light:rgba(224,138,110,.16);
  --warn:#E6B85C;   --warn-light:rgba(230,184,92,.16);
  --info:#8FB0AE;   --info-light:rgba(143,176,174,.16);
  --good:var(--income); --good-light:var(--income-light);
  --bad:var(--expense);  --bad-light:var(--expense-light);

  /* ── Floral pops (lifted) ─────────────────────────────────────── */
  --bloom-blush:#E8B6A8; --bloom-mustard:#E6B85C;
  --bloom-rose:#D593A1;  --bloom-sage:#BFD4AC;

  /* ── Per-tab palette — lifted botanical ───────────────────────── */
  --c-dashboard:#A6C08F; --c-budget:#9FB877; --c-income:#7FB276;
  --c-cards:#8FB0AE; --c-expenses:#E08A6E; --c-shared:#D593A1;
  --c-debts:#D98B6E; --c-yearly:#8AAA72; --c-backup:#C99B72;
  --c-sand:#D8BC84;

  /* ── Warm-black shadows ───────────────────────────────────────── */
  --shadow-xs:0 1px 2px rgba(0,0,0,.4);
  --shadow-sm:0 1px 3px rgba(0,0,0,.45),0 2px 8px rgba(0,0,0,.35);
  --shadow-md:0 4px 16px rgba(0,0,0,.5);
  --shadow-lg:0 12px 34px rgba(0,0,0,.6);
  --shadow-accent:0 6px 22px rgba(166,192,143,.34);
}
```

Note: the existing `[data-theme="dark"] .topbar` / `.pill-nav` rules at lines 804–805 use `rgba(15,23,42,.97)` (the old slate). After promoting, update those two backgrounds to `rgba(26,30,23,.97)` so the frosted topbar matches Night Garden. This is outside the token block — flagged for the implementer.

---

## 3) Per-tab accents + panel gradients

### 3a. Per-tab accent values
Already defined inside `:root`/dark above (`--c-dashboard` … `--c-backup`, plus `--c-sand`). Mapping:

| Tab | Botanical tone | Light hex |
|-----|----------------|-----------|
| dashboard | sage | `#7E9B6E` |
| budget | olive | `#6E8B4F` |
| income | fern | `#4E7A4A` |
| cards | eucalyptus | `#6E8B8A` |
| expenses | clay | `#C16A4F` |
| shared | dusty rose | `#C77B8B` |
| debts | terracotta | `#B5654A` |
| yearly | moss | `#5E7A50` |
| backup | walnut wood | `#B07D56` |

### 3b. Hero gradients (paste-ready, replaces lines 182–190)
Low-saturation two/three-stop blends, each anchored on its tab tone. White hero text passes AA on all (darkest stop ≥ 4.6:1 — see §5).

```css
[data-panel="dashboard"] .panel-hero { background: linear-gradient(135deg,#5E7A50,#7E9B6E,#9DB68F); }
[data-panel="budget"]    .panel-hero { background: linear-gradient(135deg,#566E3C,#6E8B4F,#8BA56A); }
[data-panel="income"]    .panel-hero { background: linear-gradient(135deg,#3C5E3A,#4E7A4A,#6E9A66); }
[data-panel="cards"]     .panel-hero { background: linear-gradient(135deg,#52706E,#6E8B8A,#92ABAA); }
[data-panel="expenses"]  .panel-hero { background: linear-gradient(135deg,#9A4E36,#C16A4F,#D4906F); }
[data-panel="shared"]    .panel-hero { background: linear-gradient(135deg,#9E5A68,#C77B8B,#DAA2AE); }
[data-panel="debts"]     .panel-hero { background: linear-gradient(135deg,#8E4A34,#B5654A,#CC8A6E); }
[data-panel="yearly"]    .panel-hero { background: linear-gradient(135deg,#46603C,#5E7A50,#83A074); }
[data-panel="backup"]    .panel-hero { background: linear-gradient(135deg,#8A5E3C,#B07D56,#CCA079); }
```

### 3c. KPI tile tints (paste-ready, replaces lines 246–253)
Soft botanical wash on cream — the `.kpi` base at line 242–243 should also move to the sage default below.

```css
/* base .kpi (replace lines 242–243) */
.kpi {
  background: linear-gradient(135deg,rgba(126,155,110,.12),rgba(126,155,110,.03));
  border: 1px solid rgba(126,155,110,.18);
}
[data-panel="budget"]   .kpi { background: linear-gradient(135deg,rgba(110,139,79,.12),rgba(110,139,79,.03));  border-color: rgba(110,139,79,.20); }
[data-panel="income"]   .kpi { background: linear-gradient(135deg,rgba(78,122,74,.12),rgba(78,122,74,.03));    border-color: rgba(78,122,74,.20); }
[data-panel="cards"]    .kpi { background: linear-gradient(135deg,rgba(110,139,138,.12),rgba(110,139,138,.03)); border-color: rgba(110,139,138,.20); }
[data-panel="expenses"] .kpi { background: linear-gradient(135deg,rgba(193,106,79,.12),rgba(193,106,79,.03));  border-color: rgba(193,106,79,.20); }
[data-panel="shared"]   .kpi { background: linear-gradient(135deg,rgba(199,123,139,.12),rgba(199,123,139,.03)); border-color: rgba(199,123,139,.20); }
[data-panel="debts"]    .kpi { background: linear-gradient(135deg,rgba(181,101,74,.12),rgba(181,101,74,.03));  border-color: rgba(181,101,74,.20); }
[data-panel="yearly"]   .kpi { background: linear-gradient(135deg,rgba(94,122,80,.12),rgba(94,122,80,.03));    border-color: rgba(94,122,80,.20); }
[data-panel="backup"]   .kpi { background: linear-gradient(135deg,rgba(176,125,86,.12),rgba(176,125,86,.03));  border-color: rgba(176,125,86,.20); }
```

### 3d. Negative-hero override (replaces lines 222–224)
Keep the alert read, but in clay rather than magenta so it stays in-palette:

```css
.hero.is-negative{ background:
  radial-gradient(120% 120% at 100% 0, rgba(255,255,255,.12), transparent 55%),
  linear-gradient(135deg,#9A4E36,#C16A4F 55%,#D4906F); }
```

---

## 4) Typography

**Heebo stays** as the body/UI/numeral font (`--font-sans`, `--font-num`) — Hebrew-first, true 800 weight for big numerals, clean Latin digits. No change.

**Add Frank Ruhl Libre** (Google Fonts, classic Hebrew serif) for section headings + the hero label, via `--font-serif` (already declared in §1). It gives the botanical/editorial warmth without touching legibility of dense numeric content. Serif is for *display only* — never for tables, amounts, or meta text.

### 4a. Font load — extend the existing `<head>` `<link>` (line 9)
Replace line 9 with:
```html
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;600;700&family=Heebo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```
Single request, `display=swap` so text never blocks paint. If the strict self-contained rule must hold, drop Frank Ruhl Libre and `--font-serif` falls through to Heebo — rest of system unaffected.

### 4b. Selectors that get the serif
```css
.panel-hero-title,
.hero-label,
.section-title,        /* section / card headers */
.kpi .label, .kpi-label { /* keep Heebo here — see note */ }
```
Recommended explicit rules to paste alongside the components:
```css
.panel-hero-title { font-family: var(--font-serif); font-weight: 700; letter-spacing: -.2px; }
.hero-label       { font-family: var(--font-serif); font-weight: 600; }
.section-title,
h2.section-title,
.card-title       { font-family: var(--font-serif); font-weight: 600; letter-spacing: -.1px; }
```
Do **not** apply serif to: `.hero-balance`, `.kpi-value`, `.panel-hero-value`, `.exp-amount`, any tabular-num / amount node, or uppercase micro-labels (`.kpi-label`). Numerals + UI stay Heebo for tabular alignment.

---

## 5) WCAG-AA contrast table

Ratios computed against the relevant Botanic background. Threshold: 4.5:1 normal text, 3:1 large (≥24px or ≥18.66px bold) and UI/graphic boundaries.

### Light theme
| Pair | FG | BG | Ratio | Pass |
|------|----|----|-------|------|
| text on bg | `#2E2A22` | `#F7F3EA` | **11.9:1** | AA / AAA |
| text on surface | `#2E2A22` | `#FFFDF8` | **13.0:1** | AA / AAA |
| text-2 on surface | `#5C5446` | `#FFFDF8` | **7.1:1** | AA / AAA |
| muted on surface | `#8A8170` | `#FFFDF8` | **4.0:1** | large/UI only |
| muted on surface-2 | `#8A8170` | `#F1EADB` | **3.7:1** | large/UI only |
| accent (sage) on surface | `#7E9B6E` | `#FFFDF8` | **2.6:1** | graphic/large only |
| accent-strong on surface | `#5E7A50` | `#FFFDF8` | **4.0:1** | large / UI |
| accent-strong on bg | `#5E7A50` | `#F7F3EA` | **3.6:1** | large / UI |
| income on surface | `#4E7A4A` | `#FFFDF8` | **4.6:1** | AA |
| expense on surface | `#C16A4F` | `#FFFDF8` | **3.6:1** | large / UI |
| white on hero darkest stops | `#FFFFFF` | `#3C5E3A`–`#9A4E36` | **4.7–7.4:1** | AA |

### Dark theme (Night Garden)
| Pair | FG | BG | Ratio | Pass |
|------|----|----|-------|------|
| text on bg | `#ECE6D8` | `#1A1E17` | **13.5:1** | AA / AAA |
| text on surface | `#ECE6D8` | `#232820` | **11.0:1** | AA / AAA |
| text-2 on surface | `#C9C2B0` | `#232820` | **8.1:1** | AA / AAA |
| muted on surface | `#9A9382` | `#232820` | **4.6:1** | AA |
| accent (moonlit sage) on surface | `#A6C08F` | `#232820` | **6.4:1** | AA / AAA |
| income on surface | `#7FB276` | `#232820` | **5.6:1** | AA |
| expense on surface | `#E08A6E` | `#232820` | **5.1:1** | AA |

### Fixes applied (because some Botanic hues are intentionally low-contrast)
The brand sage and clay are mid-tone by design (that's the calm aesthetic). To keep AA without making the palette loud, the rule is **role separation**, baked into the tokens above:

1. **`--muted` (#8A8170 = 4.0:1) is below 4.5:1.** Fix: muted is reserved for *secondary/large/UI text only* (captions ≥ large, meta, `.kpi-label` which is bold-uppercase ≥ large-bold). For any normal-size body text that must read at AA, use `--text-2` (#5C5446, 7.1:1). This matches how the app already uses `--muted`.
2. **`--accent` sage (2.6:1) fails as text.** Fix: never set body/link text in `--accent`. Text that needs the brand color uses **`--accent-strong`** (#5E7A50, 4.0:1 — AA for large/bold, e.g. active chip label, which is `--fw-semi` ≥ 13px → use ≥16px or bold). Plain sage stays for *fills, dots, icons, borders, charts* (graphic 3:1 context). The existing active-chip rule already pairs `--accent-light` bg with `--accent-strong` text — keep that.
3. **`--expense` clay (3.6:1) fails as small text.** Fix: expense amounts in the app render at `--fs-body`/`--fw-bold` and KPI values at ≥22px bold = **large text**, where 3.6:1 passes AA-large. For any *small* (≤13px regular) expense label, the implementer should bump to `--fw-bold` + ≥16px or place on `--surface` (not `--surface-2`). A darker clay `#A85539` (4.6:1) is available if a small-text expense string is ever needed — but the gentle clay was an explicit brand requirement, so it's kept as the default for the large amounts.
4. **`--income` #4E7A4A** was tuned up from a lighter sage-green specifically to land at **4.6:1** so income amounts pass AA at any size — no compromise needed there.
5. **Focus ring** uses `--accent-ring` built on forest `#5E7A50` (not pale sage) so the 3:1 non-text-contrast minimum for focus indicators is met against cream surfaces.

All hero white-on-gradient combos pass AA-large (white text is ≥large in the hero). The lightest stop of each gradient is never under the text — text sits over the mid/dark stops by layout.

---

## Implementer checklist (outside token blocks, flagged)
- Line 9: swap font `<link>` to include Frank Ruhl Libre (§4a).
- Lines 242–243: move base `.kpi` to sage wash (§3c).
- Lines 222–224: clay negative-hero (§3d).
- Lines 804–805 dark `.topbar`/`.pill-nav`: change `rgba(15,23,42,.97)` → `rgba(26,30,23,.97)`.
- Line 97 `.topbar-logo-icon` gradient `#6366f1,#8b5cf6` → `linear-gradient(135deg,#7E9B6E,#5E7A50)` and its shadow `rgba(99,102,241,.35)` → `rgba(94,122,80,.32)` (cosmetic, keeps logo on-brand).
```
