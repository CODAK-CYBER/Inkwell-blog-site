"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Search, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Global search overlay, opened from the header or with Ctrl/Cmd+K.
 * Phase 1 ships the UI shell; live results arrive with the search
 * engine in Phase 6.
 */
export function SearchDialog({
  categories = [],
}: {
  categories?: Array<{ name: string; slug: string }>;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
  };

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-9 w-56 justify-between px-3 text-muted-foreground sm:flex"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2 text-sm">
          <Search className="size-4" />
          Search articles…
        </span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          Ctrl K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full max-w-xl overflow-hidden rounded-xl border bg-popover shadow-2xl"
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={submit} className="flex items-center gap-3 border-b px-4">
                <Search className="size-5 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles, topics, authors…"
                  className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  aria-label="Close search"
                  className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                  onClick={() => setOpen(false)}
                >
                  <X className="size-4" />
                </button>
              </form>

              <div className="p-4">
                {query.trim() ? (
                  <button
                    onClick={submit}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-secondary"
                  >
                    <span>
                      Search for <span className="font-semibold">“{query}”</span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </button>
                ) : (
                  <>
                    <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <TrendingUp className="size-3.5" /> Popular topics
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((c) => (
                        <button
                          key={c.slug}
                          onClick={() => {
                            setOpen(false);
                            router.push(`/categories/${c.slug}`);
                          }}
                          className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
