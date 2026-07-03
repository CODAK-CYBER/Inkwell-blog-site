import { marked, Renderer, type Tokens } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { slugify } from "@/lib/utils";

marked.setOptions({ gfm: true, breaks: true });

// Give headings stable ids so the table of contents can anchor to them.
const renderer = new Renderer();
renderer.heading = function ({ tokens, depth }: Tokens.Heading) {
  const text = this.parser.parseInline(tokens);
  const id = slugify(text.replace(/<[^>]+>/g, ""));
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};

/** Markdown → sanitized HTML. Safe for user-authored content. */
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false, renderer });
  const clean = DOMPurify.sanitize(raw, {
    ADD_ATTR: ["target", "rel", "id"],
  });
  return embedYouTube(clean);
}

/**
 * A paragraph containing only a YouTube link becomes an embedded player.
 * Runs AFTER sanitization; the iframe src is built from a validated ID only.
 */
function embedYouTube(html: string): string {
  return html.replace(
    /<p><a[^>]*href="https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,20})[^"]*"[^>]*>[^<]*<\/a><\/p>/g,
    (_match, videoId: string) =>
      `<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
  );
}

export interface Heading {
  id: string;
  text: string;
  depth: number;
}

/** Extract h2/h3 headings for the table of contents. */
export function extractHeadings(md: string): Heading[] {
  return marked
    .lexer(md)
    .filter((t): t is Tokens.Heading => t.type === "heading" && (t.depth === 2 || t.depth === 3))
    .map((t) => ({
      id: slugify(t.text.replace(/<[^>]+>/g, "")),
      text: t.text,
      depth: t.depth,
    }));
}
