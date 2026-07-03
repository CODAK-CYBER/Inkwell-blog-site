/** Built-in content templates for the "start from template" chooser. */

export interface ContentTemplate {
  slug: string;
  name: string;
  description: string;
  content: string;
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    slug: "news",
    name: "News article",
    description: "Inverted pyramid: lede, context, quotes, what's next.",
    content: `The most important fact goes here — who, what, when, where, and why it matters. One or two sentences.

## The details

Expand on the lede. Add background a first-time reader needs.

## What they're saying

> "A strong quote from a primary source."
> — Name, Title

## What happens next

Close with the road ahead and any dates readers should watch.`,
  },
  {
    slug: "tutorial",
    name: "Tutorial",
    description: "Step-by-step how-to with prerequisites and code blocks.",
    content: `A one-paragraph promise: what the reader will be able to do by the end.

## Prerequisites

- Requirement one
- Requirement two

## Step 1 — First milestone

Explain, then show:

\`\`\`bash
command --example
\`\`\`

## Step 2 — Next milestone

Keep steps small and verifiable.

## Troubleshooting

Common errors and their fixes.

## Wrap-up

Recap and suggest what to learn next.`,
  },
  {
    slug: "opinion",
    name: "Opinion",
    description: "A clear thesis defended with arguments and counterpoints.",
    content: `State your position in one bold sentence.

## The case

Your strongest argument first, backed by evidence.

## The counterargument

Steelman the other side — then answer it.

## Why it matters

Zoom out. What should the reader do or believe differently?`,
  },
  {
    slug: "interview",
    name: "Interview",
    description: "Intro, Q&A format, and a closing takeaway.",
    content: `Introduce your guest and why their perspective matters right now.

**Q: The first question sets the theme?**

Their answer.

**Q: Follow the thread with something unexpected?**

Their answer.

**Q: What's next for you?**

Their answer.

## The takeaway

One paragraph on what stuck with you.`,
  },
  {
    slug: "review",
    name: "Product review",
    description: "Verdict up front, pros/cons, and who it's for.",
    content: `**Verdict:** One-sentence summary with a score if you use one.

## The good

- Highlight one
- Highlight two

## The bad

- Drawback one
- Drawback two

## Who should buy it

Be specific about the ideal user — and who should skip it.

## Bottom line

Restate the verdict with pricing context.`,
  },
  {
    slug: "listicle",
    name: "Listicle",
    description: "Numbered picks with a consistent structure per item.",
    content: `Why this list, and how the picks were chosen.

## 1. First pick

What it is and why it made the list.

## 2. Second pick

What it is and why it made the list.

## 3. Third pick

What it is and why it made the list.

## Honorable mentions

Quick hits that almost made it.`,
  },
];
