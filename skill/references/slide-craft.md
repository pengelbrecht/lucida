# Slide Craft — What Makes a Great Deck

This reference captures the principles behind Lucida's best decks. Read this before writing any deck content. The patterns here are what separate a wall of data from a compelling narrative.

## Lucida's Approach: Dense by Design

Lucida breaks common presentation rules — and that's intentional.

Traditional presentation advice says: one idea per slide, minimal text, big images, let the speaker do the talking. That advice is for keynotes and TED talks. Lucida is built for a different context: **board decks, strategy reviews, data analyses, and business recommendations** where the audience is reading, thinking, and making decisions.

In these contexts, sparse slides are actually *worse*. A slide that says "Revenue is growing" with a single chart forces the audience to figure out *why* and *so what* on their own. A Lucida slide puts the data table, the trend, and 2-3 callouts explaining the insight and its implications all in one view. The audience sees the evidence and the interpretation together.

**What this means in practice:**
- A single slide often has a table + callouts + stat boxes — the equivalent of 3-4 traditional slides
- Every data point gets commentary. Don't leave the audience to draw their own conclusions.
- Slides are designed to be read and re-read, not just glanced at during a live talk
- Information density is a feature, not a bug — but it must be *organized* density, not clutter

The structure does the work: cards contain data, callouts provide interpretation, color coding guides the eye, and the title states the conclusion upfront. Dense doesn't mean messy.

## The Cardinal Rule

**Every slide title is an insight, not a label.**

Bad: "Revenue Overview"
Good: "ARR grew 50% QoQ — driven by enterprise expansion"

Bad: "Discount Analysis"
Good: "62% of wine lines are discounted — and it's getting worse"

The title tells the audience what to think. The data below proves it. If someone reads only the slide titles, they should understand the entire story.

## Narrative Arc

A great deck has a beginning, middle, and end. The audience should feel momentum building.

### Board / Quarterly Review Pattern
1. **Hero** — anchor with 3 KPIs that tell the headline story
2. **Performance** — the core metrics, broken down by segment
3. **Deep dives** — 2-4 slides exploring what's working and what isn't
4. **Risks** — honest assessment of threats (use `variant: alert`)
5. **Priorities** — concrete next steps with measurable targets
6. **Close** — summary grid recapping the key numbers + strategic synthesis

### Analysis / Recommendation Pattern
1. **Hero** — frame the question with headline numbers
2. **Discovery** — walk through the data, building understanding
3. **The twist** — reveal an insight the audience didn't expect
4. **Scenarios** — show what different actions would yield
5. **Recommendation** — clear priorities with expected impact
6. **Close** — synthesize into 3 takeaways

### Pitch Deck Pattern
1. **Hero** — company name, one-line value prop, traction KPIs
2. **Problem** — the pain point, sized with data
3. **Solution** — what you built, why it's different
4. **Traction** — growth metrics, customer logos, retention
5. **Business model** — unit economics, go-to-market
6. **Ask** — what you're raising and what it funds

## Subtitle = Context Setter

The subtitle beneath each slide title does crucial work. It explains *why this data matters* and *what the audience should notice*. It's the bridge between the title's claim and the data's proof.

Good subtitle patterns:
- Set up what the data shows: "Enterprise ACV doubled while SMB held steady. The shift toward larger contracts is accelerating faster than planned."
- Explain the so-what: "Once internal kitchen consumption is filtered out, categories that looked broken are actually performing well."
- Provide scope: "Clean margins, 2025 vs 2024. Overall mix improved: 48.4% → 51.8% (+3.4 pp)."

## Hero Slides

The hero slide anchors the entire deck. Its 3 KPIs should be carefully chosen:

- **Pick numbers that tell a story together** — not just 3 random metrics. "$10.2M ARR" + "130% NRR" + "94% gross margin" paints a complete picture of a healthy SaaS business.
- **Add context to KPI labels** — "ARR (up from $6.8M in Q3)" is much stronger than just "ARR". The parenthetical shows trajectory.
- **The subtitle should be a confident summary** — "ARR crossed $10M. Net retention hit 130%. Enterprise pipeline doubled." Direct, declarative sentences.

## Data + Commentary Pattern

The strongest slide layout in Lucida is a two-column split: data on the left, interpretation on the right.

```yaml
layout: cols
columns:
  - card: "Data Table Title"
    table: { ... }
  - content:
      - callout: { color: green, title: "The good news", text: "..." }
      - callout: { color: amber, title: "The concern", text: "..." }
      - callout: { color: navy, title: "What it means", text: "..." }
```

The table presents the evidence. The callouts tell the audience what to take away. Never present data without interpretation — if you don't tell the audience what matters, they'll draw their own (possibly wrong) conclusions.

## Callout Color Language

Colors encode meaning. Be consistent:

| Color | Meaning | Use for |
|-------|---------|---------|
| `green` | Positive | Good news, wins, things working well |
| `amber` | Caution | Warnings, things to watch, trending wrong |
| `red` | Problem | Serious issues, losses, things that need fixing |
| `navy` | Context | Strategic implications, explanations, next steps |
| `gold` | Opportunity | Upside potential, key insights, highlights |

A slide with green + amber + navy callouts naturally creates a balanced narrative: "here's what's working, here's the concern, here's what we do about it."

## Table Formatting

Tables should guide the eye to what matters:

- **Highlight rows** that deserve attention (`highlight: green` or `highlight: red`)
- **Color individual cells** for key numbers — a green "+68%" stands out from plain text
- **Bold the important cells** — segment names, totals, standout metrics
- **Use separator rows** for totals: `style: "border-top:2px solid var(--border);"`
- **Don't color everything** — restraint makes highlights meaningful

## Actions and Priorities

When listing next steps, make them specific and measurable:

```yaml
actions:
  - num: 1
    text: "**Ship the Growth tier** ($49/mo) to reduce SMB churn"
    impact: "Target: cut SMB churn from 4.2% to 2.5% quarterly"
```

Every action has: what to do (bold), why, and a measurable target. Vague actions ("improve customer experience") are worse than no actions.

## Variant Usage

Variants create visual rhythm and signal meaning:

- **No variant** (default) — the workhorse. Most slides should be default.
- **`hero`** — opening only. One per deck, maybe two for long decks with a mid-point reset.
- **`warm`** — use for scenario analysis, transitions, or a change of pace after several data-heavy default slides.
- **`alert`** — risks, warnings, problems. The pink/red tint signals "pay attention, this is uncomfortable."
- **`dark`** — closing only. Creates a sense of finality. Summary grids look great here.

Don't overuse variants. A deck of 10 slides might use: hero, default, default, default, warm, default, alert, default, default, dark.

## Closing Slides

The close should feel like a landing, not a stop. Two elements work well together:

1. **Summary grid** — 3 key numbers that recap the story
2. **Strategic synthesis** — a 3-column grid (using `html`) with short paragraphs connecting the numbers to strategy

The summary grid's `total` row should be the single most important takeaway: "Near break-even with 200%+ growth" or "Annual incremental margin: +520K–1.75M DKK."

## Content Density

Each slide should have exactly one idea. If you're putting two unrelated points on one slide, split them. Conversely, if a slide has only a title and two bullets, it's too thin — combine with the next slide.

A well-balanced slide typically has:
- Title + subtitle (the claim)
- One data component (table, chart, or stat boxes)
- 2-3 callouts or bullets (the interpretation)
- Or: a two-column layout with data left and commentary right

## Writing Style

- **Be direct.** "Revenue grew 50%" not "We are pleased to report revenue growth of 50%."
- **Use em-dashes** (`&mdash;`) to connect ideas within titles: "130% net retention — expansion outpacing churn 6:1"
- **Bold key terms** in body text: "**AI Workflows** drove a step-change in engagement"
- **Use specific numbers** over vague claims: "42% of inbound pipeline" not "significant portion"
- **Write for scanning.** Board members and executives skim. Front-load the important words.
