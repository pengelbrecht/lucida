#!/usr/bin/env python3
"""Slide deck builder — YAML content + YAML theme → standalone HTML."""

import re
import sys
from html import escape
from pathlib import Path

import yaml


# ---------------------------------------------------------------------------
# Text formatting
# ---------------------------------------------------------------------------

def fmt(text):
    """Apply inline formatting to text values.

    - **bold** → <strong>
    - text{.color} → <span style="color:var(--color)">text</span>
    - -- → &ndash;, --- → &mdash;
    - &entity; passed through
    """
    if text is None:
        return ""
    text = str(text)
    # --- before -- (order matters)
    text = text.replace("---", "&mdash;")
    text = text.replace("--", "&ndash;")
    # color spans: text{.red}
    text = re.sub(r'([^{]+)\{\.(\w+)\}', r'<span style="color:var(--\2)">\1</span>', text)
    # bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    return text


def esc(text):
    """HTML-escape then apply inline formatting."""
    if text is None:
        return ""
    text = str(text)
    # Preserve our markup tokens before escaping
    # We escape first, then apply fmt (which produces HTML)
    # But we need to be careful: fmt tokens use **, {.}, --, ---
    # These don't contain HTML-special chars, so escape first is safe.
    text = escape(text)
    # Undo escaping of & in entities we want to keep (e.g. &mdash; &rarr;)
    text = re.sub(r'&amp;(#?\w+;)', r'&\1', text)
    return fmt(text)


# ---------------------------------------------------------------------------
# Theme loading
# ---------------------------------------------------------------------------

def load_theme(theme_path):
    """Load a YAML theme and return (css_vars, font_import, variant_css, top_strip_css, logo)."""
    with open(theme_path) as f:
        theme = yaml.safe_load(f)

    colors = theme.get("colors", {})
    fonts = theme.get("fonts", {})
    variants = theme.get("variants", {})
    decorations = theme.get("decorations", {})
    logo = theme.get("logo")

    # CSS custom properties
    props = []
    for key, val in colors.items():
        css_name = key.replace("_", "-")
        props.append(f"--{css_name}: {val};")

    # Font properties
    if fonts.get("body"):
        props.append(f"--font-body: {fonts['body']};")
    if fonts.get("heading"):
        props.append(f"--font-heading: {fonts['heading']};")

    # Top strip
    top_strip = decorations.get("top_strip", "")
    if top_strip:
        props.append(f"--top-strip: {top_strip};")

    css_vars = ":root {\n" + "\n".join(f"    {p}" for p in props) + "\n}"

    # Font import
    font_import = ""
    if fonts.get("import_url"):
        font_import = f"@import url('{fonts['import_url']}');"

    # Variant CSS
    variant_css_parts = []
    for name, v in variants.items():
        rules = []
        if v.get("background"):
            rules.append(f"background: {v['background']};")
        if v.get("color"):
            rules.append(f"color: {v['color']};")
        if rules:
            variant_css_parts.append(f".slide-{name} {{ {' '.join(rules)} }}")

    variant_css = "\n".join(variant_css_parts)

    return css_vars, font_import, variant_css, top_strip, logo


# ---------------------------------------------------------------------------
# Component renderers
# ---------------------------------------------------------------------------

def render_kpis(kpis):
    """Render a KPI row."""
    items = []
    for kpi in kpis:
        items.append(
            f'<div class="kpi-item">'
            f'<div class="kpi-value">{esc(kpi["value"])}</div>'
            f'<div class="kpi-label">{esc(kpi["label"])}</div>'
            f'</div>'
        )
    return f'<div class="kpi-row">{"".join(items)}</div>'


def render_table(table):
    """Render a table with headers and rows, supporting row highlights and cell formatting."""
    headers = table.get("headers", [])
    rows = table.get("rows", [])

    parts = ['<table>']
    if headers:
        parts.append("<thead><tr>")
        for h in headers:
            parts.append(f"<th>{esc(h)}</th>")
        parts.append("</tr></thead>")

    parts.append("<tbody>")
    for row in rows:
        highlight = None
        row_style = ""
        cells = row

        if isinstance(row, dict):
            cells = row.get("row", [])
            highlight = row.get("highlight")
            row_style = row.get("style", "")

        if highlight:
            row_style = f"background:var(--{highlight}-light);"

        style_attr = f' style="{row_style}"' if row_style else ""
        parts.append(f"<tr{style_attr}>")
        for cell in cells:
            cell_text = cell
            cell_style = ""
            if isinstance(cell, dict):
                cell_text = cell.get("text", cell.get("value", ""))
                if cell.get("color"):
                    cell_style += f"color:var(--{cell['color']});"
                if cell.get("bold"):
                    cell_style += "font-weight:600;"
                if cell.get("style"):
                    cell_style += cell["style"]
            style_attr = f' style="{cell_style}"' if cell_style else ""
            parts.append(f"<td{style_attr}>{esc(cell_text)}</td>")
        parts.append("</tr>")
    parts.append("</tbody></table>")
    return "".join(parts)


def render_callout(callout):
    """Render a callout box."""
    color = callout.get("color", "primary")
    title = callout.get("title", "")
    text = callout.get("text", "")
    style = callout.get("style", "")
    style_attr = f' style="{style}"' if style else ""
    return (
        f'<div class="callout callout-{color}"{style_attr}>'
        f'<h5>{esc(title)}</h5>'
        f'<p>{esc(text)}</p>'
        f'</div>'
    )


def render_stat_boxes(stat_boxes):
    """Render a row of stat boxes."""
    items = []
    for sb in stat_boxes:
        style = sb.get("style", "")
        border_color = sb.get("border_color", "")
        if border_color:
            style = f"border-color:var(--{border_color});{style}"
        style_attr = f' style="{style}"' if style else ""

        value_style = ""
        if sb.get("color"):
            value_style = f' style="color:var(--{sb["color"]})"'
        elif sb.get("font_size"):
            value_style = f' style="font-size:{sb["font_size"]}"'

        detail = ""
        if sb.get("detail"):
            detail = f'<div class="stat-detail">{esc(sb["detail"])}</div>'

        items.append(
            f'<div class="stat-box" style="flex:1;{style}">'
            f'<div class="stat-value" style="font-size:28px;{"color:var(--" + sb["color"] + ");" if sb.get("color") else ""}">{esc(sb["value"])}</div>'
            f'<div class="stat-label">{esc(sb["label"])}</div>'
            f'{detail}'
            f'</div>'
        )
    return f'<div style="display:flex;gap:12px;">{"".join(items)}</div>'


def render_bar_chart(bar_chart):
    """Render horizontal bar chart rows."""
    parts = []
    for bar in bar_chart.get("bars", []):
        color = bar.get("color", "var(--primary)")
        if not color.startswith("var(") and not color.startswith("#"):
            color = f"var(--{color})"
        width = bar.get("width", "0%")
        value_color = bar.get("value_color", "")
        vc_style = f"color:{value_color};" if value_color else ""
        if bar.get("value_color") and not bar["value_color"].startswith("#"):
            vc_style = f"color:var(--{bar['value_color']});"
        # Support overlay bars (ghost + real)
        ghost = bar.get("ghost")
        tracks = f'<div class="bar-track"><div class="bar-fill" style="width:{width};background:{color};"></div></div>'
        if ghost:
            ghost_color = ghost.get("color", "var(--amber)")
            if not ghost_color.startswith("var(") and not ghost_color.startswith("#"):
                ghost_color = f"var(--{ghost_color})"
            tracks = (
                f'<div class="bar-track"><div class="bar-fill" style="width:{ghost["width"]};background:{ghost_color};opacity:0.4;"></div></div>'
                f'<div class="bar-track" style="margin-left:-100%;"><div class="bar-fill" style="width:{width};background:{color};"></div></div>'
            )
        parts.append(
            f'<div class="bar-row">'
            f'<div class="bar-label">{esc(bar.get("label", ""))}</div>'
            f'{tracks}'
            f'<div class="bar-value" style="{vc_style}">{esc(bar.get("value", ""))}</div>'
            f'</div>'
        )
    return "".join(parts)


def render_bullets(bullets):
    """Render a bullet list."""
    items = []
    for b in bullets:
        text = b.get("text", "") if isinstance(b, dict) else str(b)
        sub = b.get("sub", "") if isinstance(b, dict) else ""
        sub_html = f'<span class="sub">{esc(sub)}</span>' if sub else ""
        items.append(f"<li><strong>{esc(text)}</strong>{sub_html}</li>")
    return f'<ul class="bullet-list">{"".join(items)}</ul>'


def render_summary_grid(sg):
    """Render a summary grid (big numbers in columns)."""
    items = []
    for item in sg.get("items", []):
        color = item.get("color", "")
        val_style = f' style="color:var(--{color})"' if color else ""
        items.append(
            f'<div class="summary-item">'
            f'<div class="summary-item-value"{val_style}>{esc(item["value"])}</div>'
            f'<div class="summary-item-label">{esc(item["label"])}</div>'
            f'</div>'
        )

    total = ""
    if sg.get("total"):
        total = (
            f'<div class="summary-total">'
            f'<span class="summary-total-label">{esc(sg["total"]["label"])}</span>'
            f'<span class="summary-total-value">{esc(sg["total"]["value"])}</span>'
            f'</div>'
        )

    return f'<div class="summary-grid">{"".join(items)}</div>{total}'


def render_quadrant_grid(qg):
    """Render a 2x2 quadrant grid."""
    parts = ['<div class="quadrant-grid">']
    for q in qg:
        bg = q.get("bg", "")
        border = q.get("border", "")
        title_color = q.get("title_color", "")
        style = ""
        if bg:
            style += f"background:{bg};"
        if border:
            style += f"border:1px solid {border};"
        h4_style = f' style="color:{title_color}"' if title_color else ""

        items_html = ""
        for item in q.get("items", []):
            if isinstance(item, dict):
                item_style = item.get("style", "")
                style_attr = f' style="{item_style}"' if item_style else ""
                items_html += f'<li{style_attr}>{esc(item["text"])}</li>'
            else:
                items_html += f"<li>{esc(item)}</li>"

        parts.append(
            f'<div class="quadrant" style="{style}">'
            f'<h4{h4_style}>{esc(q.get("title", ""))}</h4>'
            f'<ul>{items_html}</ul>'
            f'</div>'
        )
    parts.append('</div>')
    return "".join(parts)


def render_actions(actions):
    """Render numbered action badges."""
    items = []
    for i, action in enumerate(actions, 1):
        num = action.get("num", i)
        text = action.get("text", "")
        impact = action.get("impact", "")
        impact_html = f'<span class="action-impact">{esc(impact)}</span>' if impact else ""
        items.append(
            f'<div class="action-badge">'
            f'<span class="action-num">{num}</span>'
            f'<span class="action-text">{esc(text)} {impact_html}</span>'
            f'</div>'
        )
    return "".join(items)


def render_content_item(item):
    """Render a single content item (used inside cards and columns)."""
    if isinstance(item, str):
        return f"<p>{esc(item)}</p>"
    if not isinstance(item, dict):
        return ""

    parts = []
    if "callout" in item:
        parts.append(render_callout(item["callout"]))
    if "table" in item:
        parts.append(render_table(item["table"]))
    if "stat_boxes" in item:
        parts.append(render_stat_boxes(item["stat_boxes"]))
    if "bar_chart" in item:
        parts.append(render_bar_chart(item["bar_chart"]))
    if "kpis" in item:
        parts.append(render_kpis(item["kpis"]))
    if "bullets" in item:
        parts.append(render_bullets(item["bullets"]))
    if "actions" in item:
        parts.append(render_actions(item["actions"]))
    if "summary_grid" in item:
        parts.append(render_summary_grid(item["summary_grid"]))
    if "html" in item:
        parts.append(item["html"])
    return "".join(parts)


def render_card(card_data):
    """Render a card wrapping other components."""
    if isinstance(card_data, str):
        return f'<div class="s-card"><h4>{esc(card_data)}</h4></div>'

    title = card_data.get("card", card_data.get("title", ""))
    style = card_data.get("style", "")
    style_attr = f' style="{style}"' if style else ""

    inner = []
    if title:
        h4_style = card_data.get("title_style", "")
        h4_attr = f' style="{h4_style}"' if h4_style else ""
        inner.append(f"<h4{h4_attr}>{esc(title)}</h4>")

    # Render nested content items
    for key in ("table", "stat_boxes", "bar_chart", "kpis", "bullets", "actions",
                "summary_grid", "callout", "html"):
        if key in card_data:
            if key == "table":
                inner.append(render_table(card_data["table"]))
            elif key == "stat_boxes":
                inner.append(render_stat_boxes(card_data["stat_boxes"]))
            elif key == "bar_chart":
                inner.append(render_bar_chart(card_data["bar_chart"]))
            elif key == "kpis":
                inner.append(render_kpis(card_data["kpis"]))
            elif key == "bullets":
                inner.append(render_bullets(card_data["bullets"]))
            elif key == "actions":
                inner.append(render_actions(card_data["actions"]))
            elif key == "summary_grid":
                inner.append(render_summary_grid(card_data["summary_grid"]))
            elif key == "callout":
                inner.append(render_callout(card_data["callout"]))
            elif key == "html":
                inner.append(card_data["html"])

    # Content array (list of content items)
    for item in card_data.get("content", []):
        inner.append(render_content_item(item))

    return f'<div class="s-card"{style_attr}>{"".join(inner)}</div>'


def render_column(col):
    """Render a single column's content. A column can be a card or a stack of content items."""
    if isinstance(col, str):
        return f"<div>{esc(col)}</div>"
    if not isinstance(col, dict):
        return ""

    # If it has a "card" key, render as a card
    if "card" in col:
        return render_card(col)

    # Otherwise render as a stack of content items
    parts = []
    style = col.get("style", "")
    wrapper_style = f' style="{style}"' if style else ""

    # Check for "content" key (list of content items)
    if "content" in col:
        items = col["content"]
        inner = "".join(render_content_item(item) for item in items)
        return f'<div style="display:flex;flex-direction:column;gap:12px;{style}">{inner}</div>'

    # Direct component keys on the column
    for key in ("table", "stat_boxes", "bar_chart", "kpis", "bullets", "actions",
                "summary_grid", "callout", "html"):
        if key in col:
            if key == "callout":
                parts.append(render_callout(col["callout"]))
            elif key == "table":
                parts.append(render_table(col["table"]))
            elif key == "html":
                parts.append(col["html"])
            else:
                parts.append(render_content_item(col))

    if parts:
        return f'<div{wrapper_style}>{"".join(parts)}</div>'
    return ""


# ---------------------------------------------------------------------------
# Slide renderer
# ---------------------------------------------------------------------------

def render_slide(slide, index, logo_html=""):
    """Render a single slide to HTML."""
    variant = slide.get("variant", "")
    variant_class = f" slide-{variant}" if variant else ""
    active = " active" if index == 0 else ""

    parts = [f'<div class="slide{variant_class}{active}" data-slide="{index}">']
    if logo_html:
        parts.append(logo_html)
    parts.append('<div class="slide-inner">')

    # Header: label, title, subtitle
    if slide.get("label"):
        parts.append(f'<div class="slide-label">{esc(slide["label"])}</div>')

    title = slide.get("title", "")
    title_style = slide.get("title_style", "")
    ts_attr = f' style="{title_style}"' if title_style else ""
    if title:
        parts.append(f'<h2 class="slide-title"{ts_attr}>{esc(title)}</h2>')

    if slide.get("subtitle"):
        sub_style = slide.get("subtitle_style", "")
        ss_attr = f' style="{sub_style}"' if sub_style else ""
        parts.append(f'<p class="slide-subtitle"{ss_attr}>{esc(slide["subtitle"])}</p>')

    # Body components (top-level, before any layout)
    for key in ("kpis", "bullets", "summary_grid", "quadrant_grid", "actions"):
        if key in slide and key != "columns":
            if key == "kpis":
                parts.append(render_kpis(slide["kpis"]))
            elif key == "bullets":
                parts.append(render_bullets(slide["bullets"]))
            elif key == "summary_grid":
                parts.append(render_summary_grid(slide["summary_grid"]))
            elif key == "quadrant_grid":
                parts.append(render_quadrant_grid(slide["quadrant_grid"]))
            elif key == "actions":
                parts.append(render_actions(slide["actions"]))

    # Table at slide level (not in a card)
    if "table" in slide and "columns" not in slide and "layout" not in slide:
        parts.append(render_table(slide["table"]))

    # Layout: columns
    if slide.get("layout") in ("cols", "cols-3") or "columns" in slide:
        layout_class = slide.get("layout", "cols")
        layout_style = slide.get("layout_style", "")
        ls_attr = f' style="{layout_style}"' if layout_style else ""
        parts.append(f'<div class="{layout_class}"{ls_attr}>')
        for col in slide.get("columns", []):
            parts.append(render_column(col))
        parts.append('</div>')

    # Raw HTML at slide level
    if "html" in slide:
        parts.append(slide["html"])

    parts.append('</div>')  # slide-inner
    parts.append('</div>')  # slide
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Full deck assembly
# ---------------------------------------------------------------------------

def build(content_path):
    """Build a standalone HTML deck from a content YAML file."""
    content_path = Path(content_path)
    with open(content_path) as f:
        content = yaml.safe_load(f)

    meta = content.get("meta", {})
    slides = content.get("slides", [])

    # Resolve theme
    theme_name = meta.get("theme", "navy")
    theme_dir = Path(__file__).parent / "themes"
    theme_path = theme_dir / f"{theme_name}.yaml"
    if not theme_path.exists():
        print(f"Error: theme '{theme_name}' not found at {theme_path}", file=sys.stderr)
        sys.exit(1)

    css_vars, font_import, variant_css, top_strip, logo = load_theme(theme_path)

    # Load engine files
    engine_dir = Path(__file__).parent / "engine"
    base_css = (engine_dir / "base.css").read_text()
    components_css = (engine_dir / "components.css").read_text()
    engine_js = (engine_dir / "engine.js").read_text()

    # Prepare logo HTML
    logo_html = ""
    if logo:
        svg = logo.get("svg", "")
        text = logo.get("text", "")
        text_span = f'<span class="slide-logo-text">{esc(text)}</span>' if text else ""
        logo_style = logo.get("style", "")
        style_attr = f' style="{logo_style}"' if logo_style else ""
        logo_html = f'<div class="slide-logo"{style_attr}>{svg}{text_span}</div>'

    # Render slides
    slide_html_parts = []
    for i, slide in enumerate(slides):
        slide_html_parts.append(render_slide(slide, i, logo_html))

    total = len(slides)
    title = meta.get("title", "Slides")
    footer = meta.get("footer", "")
    lang = meta.get("lang", "da")

    # Top strip element
    strip_class = "" if top_strip else " top-strip-none"

    # Custom CSS from content
    custom_css = meta.get("custom_css", "")

    # Assemble
    html = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(title)}</title>
    <style>
        {font_import}

        {css_vars}

        {base_css}

        {variant_css}

        {components_css}

        {custom_css}
    </style>
</head>
<body>

<div class="top-strip{strip_class}"></div>
<div class="click-left" onclick="prev()"></div>
<div class="click-right" onclick="next()"></div>

<div class="nav-bar">
    <span class="nav-label" id="nav-counter">1 / {total}</span>
    <div class="nav-progress"><div class="nav-progress-fill" id="nav-fill"></div></div>
    <span class="nav-label" style="text-align:right;">{esc(footer)}</span>
</div>

{"".join(slide_html_parts)}

<script>
{engine_js}
</script>

</body>
</html>"""

    # Write output
    dist_dir = Path(__file__).parent / "dist"
    dist_dir.mkdir(exist_ok=True)
    out_name = content_path.stem.replace(".slides", "") + "-slides.html"
    out_path = dist_dir / out_name
    out_path.write_text(html)
    print(f"Built: {out_path}")
    return out_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: uv run python build.py content/my-deck.slides.yaml", file=sys.stderr)
        sys.exit(1)
    build(sys.argv[1])
