#!/usr/bin/env node
// Lucida — slide deck builder. YAML content + YAML theme → standalone HTML / PDF.

import { resolve, dirname, basename } from "path";
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const ROOT = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Text formatting
// ---------------------------------------------------------------------------

function fmt(text: unknown): string {
  if (text == null) return "";
  let s = String(text);
  s = s.replace(/---/g, "&mdash;");
  s = s.replace(/--/g, "&ndash;");
  s = s.replace(/([^{]+)\{\.(\w+)\}/g, '<span style="color:var(--$2)">$1</span>');
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return s;
}

function escHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function esc(text: unknown): string {
  if (text == null) return "";
  let s = escHtml(String(text));
  // restore entities like &mdash; &rarr; &#123;
  s = s.replace(/&amp;(#?\w+;)/g, "&$1");
  return fmt(s);
}

// ---------------------------------------------------------------------------
// Theme loading
// ---------------------------------------------------------------------------

interface Theme {
  cssVars: string;
  fontImport: string;
  variantCss: string;
  topStrip: string;
  logo: { svg?: string; text?: string; style?: string } | null;
}

function loadTheme(themePath: string): Theme {
  const raw = yaml.load(readFileSync(themePath, "utf-8")) as any;

  const colors: Record<string, string> = raw.colors ?? {};
  const fonts = raw.fonts ?? {};
  const variants: Record<string, any> = raw.variants ?? {};
  const decorations = raw.decorations ?? {};
  const logo = raw.logo ?? null;

  // CSS custom properties
  const props: string[] = [];
  for (const [key, val] of Object.entries(colors)) {
    props.push(`--${key.replace(/_/g, "-")}: ${val};`);
  }
  if (fonts.body) props.push(`--font-body: ${fonts.body};`);
  if (fonts.heading) props.push(`--font-heading: ${fonts.heading};`);

  const topStrip: string = decorations.top_strip ?? "";
  if (topStrip) props.push(`--top-strip: ${topStrip};`);

  const cssVars = `:root {\n${props.map((p) => `    ${p}`).join("\n")}\n}`;

  const fontImport = fonts.import_url
    ? `@import url('${fonts.import_url}');`
    : "";

  const variantParts: string[] = [];
  for (const [name, v] of Object.entries(variants)) {
    const rules: string[] = [];
    if (v.background) rules.push(`background: ${v.background};`);
    if (v.color) rules.push(`color: ${v.color};`);
    if (rules.length) variantParts.push(`.slide-${name} { ${rules.join(" ")} }`);
  }

  return {
    cssVars,
    fontImport,
    variantCss: variantParts.join("\n"),
    topStrip,
    logo,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveColor(raw: string | undefined, fallback = "primary"): string {
  const c = raw ?? fallback;
  if (c.startsWith("var(") || c.startsWith("#")) return c;
  return `var(--${c})`;
}

// ---------------------------------------------------------------------------
// Component renderers
// ---------------------------------------------------------------------------

function renderKpis(kpis: any[]): string {
  const items = kpis.map(
    (k) =>
      `<div class="kpi-item"><div class="kpi-value">${esc(k.value)}</div><div class="kpi-label">${esc(k.label)}</div></div>`
  );
  return `<div class="kpi-row">${items.join("")}</div>`;
}

function renderTable(table: any): string {
  const headers: any[] = table.headers ?? [];
  const rows: any[] = table.rows ?? [];

  const parts: string[] = ["<table>"];
  if (headers.length) {
    parts.push("<thead><tr>");
    for (const h of headers) parts.push(`<th>${esc(h)}</th>`);
    parts.push("</tr></thead>");
  }

  parts.push("<tbody>");
  for (const row of rows) {
    let highlight: string | null = null;
    let rowStyle = "";
    let cells: any[] = row;

    if (row && typeof row === "object" && !Array.isArray(row)) {
      cells = row.row ?? [];
      highlight = row.highlight ?? null;
      rowStyle = row.style ?? "";
    }

    if (highlight) rowStyle = `background:var(--${highlight}-light);${rowStyle}`;
    const styleAttr = rowStyle ? ` style="${rowStyle}"` : "";
    parts.push(`<tr${styleAttr}>`);

    for (const cell of cells) {
      let cellText: unknown = cell;
      let cellStyle = "";
      if (cell && typeof cell === "object") {
        cellText = cell.text ?? cell.value ?? "";
        if (cell.color) cellStyle += `color:var(--${cell.color});`;
        if (cell.bold) cellStyle += "font-weight:600;";
        if (cell.style) cellStyle += cell.style;
      }
      const sa = cellStyle ? ` style="${cellStyle}"` : "";
      parts.push(`<td${sa}>${esc(cellText)}</td>`);
    }
    parts.push("</tr>");
  }
  parts.push("</tbody></table>");
  return parts.join("");
}

function renderCallout(callout: any): string {
  const color = callout.color ?? "primary";
  const style = callout.style ? ` style="${callout.style}"` : "";
  return `<div class="callout callout-${color}"${style}><h5>${esc(callout.title)}</h5><p>${esc(callout.text)}</p></div>`;
}

function renderStatBoxes(statBoxes: any[]): string {
  const items = statBoxes.map((sb) => {
    let style = sb.style ?? "";
    if (sb.border_color) style = `border-color:var(--${sb.border_color});${style}`;

    const colorStyle = sb.color ? `color:var(--${sb.color});` : "";
    const detail = sb.detail
      ? `<div class="stat-detail">${esc(sb.detail)}</div>`
      : "";

    return (
      `<div class="stat-box" style="flex:1;${style}">` +
      `<div class="stat-value" style="font-size:28px;${colorStyle}">${esc(sb.value)}</div>` +
      `<div class="stat-label">${esc(sb.label)}</div>` +
      detail +
      `</div>`
    );
  });
  return `<div style="display:flex;gap:12px;">${items.join("")}</div>`;
}

function renderBarChart(barChart: any): string {
  const parts: string[] = [];
  for (const bar of barChart.bars ?? []) {
    const color = resolveColor(bar.color);
    const width = bar.width ?? "0%";
    const vcStyle = bar.value_color ? `color:${resolveColor(bar.value_color)};` : "";

    let tracks = `<div class="bar-track"><div class="bar-fill" style="width:${width};background:${color};"></div></div>`;
    if (bar.ghost) {
      const gc = resolveColor(bar.ghost.color, "amber");
      tracks =
        `<div class="bar-track"><div class="bar-fill" style="width:${bar.ghost.width};background:${gc};opacity:0.4;"></div></div>` +
        `<div class="bar-track" style="margin-left:-100%;"><div class="bar-fill" style="width:${width};background:${color};"></div></div>`;
    }

    parts.push(
      `<div class="bar-row">` +
        `<div class="bar-label">${esc(bar.label ?? "")}</div>` +
        tracks +
        `<div class="bar-value" style="${vcStyle}">${esc(bar.value ?? "")}</div>` +
        `</div>`
    );
  }
  return parts.join("");
}

function renderDonutChart(donut: any): string {
  const segments: any[] = donut.segments ?? [];
  const size = donut.size ?? 120;
  const hole = Math.round(size * 0.32);

  let cumulative = 0;
  const gradientParts: string[] = [];
  for (const seg of segments) {
    const val = Number(seg.value) || 0;
    const color = resolveColor(seg.color);
    const start = cumulative;
    cumulative += val;
    gradientParts.push(`${color} ${start}% ${cumulative}%`);
  }

  const gradient = `conic-gradient(${gradientParts.join(", ")})`;
  const mask = `radial-gradient(circle, transparent ${hole}px, black ${hole + 1}px)`;

  const legendItems = segments.map((seg: any) => {
    const color = resolveColor(seg.color);
    const displayVal = seg.display ?? `${seg.value}%`;
    return (
      `<div class="donut-legend-item">` +
      `<div class="donut-legend-dot" style="background:${color}"></div>` +
      `<span>${esc(seg.label ?? "")}</span>` +
      `<span class="donut-legend-value">${esc(displayVal)}</span>` +
      `</div>`
    );
  });

  return (
    `<div class="donut-chart">` +
    `<div class="donut-ring" style="width:${size}px;height:${size}px;background:${gradient};-webkit-mask:${mask};mask:${mask};"></div>` +
    `<div class="donut-legend">${legendItems.join("")}</div>` +
    `</div>`
  );
}

function renderLineChart(chart: any): string {
  const lines: any[] = chart.lines ?? [];
  const xLabels: any[] = chart.x_labels ?? [];
  const height = chart.height ?? 120;
  const vbWidth = 400;

  // Collect all values for scaling
  const allValues: number[] = [];
  for (const line of lines) {
    for (const p of line.points ?? []) allValues.push(Number(p));
  }
  if (!allValues.length) return "";

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const pad = range * 0.12;

  const mapY = (v: number) =>
    height - ((v - min + pad) / (range + pad * 2)) * height;

  const svgParts: string[] = [];

  // Subtle horizontal grid lines
  const gridSteps = 3;
  for (let i = 0; i <= gridSteps; i++) {
    const y = (i / gridSteps) * height;
    svgParts.push(
      `<line x1="0" y1="${y}" x2="${vbWidth}" y2="${y}" stroke="var(--border)" stroke-width="0.5" opacity="0.6"/>`
    );
  }

  const legendItems: string[] = [];

  for (const line of lines) {
    const points: number[] = (line.points ?? []).map(Number);
    const color = resolveColor(line.color);

    const coords = points.map((v, i) => {
      const x =
        points.length > 1 ? (i / (points.length - 1)) * vbWidth : vbWidth / 2;
      return `${x.toFixed(1)},${mapY(v).toFixed(1)}`;
    });

    // Area fill
    if (line.fill !== false) {
      svgParts.push(
        `<polygon points="${coords.join(" ")} ${vbWidth},${height} 0,${height}" fill="${color}" opacity="0.07"/>`
      );
    }

    // Line
    svgParts.push(
      `<polyline points="${coords.join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    );

    // Dots
    for (const c of coords) {
      const [cx, cy] = c.split(",");
      svgParts.push(`<circle cx="${cx}" cy="${cy}" r="3" fill="${color}"/>`);
    }

    legendItems.push(
      `<div class="line-chart-legend-item">` +
      `<div class="donut-legend-dot" style="background:${color}"></div>` +
      `<span>${esc(line.label ?? "")}</span>` +
      `</div>`
    );
  }

  const labelsHtml = xLabels.length
    ? `<div class="line-chart-labels">${xLabels.map((l: any) => `<span>${esc(l)}</span>`).join("")}</div>`
    : "";

  const legendHtml =
    legendItems.length > 1
      ? `<div class="line-chart-legend">${legendItems.join("")}</div>`
      : "";

  return (
    `<div class="line-chart">` +
    `<svg viewBox="0 0 ${vbWidth} ${height}" preserveAspectRatio="none">${svgParts.join("")}</svg>` +
    labelsHtml +
    legendHtml +
    `</div>`
  );
}

function renderBullets(bullets: any[]): string {
  const items = bullets.map((b) => {
    const text = typeof b === "object" ? b.text ?? "" : String(b);
    const sub = typeof b === "object" ? b.sub ?? "" : "";
    const subHtml = sub ? `<span class="sub">${esc(sub)}</span>` : "";
    return `<li><strong>${esc(text)}</strong>${subHtml}</li>`;
  });
  return `<ul class="bullet-list">${items.join("")}</ul>`;
}

function renderSummaryGrid(sg: any): string {
  const items = (sg.items ?? []).map((item: any) => {
    const valStyle = item.color ? ` style="color:var(--${item.color})"` : "";
    return (
      `<div class="summary-item">` +
      `<div class="summary-item-value"${valStyle}>${esc(item.value)}</div>` +
      `<div class="summary-item-label">${esc(item.label)}</div>` +
      `</div>`
    );
  });

  let total = "";
  if (sg.total) {
    total =
      `<div class="summary-total">` +
      `<span class="summary-total-label">${esc(sg.total.label)}</span>` +
      `<span class="summary-total-value">${esc(sg.total.value)}</span>` +
      `</div>`;
  }

  return `<div class="summary-grid">${items.join("")}</div>${total}`;
}

function renderQuadrantGrid(qg: any[]): string {
  const parts: string[] = ['<div class="quadrant-grid">'];
  for (const q of qg) {
    let style = "";
    if (q.bg) style += `background:${q.bg};`;
    if (q.border) style += `border:1px solid ${q.border};`;
    const h4Style = q.title_color ? ` style="color:${q.title_color}"` : "";

    const itemsHtml = (q.items ?? [])
      .map((item: any) => {
        if (typeof item === "object") {
          const sa = item.style ? ` style="${item.style}"` : "";
          return `<li${sa}>${esc(item.text)}</li>`;
        }
        return `<li>${esc(item)}</li>`;
      })
      .join("");

    parts.push(
      `<div class="quadrant" style="${style}">` +
        `<h4${h4Style}>${esc(q.title ?? "")}</h4>` +
        `<ul>${itemsHtml}</ul>` +
        `</div>`
    );
  }
  parts.push("</div>");
  return parts.join("");
}

function renderActions(actions: any[]): string {
  return actions
    .map((a, i) => {
      const num = a.num ?? i + 1;
      const impactHtml = a.impact
        ? `<span class="action-impact">${esc(a.impact)}</span>`
        : "";
      return (
        `<div class="action-badge">` +
        `<span class="action-num">${num}</span>` +
        `<span class="action-text">${esc(a.text)} ${impactHtml}</span>` +
        `</div>`
      );
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Composite renderers
// ---------------------------------------------------------------------------

const COMPONENT_KEYS = [
  "callout", "table", "stat_boxes", "bar_chart", "donut_chart", "line_chart",
  "kpis", "bullets", "actions", "summary_grid", "html",
] as const;

function renderComponent(key: string, data: any): string {
  switch (key) {
    case "callout":     return renderCallout(data);
    case "table":       return renderTable(data);
    case "stat_boxes":  return renderStatBoxes(data);
    case "bar_chart":   return renderBarChart(data);
    case "donut_chart": return renderDonutChart(data);
    case "line_chart":  return renderLineChart(data);
    case "kpis":        return renderKpis(data);
    case "bullets":     return renderBullets(data);
    case "actions":     return renderActions(data);
    case "summary_grid": return renderSummaryGrid(data);
    case "html":        return data;
    default:            return "";
  }
}

function renderContentItem(item: any): string {
  if (typeof item === "string") return `<p>${esc(item)}</p>`;
  if (!item || typeof item !== "object") return "";

  const parts: string[] = [];
  for (const key of COMPONENT_KEYS) {
    if (key in item) parts.push(renderComponent(key, item[key]));
  }
  return parts.join("");
}

function renderCard(cardData: any): string {
  if (typeof cardData === "string")
    return `<div class="s-card"><h4>${esc(cardData)}</h4></div>`;

  const title: string = cardData.card ?? cardData.title ?? "";
  const style = cardData.style ? ` style="${cardData.style}"` : "";

  const inner: string[] = [];
  if (title) {
    const h4Style = cardData.title_style
      ? ` style="${cardData.title_style}"`
      : "";
    inner.push(`<h4${h4Style}>${esc(title)}</h4>`);
  }

  for (const key of COMPONENT_KEYS) {
    if (key in cardData) inner.push(renderComponent(key, cardData[key]));
  }

  for (const item of cardData.content ?? []) {
    inner.push(renderContentItem(item));
  }

  return `<div class="s-card"${style}>${inner.join("")}</div>`;
}

function renderColumn(col: any): string {
  if (typeof col === "string") return `<div>${esc(col)}</div>`;
  if (!col || typeof col !== "object") return "";

  if ("card" in col) return renderCard(col);

  const style = col.style ?? "";

  if ("content" in col) {
    const inner = (col.content as any[]).map(renderContentItem).join("");
    return `<div style="display:flex;flex-direction:column;gap:12px;${style}">${inner}</div>`;
  }

  const parts: string[] = [];
  for (const key of COMPONENT_KEYS) {
    if (key in col) parts.push(renderComponent(key, col[key]));
  }

  if (parts.length) {
    const wrapStyle = style ? ` style="${style}"` : "";
    return `<div${wrapStyle}>${parts.join("")}</div>`;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Slide renderer
// ---------------------------------------------------------------------------

function renderSlide(slide: any, index: number, logoHtml: string): string {
  const variant = slide.variant ?? "";
  const variantClass = variant ? ` slide-${variant}` : "";
  const active = index === 0 ? " active" : "";

  const parts: string[] = [
    `<div class="slide${variantClass}${active}" data-slide="${index}">`,
  ];
  if (logoHtml) parts.push(logoHtml);
  parts.push('<div class="slide-inner">');

  // Header
  if (slide.label)
    parts.push(`<div class="slide-label">${esc(slide.label)}</div>`);

  if (slide.title) {
    const ts = slide.title_style ? ` style="${slide.title_style}"` : "";
    parts.push(`<h2 class="slide-title"${ts}>${esc(slide.title)}</h2>`);
  }

  if (slide.subtitle) {
    const ss = slide.subtitle_style ? ` style="${slide.subtitle_style}"` : "";
    parts.push(`<p class="slide-subtitle"${ss}>${esc(slide.subtitle)}</p>`);
  }

  // Body components
  for (const key of ["kpis", "bullets", "summary_grid", "quadrant_grid", "actions"] as const) {
    if (key in slide) {
      if (key === "quadrant_grid") parts.push(renderQuadrantGrid(slide[key]));
      else parts.push(renderComponent(key, slide[key]));
    }
  }

  // Table at slide level
  if ("table" in slide && !("columns" in slide) && !("layout" in slide))
    parts.push(renderTable(slide.table));

  // Layout: columns
  if (slide.layout === "cols" || slide.layout === "cols-3" || "columns" in slide) {
    const layoutClass = slide.layout ?? "cols";
    const ls = slide.layout_style ? ` style="${slide.layout_style}"` : "";
    parts.push(`<div class="${layoutClass}"${ls}>`);
    for (const col of slide.columns ?? []) parts.push(renderColumn(col));
    parts.push("</div>");
  }

  // Raw HTML
  if ("html" in slide) parts.push(slide.html);

  parts.push("</div>"); // slide-inner
  parts.push("</div>"); // slide
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Full deck assembly
// ---------------------------------------------------------------------------

let _engineCache: { baseCss: string; componentsCss: string; engineJs: string } | null = null;
function getEngineFiles() {
  if (!_engineCache) {
    const engineDir = resolve(ROOT, "engine");
    _engineCache = {
      baseCss: readFileSync(resolve(engineDir, "base.css"), "utf-8"),
      componentsCss: readFileSync(resolve(engineDir, "components.css"), "utf-8"),
      engineJs: readFileSync(resolve(engineDir, "engine.js"), "utf-8"),
    };
  }
  return _engineCache;
}

async function build(contentPath: string): Promise<string> {
  const content = yaml.load(readFileSync(contentPath, "utf-8")) as any;
  const meta = content.meta ?? {};
  const slides: any[] = content.slides ?? [];

  // Resolve theme
  const themeName = meta.theme ?? "navy";
  const themePath = resolve(ROOT, "themes", `${themeName}.yaml`);
  let theme: Theme;
  try {
    theme = loadTheme(themePath);
  } catch {
    console.error(`Error: theme '${themeName}' not found at ${themePath}`);
    process.exit(1);
  }

  // Load engine files (cached across builds)
  const { baseCss, componentsCss, engineJs } = getEngineFiles();

  // Logo HTML
  let logoHtml = "";
  if (theme.logo) {
    const svg = theme.logo.svg ?? "";
    const textSpan = theme.logo.text
      ? `<span class="slide-logo-text">${esc(theme.logo.text)}</span>`
      : "";
    const logoStyle = theme.logo.style
      ? ` style="${theme.logo.style}"`
      : "";
    logoHtml = `<div class="slide-logo"${logoStyle}>${svg}${textSpan}</div>`;
  }

  // Render slides
  const slideHtml = slides.map((s, i) => renderSlide(s, i, logoHtml)).join("\n");

  const total = slides.length;
  const title = meta.title ?? "Slides";
  const footer = meta.footer ?? "";
  const lang = meta.lang ?? "en";
  const stripClass = theme.topStrip ? "" : " top-strip-none";
  const customCss = meta.custom_css ?? "";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <style>
        ${theme.fontImport}

        ${theme.cssVars}

        ${baseCss}

        ${theme.variantCss}

        ${componentsCss}

        ${customCss}
    </style>
</head>
<body>

<div class="top-strip${stripClass}"></div>
<div class="click-left" onclick="prev()"></div>
<div class="click-right" onclick="next()"></div>

<div class="nav-bar">
    <span class="nav-label" id="nav-counter">1 / ${total}</span>
    <div class="nav-progress"><div class="nav-progress-fill" id="nav-fill"></div></div>
    <span class="nav-label" style="text-align:right;">${esc(footer)}</span>
</div>

${slideHtml}

<script>
${engineJs}
</script>

</body>
</html>`;

  // Write output to current working directory
  const outName =
    basename(contentPath).replace(".slides.yaml", "").replace(".slides.yml", "") +
    "-slides.html";
  const outPath = resolve(process.cwd(), outName);
  writeFileSync(outPath, html);
  console.log(`Built: ${outPath}`);
  return outPath;
}

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------

async function launchBrowser(): Promise<any> {
  let chromium: any;
  try {
    const pw = await import("playwright");
    chromium = pw.chromium;
  } catch {
    console.error(`PDF export requires Playwright (chromium browser).

Install with:
  npm install playwright && npx playwright install chromium`);
    process.exit(1);
  }

  try {
    return await chromium.launch();
  } catch {
    console.error(`Playwright is installed but Chromium browser is missing.

Install it with:
  npx playwright install chromium`);
    process.exit(1);
  }
}

async function exportPdf(htmlPath: string, pdfPath: string, browser: any): Promise<void> {
  const page = await browser.newPage();
  await page.goto(`file://${resolve(htmlPath)}`, { waitUntil: "networkidle" });
  await page.pdf({
    path: pdfPath,
    width: "1280px",
    height: "720px",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await page.close();
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const openAfter = args.includes("--open");
  const files = args.slice(1).filter((a) => !a.startsWith("--"));

  if (!command || command === "--help" || command === "-h") {
    console.log(`lucida — slide deck builder

Usage:
  npx lucida build <content.yaml> [...]         Build HTML deck(s)
  npx lucida build <content.yaml> --open        Build and open in browser
  npx lucida pdf   <content.yaml> [...]         Build HTML + export PDF
  npx lucida pdf   <content.yaml> --open        Build PDF and open it

Examples:
  npx lucida build content/saas-quarterly.slides.yaml
  npx lucida build content/*.slides.yaml --open
  npx lucida pdf content/*.slides.yaml --open`);
    process.exit(0);
  }

  if (!files.length) {
    console.error(`Error: no input files. Usage: ./lucida ${command} <file.slides.yaml>`);
    process.exit(1);
  }

  if (command !== "build" && command !== "pdf") {
    console.error(`Unknown command: ${command}. Use 'build' or 'pdf'.`);
    process.exit(1);
  }

  let browser: any = null;
  if (command === "pdf") browser = await launchBrowser();

  try {
    for (const file of files) {
      const htmlPath = await build(file);
      if (command === "pdf") {
        const pdfPath = htmlPath.replace(/\.html$/, ".pdf");
        console.log(`Exporting PDF...`);
        await exportPdf(htmlPath, pdfPath, browser);
        console.log(`PDF:   ${pdfPath}`);
        if (openAfter) execSync(`open "${pdfPath}"`);
      } else if (openAfter) {
        execSync(`open "${htmlPath}"`);
      }
    }
  } finally {
    if (browser) await browser.close();
  }
}

main();
