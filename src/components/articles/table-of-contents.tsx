import { List } from "lucide-react";
import type { Heading } from "@/lib/markdown";
import { cn } from "@/lib/utils";

export function TableOfContents({ headings }: { headings: Heading[] }) {
  if (headings.length < 2) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="mt-8 rounded-xl border bg-card p-5"
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <List className="size-4 text-accent" />
        In this article
      </p>
      <ol className="mt-3 space-y-1.5">
        {headings.map((h) => (
          <li key={h.id} className={cn(h.depth === 3 && "pl-4")}>
            <a
              href={`#${h.id}`}
              className="text-sm text-muted-foreground transition-colors hover:text-accent"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
