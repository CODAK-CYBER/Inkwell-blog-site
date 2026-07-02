"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock, FileText, Search, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Suggestion {
  title: string;
  slug: string;
}

export function SearchDialog({
  categories = [],
}: {
  categories?: Array<{ name: string; slug: string }>;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [recent, setRecent] = React.useState<string[]>([]);
  const [trending, setTrending] = React.useState<string[]>([]);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
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

  // Load recent + trending searches when the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    fetch("/api/search/meta")
      .then((r) => r.json())
      .then((d) => {
        setRecent(d.recent ?? []);
        setTrending(d.trending ?? []);
      })
      .catch(() => {});
  }, [open]);

  // Debounced live suggestions.
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.suggestions ?? []))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    go(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const Chip = ({ label, icon: Icon }: { label: string; icon: React.ComponentType<{ className?: string }> }) => (
    <button
      onClick={() => go(`/search?q=${encodeURIComponent(label)}`)}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );

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
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Search" onClick={() => setOpen(true)}>
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

              <div className="max-h-[50vh] overflow-y-auto p-4">
                {query.trim() ? (
                  <div className="space-y-1">
                    {suggestions.map((s) => (
                      <button
                        key={s.slug}
                        onClick={() => go(`/articles/${s.slug}`)}
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm hover:bg-secondary"
                      >
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{s.title}</span>
                      </button>
                    ))}
                    <button
                      onClick={submit}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-secondary"
                    >
                      <span>
                        Search for <span className="font-semibold">“{query}”</span>
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {recent.length > 0 && (
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Clock className="size-3.5" /> Recent searches
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {recent.map((r) => (
                            <Chip key={r} label={r} icon={Clock} />
                          ))}
                        </div>
                      </div>
                    )}
                    {trending.length > 0 && (
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <TrendingUp className="size-3.5" /> Trending searches
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {trending.map((t) => (
                            <Chip key={t} label={t} icon={TrendingUp} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Browse topics
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((c) => (
                          <button
                            key={c.slug}
                            onClick={() => go(`/categories/${c.slug}`)}
                            className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
