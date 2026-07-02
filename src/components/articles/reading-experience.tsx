"use client";

import * as React from "react";
import { ALargeSmall, Minus, Plus } from "lucide-react";
import { recordReading } from "@/lib/actions/engagement";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FONT_SIZES = ["0.95rem", "1.0625rem", "1.1875rem", "1.3125rem"];
const WIDTHS = { narrow: "40rem", normal: "48rem", wide: "60rem" } as const;
type Width = keyof typeof WIDTHS;

/**
 * Reading progress bar + reader preferences (font size, column width) +
 * milestone progress reporting into reading history.
 */
export function ReadingExperience({
  slug,
  signedIn,
  initialProgress,
}: {
  slug: string;
  signedIn: boolean;
  initialProgress: number;
}) {
  const [progress, setProgress] = React.useState(0);
  const [fontIdx, setFontIdx] = React.useState(1);
  const [width, setWidth] = React.useState<Width>("normal");
  const [showControls, setShowControls] = React.useState(false);
  const reported = React.useRef(initialProgress);

  // Restore reader prefs
  React.useEffect(() => {
    const f = Number(localStorage.getItem("reader-font") ?? 1);
    const w = (localStorage.getItem("reader-width") as Width) ?? "normal";
    if (f >= 0 && f < FONT_SIZES.length) setFontIdx(f);
    if (w in WIDTHS) setWidth(w);
  }, []);

  // Apply prefs to the article container
  React.useEffect(() => {
    const body = document.getElementById("article-body");
    const shell = document.getElementById("article-shell");
    if (body) body.style.fontSize = FONT_SIZES[fontIdx];
    if (shell) shell.style.maxWidth = WIDTHS[width];
    localStorage.setItem("reader-font", String(fontIdx));
    localStorage.setItem("reader-width", width);
  }, [fontIdx, width]);

  // Track scroll progress; report milestones to reading history.
  React.useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const el = document.documentElement;
        const total = el.scrollHeight - el.clientHeight;
        const p = total > 0 ? Math.min(1, el.scrollTop / total) : 0;
        setProgress(p);
        if (signedIn && p - reported.current >= 0.25) {
          reported.current = Math.round(p * 4) / 4;
          recordReading(slug, reported.current).catch(() => {});
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [signedIn, slug]);

  return (
    <>
      {/* Progress bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent" aria-hidden>
        <div
          className="h-full bg-accent transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Reader controls */}
      <div className="fixed bottom-5 right-5 z-40">
        {showControls && (
          <div className="mb-2 w-56 rounded-xl border bg-popover p-4 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Font size
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Smaller text"
                disabled={fontIdx === 0}
                onClick={() => setFontIdx((i) => Math.max(0, i - 1))}
              >
                <Minus />
              </Button>
              <span className="flex-1 text-center text-sm">{["S", "M", "L", "XL"][fontIdx]}</span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Larger text"
                disabled={fontIdx === FONT_SIZES.length - 1}
                onClick={() => setFontIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
              >
                <Plus />
              </Button>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reading width
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(Object.keys(WIDTHS) as Width[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setWidth(w)}
                  aria-pressed={width === w}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                    width === w ? "border-accent bg-accent-soft" : "hover:border-muted-foreground/40"
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label="Reader settings"
          aria-expanded={showControls}
          className="ml-auto flex rounded-full bg-background shadow-md"
          onClick={() => setShowControls((v) => !v)}
        >
          <ALargeSmall />
        </Button>
      </div>
    </>
  );
}
