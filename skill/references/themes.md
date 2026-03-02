# Theme Reference

Themes control all visual styling — colors, fonts, decorations, variants, and logos. Each theme is a YAML file in `themes/`.

## Theme Structure

```yaml
name: My Theme

fonts:
  import_url: "https://fonts.googleapis.com/css2?family=..."
  body: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
  heading: "'DM Serif Display', serif"

colors:
  primary: "#1b2a4a"
  primary_light: "#eef1f6"
  primary_mid: "#3d5a8a"
  blue: "#3b82f6"
  blue_light: "#eff6ff"
  gold: "#b8860b"
  gold_light: "#fdf6e3"
  green: "#16a34a"
  green_light: "#f0fdf4"
  green_dark: "#15803d"
  red: "#dc2626"
  red_light: "#fef2f2"
  amber: "#d97706"
  amber_light: "#fffbeb"
  bg: "#faf9f7"
  surface: "#ffffff"
  text: "#1a1a1a"
  text_secondary: "#5a5a5a"
  border: "#e5e5e0"

variants:
  hero:
    background: "linear-gradient(135deg, #0f1a2e 0%, #1b2a4a 40%, #2d4570 100%)"
    color: "white"
  dark:
    background: "linear-gradient(135deg, #111 0%, #1a1a2e 100%)"
    color: "white"
  warm:
    background: "linear-gradient(135deg, #fdf6e3 0%, #fef3cd 100%)"
  alert:
    background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)"

logo:
  svg: '<svg viewBox="0 0 24 24" ...>...</svg>'
  text: "Company Name"

decorations:
  top_strip: "linear-gradient(to right, #008c45 33.33%, #f1f1f1 33.33%, #f1f1f1 66.66%, #cd212a 66.66%)"
```

## Colors

Colors become CSS custom properties. Underscores convert to hyphens: `primary_light` → `--primary-light`.

**Required color roles:**

| Color | Purpose |
|-------|---------|
| `primary` | Main brand color — action badges, bullet dots, progress bar |
| `primary_light` | Tinted background for primary callouts |
| `primary_mid` | Secondary shade — section labels |
| `bg` | Page background |
| `surface` | Card backgrounds |
| `text` | Main body text |
| `text_secondary` | Muted text — labels, subtitles |
| `border` | Lines, card borders, table dividers |

**Semantic colors** — each needs a base + light variant:

| Base | Light | Used for |
|------|-------|----------|
| `green` / `green_light` | Positive indicators, success callouts |
| `red` / `red_light` | Negative indicators, alert callouts |
| `amber` / `amber_light` | Warning indicators |
| `gold` / `gold_light` | Highlight, premium indicators |
| `blue` / `blue_light` | Info indicators |

Colors are referenced in content YAML via `{.color}` syntax in text and `color:` fields on cells and stat boxes.

## Fonts

| Field | Description |
|-------|-------------|
| `import_url` | Google Fonts URL |
| `body` | Font stack for body text |
| `heading` | Font stack for titles, KPI values, stat values |

The heading font is used for large display text. Pair a distinctive serif or display face for headings with a clean sans-serif for body.

## Variants

Variants define background + text color for slide types. Each content YAML slide can set `variant: hero` etc. to use these styles.

Common pattern:
- `hero` — bold gradient for opening slides
- `dark` — deep gradient for closing/summary slides
- `warm` — soft tinted background for variety
- `alert` — light red/pink for risk slides

## Logo

The logo SVG should use `currentColor` so it automatically adapts: dark text on light slides, white on hero/dark slides.

```yaml
logo:
  svg: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.5L21.5 12L12 21.5L2.5 12Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>'
  text: "Nexus AI"
```

For wordmark logos (wide text-based logos), use `style` to override the default 20px height:

```yaml
logo:
  style: "height:16px;"
  svg: '<svg viewBox="0 0 252 27" xmlns="http://www.w3.org/2000/svg">...</svg>'
```

The `style` field sets inline CSS on the logo container. The SVG scales proportionally via `width:auto`.

**Design guidelines for logo SVGs:**
- Use `currentColor` for stroke and fill — never hardcoded colors
- Square icon logos: ViewBox of 24×24 works well (renders at default 20px height)
- Wordmark logos: Set `style: "height:16px;"` (or similar) to control the rendered size
- Keep it simple — it renders small in the top-right corner
- The `text` field renders as tracked-out uppercase next to the mark

## Decorations

`top_strip` renders as a thin 4px gradient bar at the top of every slide. Set to a gradient matching your brand, or omit for no strip.

## Built-in Themes

| Theme | Style | Heading font | Body font |
|-------|-------|-------------|-----------|
| `aurora` | Purple/violet, modern tech | Fraunces (serif) | Space Grotesk |
| `navy` | Navy, classic serif/sans pairing | DM Serif Display | DM Sans |
| `terracotta` | Warm earth tones | DM Serif Display | DM Sans |
| `wine` | Burgundy/wine | DM Serif Display | DM Sans |
| `demo-teal` | Teal/aqua, modern | DM Serif Display | DM Sans |

## Creating a New Theme

1. Copy an existing theme YAML as a starting point
2. Set your color palette (start with `primary`, `bg`, `text`, `border`)
3. Choose fonts from Google Fonts and set `import_url`
4. Define variant gradients that complement your palette
5. Add your logo SVG (use `currentColor`)
6. Save as `themes/my-theme.yaml`
7. Reference in content: `meta.theme: my-theme`
