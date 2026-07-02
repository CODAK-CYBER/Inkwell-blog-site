import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({ gfm: true, breaks: true });

/** Markdown → sanitized HTML. Safe for user-authored content. */
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false });
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ["target", "rel"],
  });
}
