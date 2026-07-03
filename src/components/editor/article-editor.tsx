"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Eye,
  History,
  ImagePlus,
  Maximize2,
  Minimize2,
  Monitor,
  PenSquare,
  Save,
  Send,
  Smartphone,
  Tablet,
  UploadCloud,
} from "lucide-react";
import {
  getVersion,
  listVersions,
  publishArticle,
  saveArticle,
  scheduleArticle,
  submitForReview,
  type ArticleInput,
} from "@/lib/actions/articles";
import { renderMarkdown } from "@/lib/markdown";
import { readability, readinessChecklist, seoScore, wordCount } from "@/lib/quality";
import { CONTENT_TEMPLATES } from "@/components/editor/templates";
import { MediaPicker } from "@/components/editor/media-picker";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormError, FormSuccess } from "@/components/auth/form-field";
import { cn } from "@/lib/utils";

interface CategoryOption {
  id: string;
  name: string;
}

export interface InitialArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  categoryId: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  focusKeyword: string;
  status: string;
  isBreaking: boolean;
  isPremium: boolean;
  isSponsored: boolean;
  engagementEnabled: boolean;
  allowComments: boolean;
  expiresAt: string; // datetime-local or ""
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "In review",
  needs_revision: "Needs revision",
  fact_check: "Fact check",
  seo_review: "SEO review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
  trashed: "In trash",
};

const AUTOSAVE_MS = 25_000;

const inputSmall =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ArticleEditor({
  categories,
  initial,
  canPublish,
}: {
  categories: CategoryOption[];
  initial: InitialArticle | null;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [id, setId] = React.useState(initial?.id);
  const [status, setStatus] = React.useState(initial?.status ?? "draft");
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [slug, setSlug] = React.useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initial));
  const [excerpt, setExcerpt] = React.useState(initial?.excerpt ?? "");
  const [content, setContent] = React.useState(initial?.content ?? "");
  const [coverImage, setCoverImage] = React.useState(initial?.coverImage ?? "");
  const [categoryId, setCategoryId] = React.useState(initial?.categoryId ?? "");
  const [tags, setTags] = React.useState(initial?.tags.join(", ") ?? "");
  const [seoTitle, setSeoTitle] = React.useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = React.useState(initial?.seoDescription ?? "");
  const [canonicalUrl, setCanonicalUrl] = React.useState(initial?.canonicalUrl ?? "");
  const [focusKeyword, setFocusKeyword] = React.useState(initial?.focusKeyword ?? "");
  const [scheduleAt, setScheduleAt] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState(initial?.expiresAt ?? "");
  const [isBreaking, setIsBreaking] = React.useState(initial?.isBreaking ?? false);
  const [isPremium, setIsPremium] = React.useState(initial?.isPremium ?? false);
  const [isSponsored, setIsSponsored] = React.useState(initial?.isSponsored ?? false);
  const [engagementEnabled, setEngagementEnabled] = React.useState(initial?.engagementEnabled ?? true);
  const [allowComments, setAllowComments] = React.useState(initial?.allowComments ?? true);

  const [preview, setPreview] = React.useState(false);
  const [previewWidth, setPreviewWidth] = React.useState<"full" | "768px" | "375px">("full");
  const [fullscreen, setFullscreen] = React.useState(false);
  const [pickerFor, setPickerFor] = React.useState<"content" | "cover" | null>(null);
  const [showVersions, setShowVersions] = React.useState(false);
  const [versions, setVersions] = React.useState<Array<{ id: string; title: string; createdAt: Date | string }>>([]);
  const [showTemplates, setShowTemplates] = React.useState(!initial);

  const [dirty, setDirty] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);

  const contentRef = React.useRef<HTMLTextAreaElement>(null);
  const stateRef = React.useRef({ dirty: false, pending: false });
  stateRef.current = { dirty, pending: pending !== null };

  const markDirty = () => setDirty(true);

  const input = React.useCallback(
    (): ArticleInput => ({
      title,
      slug,
      excerpt,
      content,
      coverImage,
      categoryId: categoryId || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      seoTitle,
      seoDescription,
      canonicalUrl,
      focusKeyword,
      isBreaking,
      isPremium,
      isSponsored,
      engagementEnabled,
      allowComments,
      expiresAt: expiresAt || null,
    }),
    [title, slug, excerpt, content, coverImage, categoryId, tags, seoTitle, seoDescription, canonicalUrl, focusKeyword, isBreaking, isPremium, isSponsored, engagementEnabled, allowComments, expiresAt]
  );

  const save = React.useCallback(
    async (silent = false): Promise<string | null> => {
      setError(null);
      if (!silent) setNotice(null);
      const res = await saveArticle(input(), id);
      if ("error" in res && res.error) {
        setError(res.error);
        return null;
      }
      const saved = res as { id: string; slug: string };
      if (!id) {
        setId(saved.id);
        window.history.replaceState(null, "", `/write/${saved.id}`);
      }
      setSlug(saved.slug);
      setDirty(false);
      setLastSaved(new Date());
      return saved.id;
    },
    [id, input]
  );

  // Autosave + Ctrl+S + close-guard
  React.useEffect(() => {
    const interval = setInterval(async () => {
      if (stateRef.current.dirty && !stateRef.current.pending && title.trim()) {
        await save(true);
      }
    }, AUTOSAVE_MS);
    return () => clearInterval(interval);
  }, [save, title]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!stateRef.current.pending) {
          setPending("save");
          save().then(() => {
            setNotice("Saved.");
            setPending(null);
          });
        }
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stateRef.current.dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [save]);

  async function run(kind: string, fn: (articleId: string) => Promise<{ error?: string } | unknown>) {
    setPending(kind);
    const articleId = await save();
    if (!articleId) {
      setPending(null);
      return;
    }
    if (kind === "save") {
      setNotice("Draft saved.");
      setPending(null);
      router.refresh();
      return;
    }
    const res = (await fn(articleId)) as { error?: string } | undefined;
    setPending(null);
    if (res?.error) {
      setError(res.error);
      return;
    }
    if (kind === "submit") {
      setStatus("pending");
      setNotice("Submitted for editorial review.");
    }
    if (kind === "publish") {
      setStatus("published");
      setNotice("Published! It's live on the site.");
    }
    if (kind === "schedule") {
      setStatus("scheduled");
      setNotice("Scheduled for publication.");
    }
    router.refresh();
  }

  function insertAtCursor(snippet: string) {
    const el = contentRef.current;
    if (!el) {
      setContent((c) => c + snippet);
      markDirty();
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    setContent(content.slice(0, start) + snippet + content.slice(end));
    markDirty();
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + snippet.length;
    });
  }

  async function openVersions() {
    if (!id) return;
    setShowVersions((v) => !v);
    if (!showVersions) {
      const list = await listVersions(id);
      setVersions(list);
    }
  }

  async function loadVersion(versionId: string) {
    const v = await getVersion(versionId);
    if (!v) return;
    if (!window.confirm("Replace the current editor content with this version? (Your current text is snapshotted on next save.)")) return;
    setTitle(v.title);
    setExcerpt(v.excerpt);
    setContent(v.content);
    setShowVersions(false);
    markDirty();
    setNotice(`Loaded version from ${new Date(v.createdAt).toLocaleString()} — save to keep it.`);
  }

  const quality = {
    title,
    excerpt,
    content,
    coverImage,
    categoryId,
    tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    seoTitle,
    seoDescription,
    focusKeyword,
  };
  const checks = readinessChecklist(quality);
  const score = seoScore(quality);
  const readable = readability(content);
  const words = wordCount(content);

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8",
        fullscreen && "fixed inset-0 z-40 max-w-none overflow-y-auto bg-background"
      )}
    >
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="flex items-center gap-2 font-serif text-xl font-bold">
            <PenSquare className="size-5 text-accent" />
            {id ? "Edit article" : "New article"}
          </h1>
          <Badge variant={status === "published" ? "accent" : "secondary"}>
            {STATUS_LABEL[status] ?? status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {pending === "autosave"
              ? "Saving…"
              : dirty
                ? "Unsaved changes"
                : lastSaved
                  ? `Saved ${lastSaved.toLocaleTimeString()}`
                  : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Toggle fullscreen" onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
          {id && (
            <Button variant="ghost" size="sm" onClick={openVersions} aria-expanded={showVersions}>
              <History />
              History
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setPreview((v) => !v)} aria-pressed={preview}>
            <Eye />
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => run("save", async () => ({}))}>
            {pending === "save" ? <Spinner className="size-4" /> : <Save />}
            Save
          </Button>
          {!canPublish && (
            <Button
              variant="accent"
              size="sm"
              disabled={pending !== null || status === "pending"}
              onClick={() => run("submit", submitForReview)}
            >
              {pending === "submit" ? <Spinner className="size-4" /> : <Send />}
              {status === "pending" ? "In review" : "Submit for review"}
            </Button>
          )}
          {canPublish && (
            <Button variant="accent" size="sm" disabled={pending !== null} onClick={() => run("publish", publishArticle)}>
              {pending === "publish" ? <Spinner className="size-4" /> : <UploadCloud />}
              Publish now
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <FormError message={error} />
        <FormSuccess message={notice} />
      </div>

      {/* Version history panel */}
      {showVersions && (
        <div className="mt-3 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Version history</p>
          {versions.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No earlier versions yet — versions are snapshotted every time you save changes.</p>
          ) : (
            <ul className="mt-2 divide-y">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-sm">{v.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                    <Button variant="outline" size="sm" onClick={() => loadVersion(v.id)}>
                      Restore
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Template chooser for fresh articles */}
      {showTemplates && !content && (
        <div className="mt-4 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Start from a template</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              onClick={() => setShowTemplates(false)}
              className="rounded-lg border border-dashed p-3 text-left text-sm transition-colors hover:border-accent"
            >
              <span className="font-medium">Blank</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Start from scratch</span>
            </button>
            {CONTENT_TEMPLATES.map((t) => (
              <button
                key={t.slug}
                onClick={() => {
                  setContent(t.content);
                  setShowTemplates(false);
                  markDirty();
                }}
                className="rounded-lg border p-3 text-left text-sm transition-colors hover:border-accent"
              >
                <span className="font-medium">{t.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
              markDirty();
            }}
            placeholder="Article title…"
            className="w-full bg-transparent font-serif text-3xl font-bold outline-none placeholder:text-muted-foreground/50"
          />
          <textarea
            value={excerpt}
            onChange={(e) => {
              setExcerpt(e.target.value);
              markDirty();
            }}
            placeholder="A one-or-two sentence excerpt shown in article cards and search results…"
            rows={2}
            maxLength={300}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          {preview ? (
            <div>
              <div className="mb-2 flex items-center gap-1">
                {(
                  [
                    ["full", Monitor, "Desktop"],
                    ["768px", Tablet, "Tablet"],
                    ["375px", Smartphone, "Mobile"],
                  ] as const
                ).map(([w, Icon, label]) => (
                  <Button
                    key={w}
                    variant={previewWidth === w ? "secondary" : "ghost"}
                    size="sm"
                    aria-label={`${label} preview`}
                    onClick={() => setPreviewWidth(w)}
                  >
                    <Icon />
                    {label}
                  </Button>
                ))}
              </div>
              <div
                className="article-content mx-auto min-h-[400px] rounded-xl border bg-card p-6 transition-all"
                style={{ maxWidth: previewWidth === "full" ? undefined : previewWidth }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content || "*Nothing to preview yet.*") }}
              />
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPickerFor("content")}>
                  <ImagePlus />
                  Insert image
                </Button>
                <span className="ml-auto text-xs text-muted-foreground">
                  {words.toLocaleString()} words · {content.length.toLocaleString()} chars · ~
                  {Math.max(1, Math.ceil(words / 225))} min read
                </span>
              </div>
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  markDirty();
                }}
                placeholder={"Write in Markdown…\n\n## Headings\n**bold**, *italic*, [links](https://example.com)\n- lists\n> quotes\n```js\ncode blocks\n```\nPaste a YouTube link on its own line to embed the video."}
                rows={fullscreen ? 30 : 22}
                className="w-full rounded-xl border border-input bg-transparent p-4 font-mono text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}
        </div>

        {/* Meta sidebar */}
        <aside className="space-y-5">
          {/* Readiness */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Readiness</h2>
              <Badge variant={score >= 80 ? "accent" : "secondary"}>SEO {score}/100</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Readability: {readable.label}
              {words >= 30 && ` (${readable.score})`}
            </p>
            <ul className="mt-3 space-y-1.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-xs">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  ) : (
                    <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                  )}
                  <span className={c.ok ? "" : "text-muted-foreground"}>
                    {c.label}
                    {c.hint && !c.ok && <span className="text-muted-foreground/70"> — {c.hint}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Organization</h2>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    markDirty();
                  }}
                  className={inputSmall}
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                <Input
                  value={tags}
                  onChange={(e) => {
                    setTags(e.target.value);
                    markDirty();
                  }}
                  placeholder="ai, hardware, privacy"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">URL slug</label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                    markDirty();
                  }}
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Cover image</h2>
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={coverImage}
                  onChange={(e) => {
                    setCoverImage(e.target.value);
                    markDirty();
                  }}
                  placeholder="https://…/cover.jpg"
                  className="h-9"
                />
                <Button variant="outline" size="sm" onClick={() => setPickerFor("cover")}>
                  Library
                </Button>
              </div>
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImage} alt="Cover preview" className="aspect-[16/9] w-full rounded-lg border object-cover" />
              ) : (
                <p className="text-xs text-muted-foreground">Pick from the media library or paste a URL.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">SEO</h2>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Focus keyword</label>
                <Input
                  value={focusKeyword}
                  onChange={(e) => {
                    setFocusKeyword(e.target.value);
                    markDirty();
                  }}
                  placeholder="e.g. on-device ai"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Meta title</label>
                <Input
                  value={seoTitle}
                  onChange={(e) => {
                    setSeoTitle(e.target.value);
                    markDirty();
                  }}
                  placeholder={title || "Defaults to the article title"}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Meta description</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => {
                    setSeoDescription(e.target.value);
                    markDirty();
                  }}
                  rows={3}
                  maxLength={160}
                  placeholder="Defaults to the excerpt"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Canonical URL</label>
                <Input
                  value={canonicalUrl}
                  onChange={(e) => {
                    setCanonicalUrl(e.target.value);
                    markDirty();
                  }}
                  placeholder="https://… (optional)"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {canPublish && (
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold">Publishing options</h2>
              <div className="mt-3 space-y-2">
                {(
                  [
                    [isBreaking, setIsBreaking, "Breaking news", "Shows the red banner sitewide"],
                    [isPremium, setIsPremium, "Premium content", "For members (paywall in Phase 10)"],
                    [isSponsored, setIsSponsored, "Sponsored", "Labeled as paid partnership"],
                  ] as const
                ).map(([value, set, label, hint]) => (
                  <label key={label} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                    <span>
                      {label}
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => {
                        set(e.target.checked);
                        markDirty();
                      }}
                      className="size-4 accent-[var(--accent)]"
                    />
                  </label>
                ))}
                <div className="space-y-1 border-t pt-2">
                  <label className="text-xs font-medium text-muted-foreground">Expires (auto-unpublish)</label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => {
                      setExpiresAt(e.target.value);
                      markDirty();
                    }}
                    className={cn(inputSmall, "[color-scheme:light] dark:[color-scheme:dark]")}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Reader interactions</h2>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                Likes, saves & shares
                <input
                  type="checkbox"
                  checked={engagementEnabled}
                  onChange={(e) => {
                    setEngagementEnabled(e.target.checked);
                    markDirty();
                  }}
                  className="size-4 accent-[var(--accent)]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                Comments (arrive in Phase 7)
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => {
                    setAllowComments(e.target.checked);
                    markDirty();
                  }}
                  className="size-4 accent-[var(--accent)]"
                />
              </label>
            </div>
          </div>

          {canPublish && (
            <div className="rounded-xl border bg-card p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <CalendarClock className="size-4 text-accent" />
                Schedule publishing
              </h2>
              <div className="mt-3 space-y-2">
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className={cn(inputSmall, "[color-scheme:light] dark:[color-scheme:dark]")}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!scheduleAt || pending !== null}
                  onClick={() => run("schedule", (articleId) => scheduleArticle(articleId, scheduleAt))}
                >
                  {pending === "schedule" ? <Spinner className="size-4" /> : "Schedule"}
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <MediaPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={({ url, alt }) => {
          if (pickerFor === "cover") {
            setCoverImage(url);
          } else {
            insertAtCursor(`\n\n![${alt || "Image"}](${url})\n\n`);
          }
          markDirty();
        }}
      />
    </div>
  );
}
