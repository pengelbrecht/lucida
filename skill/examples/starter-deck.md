# Starter Deck Template

Use this as a starting point for new decks. Copy the YAML below into a `.slides.yaml` file.

```yaml
meta:
  title: "Company Name — Q4 2025"
  theme: aurora
  footer: "Company Name &middot; Confidential"
  lang: en

slides:
  # SLIDE 1: HERO
  - variant: hero
    label: "Q4 2025 Review"
    title: "Company Name &mdash; Q4 2025"
    title_style: "font-size:52px;"
    subtitle: "Brief summary of what this deck covers and the key takeaway."
    subtitle_style: "font-size:17px;max-width:750px;"
    kpis:
      - value: "$10M"
        label: "Revenue"
      - value: "120%"
        label: "YoY Growth"
      - value: "42"
        label: "Team Size"

  # SLIDE 2: DATA SLIDE WITH TWO COLUMNS
  - label: "Performance"
    title: "Revenue grew 50% &mdash; driven by enterprise"
    subtitle: "One sentence of context about what the data shows."
    layout: cols
    columns:
      - card: "Revenue by Segment"
        table:
          headers: ["Segment", "Revenue", "Growth"]
          rows:
            - row: ["**Enterprise**", "$5.8M", {text: "+68%", color: green, bold: true}]
              highlight: green
            - ["**Mid-Market**", "$2.9M", "+41%"]
            - ["**SMB**", "$1.5M", "+12%"]
      - content:
          - callout:
              color: green
              title: "Key insight"
              text: "Explain the most important takeaway from this data."
          - callout:
              color: navy
              title: "What it means"
              text: "Strategic implication or next step."

  # SLIDE 3: PRIORITIES / ACTIONS
  - label: "Next Steps"
    title: "Q1 2026 &mdash; three priorities"
    actions:
      - num: 1
        text: "**First priority** with context"
        impact: "Target: measurable outcome"
      - num: 2
        text: "**Second priority** with context"
        impact: "Target: measurable outcome"
      - num: 3
        text: "**Third priority** with context"
        impact: "Target: measurable outcome"

  # SLIDE 4: CLOSING
  - variant: dark
    label: "Summary"
    title: "The key message"
    summary_grid:
      items:
        - value: "$10M"
          label: "Metric 1"
          color: green
        - value: "120%"
          label: "Metric 2"
          color: gold
        - value: "5x"
          label: "Metric 3"
```

## Build It

```bash
npx lucida build my-deck.slides.yaml --open
npx lucida pdf my-deck.slides.yaml --open
```
