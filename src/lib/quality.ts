/**
 * Content quality checks — pure functions, safe on client and server.
 * Powers the pre-publish readiness checklist and SEO/readability scores.
 */

export interface QualityInput {
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  categoryId: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
}

export interface CheckItem {
  label: string;
  ok: boolean;
  hint?: string;
}

export function readinessChecklist(a: QualityInput): CheckItem[] {
  const words = a.content.trim().split(/\s+/).filter(Boolean).length;
  const metaDesc = a.seoDescription || a.excerpt;
  const hasInternalLink = /\]\(\//.test(a.content);
  const hasImage = /!\[[^\]]*\]\(/.test(a.content) || Boolean(a.coverImage);
  const kw = a.focusKeyword.trim().toLowerCase();

  return [
    { label: "Title between 30–70 characters", ok: a.title.length >= 30 && a.title.length <= 70, hint: `${a.title.length} chars` },
    { label: "Excerpt written", ok: a.excerpt.trim().length >= 40, hint: `${a.excerpt.trim().length}/40+ chars` },
    { label: "At least 300 words", ok: words >= 300, hint: `${words} words` },
    { label: "Cover image set", ok: Boolean(a.coverImage) },
    { label: "Contains an image", ok: hasImage },
    { label: "Category selected", ok: Boolean(a.categoryId) },
    { label: "At least 2 tags", ok: a.tags.filter(Boolean).length >= 2 },
    { label: "Meta description 70–160 characters", ok: metaDesc.length >= 70 && metaDesc.length <= 160, hint: `${metaDesc.length} chars` },
    { label: "Internal link present", ok: hasInternalLink },
    ...(kw
      ? [
          { label: "Focus keyword in title", ok: a.title.toLowerCase().includes(kw) },
          { label: "Focus keyword in content", ok: a.content.toLowerCase().includes(kw) },
        ]
      : [{ label: "Focus keyword set", ok: false, hint: "optional but recommended" }]),
  ];
}

/** 0–100 from the checklist. */
export function seoScore(a: QualityInput): number {
  const checks = readinessChecklist(a);
  return Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
}

/**
 * Flesch-style reading ease, bucketed for display.
 * Rough syllable estimate — fine for guidance, not linguistics.
 */
export function readability(content: string): { score: number; label: string } {
  const text = content.replace(/[#>*`\[\]()!-]/g, " ");
  const sentences = Math.max(1, (text.match(/[.!?]+/g) ?? []).length);
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 30) return { score: 100, label: "Too short to score" };

  const syllables = words.reduce((sum, w) => {
    const s = w.toLowerCase().replace(/[^a-z]/g, "").match(/[aeiouy]{1,2}/g);
    return sum + Math.max(1, s?.length ?? 1);
  }, 0);

  const score = Math.max(
    0,
    Math.min(100, 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length))
  );
  const label =
    score >= 70 ? "Easy to read" : score >= 50 ? "Fairly readable" : score >= 30 ? "Difficult" : "Very difficult";
  return { score: Math.round(score), label };
}

export function wordCount(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length;
}
