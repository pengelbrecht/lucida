---
name: lucida
description: Build professional slide decks from YAML and export to HTML or PDF. Use when users want to create presentations, slide decks, board decks, pitch decks, or quarterly reviews. Also use when users want to modify an existing Lucida deck, add slides, change themes, add logos, or export slides to PDF. Triggers on "create a deck", "make slides", "build a presentation", "quarterly review deck", "board deck", "pitch deck", "export slides to PDF", "lucida", or any task involving structured slide content.
allowed-tools: Bash(npx lucida:*), Bash(node:*)
---

# Lucida

YAML-native slide deck builder. Content lives in `.slides.yaml` files, themes control all visual styling, and the CLI produces self-contained HTML or 16:9 PDF.

## Quick Start

```bash
npx lucida build deck.slides.yaml           # → deck-slides.html
npx lucida pdf deck.slides.yaml             # → deck-slides.html + deck-slides.pdf
npx lucida pdf deck.slides.yaml --open      # build + open PDF
npx lucida build content/*.slides.yaml      # batch build
```

Output lands in the current working directory. HTML files are fully self-contained (all CSS, JS, and font imports inlined). PDF requires Playwright — install once with `npx playwright install chromium`.

## Design Philosophy

Lucida deliberately breaks the "one idea per slide" convention. Traditional presentation advice says to minimize text and use big images. Lucida takes the opposite approach: **information-dense slides that respect the audience's intelligence.**

This works because Lucida decks are built for contexts where the audience wants depth — board meetings, analyst presentations, strategy reviews, data-driven recommendations. The audience is reading, not passively watching. A single Lucida slide often carries a data table, 2-3 interpretive callouts, and stat boxes — the equivalent of 3-4 traditional slides, but better because the data and its interpretation live side by side.

The key principles:
- **Titles are insights, not labels.** "ARR grew 50% QoQ — driven by enterprise" not "Revenue Overview"
- **Never present data without interpretation.** Every table gets callouts explaining what matters.
- **Colors encode meaning.** Green = positive, red = problem, amber = caution, navy = strategic context, gold = opportunity.
- **Narrative arc matters.** Hero → data → deep dives → risks → priorities → close.
- **Variants create rhythm.** Most slides are default; hero opens, dark closes, alert signals risk, warm provides visual variety.

For the full guide on writing compelling decks, read `references/slide-craft.md`.

## Reading Strategy

Read this file first. Only read reference docs when needed:
- Writing deck content? → Read `references/slide-craft.md` first for narrative and design guidance
- Need component syntax? → This file covers all components
- Creating a custom theme? → `references/themes.md`
- Need a starter template? → `examples/starter-deck.md`

## Content Format

Every deck is a single YAML file with two top-level keys:

```yaml
meta:
  title: "Deck Title"
  theme: aurora              # theme name (resolves to themes/<name>.yaml)
  footer: "Company · Q4 2025"
  lang: en

slides:
  - variant: hero
    title: "Welcome"
    # ... slide content
```

### Meta Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | yes | HTML `<title>` and deck identifier |
| `theme` | yes | Theme file name (without `.yaml`) |
| `footer` | no | Text shown in bottom nav bar |
| `lang` | no | HTML lang attribute (default: `da`) |
| `custom_css` | no | Raw CSS injected after all theme/component styles |

## Slide Structure

Each slide is a YAML object in the `slides` array:

```yaml
- variant: hero              # optional: hero, dark, warm, alert
  label: "Section Name"      # small uppercase label above title
  title: "Slide Title"       # main heading
  title_style: "font-size:52px;"  # optional inline CSS
  subtitle: "Explanatory text"
  subtitle_style: "..."
  # ... then components (kpis, table, bullets, etc.)
  # ... or layout with columns
```

### Variants

Variants change the slide's background and text color. Defined in the theme:

| Variant | Typical use |
|---------|-------------|
| *(none)* | Default light background |
| `hero` | Title/opening slides — bold gradient, white text |
| `dark` | Closing/summary slides — dark gradient, white text |
| `warm` | Soft tinted background for variety |
| `alert` | Light red/pink for risk or warning slides |

### Text Formatting

Inline formatting works in any text field (titles, subtitles, bullet text, table cells):

| Syntax | Result |
|--------|--------|
| `**bold text**` | **bold text** |
| `text{.green}` | Colored text using theme CSS variable |
| `--` | en-dash (–) |
| `---` | em-dash (—) |
| `&entity;` | HTML entities passed through (`&middot;`, `&rarr;`, etc.) |

## Components

Components are the building blocks of slide content. They can appear at the slide level, inside columns, inside cards, or nested in content arrays.

### KPIs

Large numbers with labels — ideal for hero slides.

```yaml
kpis:
  - value: "$10.2M"
    label: "ARR"
  - value: "130%"
    label: "net dollar retention"
  - value: "94%"
    label: "gross margin"
```

### Table

Data tables with optional row highlighting and cell formatting.

```yaml
table:
  headers: ["Segment", "ARR", "Growth"]
  rows:
    - ["Enterprise", "$5.8M", "+68%"]                        # simple row
    - row: ["Mid-Market", "$2.9M", "+41%"]                   # row with options
      highlight: green                                        # tints row background
      style: "border-top:2px solid var(--border);"           # custom CSS
    - ["SMB", {text: "$1.5M", color: red, bold: true}, "+12%"]  # formatted cell
```

**Cell formatting** — use a dict instead of a string:
- `text` or `value`: display text
- `color`: theme color name (e.g., `green`, `red`, `primary`)
- `bold`: true for font-weight:600
- `style`: raw CSS string

### Bullets

Bullet list with optional sub-text.

```yaml
bullets:
  - text: "Main point"
    sub: "Supporting detail"
  - text: "Another point"
```

### Callout

Colored info/alert box with title and body text.

```yaml
callout:
  color: green          # primary, green, gold, red, amber, navy
  title: "Key insight"
  text: "Explanation here."
  style: "margin-top:16px;"   # optional
```

### Stat Boxes

Row of bordered boxes with big numbers.

```yaml
stat_boxes:
  - value: "$10.2M"
    label: "total ARR"
    color: green        # optional: colors the value
  - value: "528"
    label: "customers"
```

### Bar Chart

Horizontal bars for simple comparisons.

```yaml
bar_chart:
  bars:
    - label: "Q1"
      width: "32%"
      value: "$3.2M"
      color: "var(--primary-light)"
    - label: "Q4"
      width: "100%"
      value: "$10.2M"
      color: "var(--primary)"
```

Bars support `ghost` overlays for before/after comparisons:
```yaml
    - label: "Product A"
      width: "65%"
      value: "65%"
      color: green
      ghost:
        width: "80%"
        color: amber
```

### Donut Chart

Circular composition chart — shows how parts make up a whole.

```yaml
donut_chart:
  size: 120             # optional, px (default 120)
  segments:
    - value: 57
      color: green
      label: "Enterprise"
    - value: 28
      color: primary
      label: "Mid-Market"
    - value: 15
      color: amber
      label: "SMB"
```

Values are percentages (should sum to ~100). Each segment gets a `display` field to override the legend value (e.g., `display: "$5.8M"` instead of `"57%"`).

### Line Chart

SVG-based trend chart — shows change over time.

```yaml
line_chart:
  height: 120           # optional, px (default 120)
  lines:
    - label: "Revenue"
      color: green
      points: [3.2, 4.8, 6.8, 10.2]
    - label: "Costs"
      color: red
      points: [2.8, 3.4, 4.1, 5.2]
  x_labels: ["Q1", "Q2", "Q3", "Q4"]
```

Lines auto-scale to the data range. Multiple lines share the same scale. Set `fill: false` on a line to disable the subtle area fill.

### Summary Grid

Three-column grid of big numbers — works well on dark variant slides.

```yaml
summary_grid:
  items:
    - value: "$10.2M"
      label: "ARR"
      color: green
    - value: "130%"
      label: "NRR"
      color: gold
    - value: "5.2x"
      label: "LTV:CAC"
  total:                  # optional bottom row
    label: "Near break-even"
    value: "$40K net burn"
```

### Quadrant Grid

2×2 grid — great for competitive analysis, SWOT, or categorized lists.

```yaml
quadrant_grid:
  - title: "Strengths"
    bg: "#ecfdf5"
    border: "#a7f3d0"
    title_color: "var(--green-dark)"
    items:
      - "**Feature A** — 9-month head start"
      - "**API flexibility** — developers choose us 3:1"
  - title: "Weaknesses"
    bg: "#fff1f2"
    border: "#fecaca"
    title_color: "var(--red)"
    items:
      - "**Mobile** — no native app yet"
```

### Actions

Numbered action badges with impact statements.

```yaml
actions:
  - num: 1
    text: "**Ship the Growth tier** to reduce churn"
    impact: "Target: cut churn from 4.2% to 2.5%"
  - num: 2
    text: "**Double enterprise pipeline**"
    impact: "Target: $8M qualified pipeline"
```

### Raw HTML

Inject arbitrary HTML for custom layouts.

```yaml
html: |
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;">
    <div style="padding:16px;border-radius:8px;background:rgba(255,255,255,0.06);">
      <div style="font-weight:600;">Custom content</div>
    </div>
  </div>
```

## Layouts

### Columns

Two-column or three-column layouts:

```yaml
- title: "Revenue Breakdown"
  layout: cols              # or cols-3
  layout_style: "grid-template-columns: 3fr 2fr;"  # optional custom widths
  columns:
    - card: "Left Card"
      table: { ... }
    - content:
        - callout: { ... }
        - callout: { ... }
```

Each column can be:
- A **card** (has `card` key) — rendered with border, background, padding
- A **content stack** (has `content` key) — vertical flex layout
- A **direct component** — table, callout, etc. directly on the column

### Cards

Cards wrap content in a styled container:

```yaml
- card: "Card Title"        # title shown as small uppercase label
  style: "..."              # optional card CSS
  table: { ... }            # any component(s)
  content:                  # or a content array
    - callout: { ... }
    - stat_boxes: [...]
```

## Themes

Themes are YAML files in the `themes/` directory. The theme specified in `meta.theme` is loaded automatically.

Built-in themes: `aurora`, `navy`, `terracotta`, `wine`, `demo-teal`.

For creating custom themes, read `references/themes.md`.

## Logo

Logos are defined in the theme and appear automatically on every slide. They use `currentColor` in SVG so they adapt to light/dark variant backgrounds.

```yaml
# Icon logo with company name text:
logo:
  svg: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">...</svg>'
  text: "Company Name"

# Wordmark logo (wide text-based logo):
logo:
  style: "height:16px;"
  svg: '<svg viewBox="0 0 252 27" xmlns="http://www.w3.org/2000/svg">...</svg>'
```

The default logo height is 20px, suitable for square icon marks. For wordmarks, set `style` to control the height — the width scales proportionally. The logo renders at 35% opacity on light slides, 55% on dark — present but never competing with content. Position is top-right, aligned with slide padding.

## PDF Export

```bash
npx lucida pdf deck.slides.yaml --open
```

Produces a 16:9 PDF (1280×720px per page) with all backgrounds, colors, and gradients preserved. Requires Playwright with Chromium — install once:

```bash
npx playwright install chromium
```
