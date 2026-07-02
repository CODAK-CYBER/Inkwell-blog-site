"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Eye, PenSquare, Save, Send, UploadCloud } from "lucide-react";
import {
  publishArticle,
  saveArticle,
  scheduleArticle,
  submitForReview,
  type ArticleInput,
} from "@/lib/actions/articles";
import { renderMarkdown } from "@/lib/markdown";
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

interface InitialArticle {
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
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "In review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
  trashed: "In trash",
};

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
  const [scheduleAt, setScheduleAt] = React.useState("");

  const [preview, setPreview] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const input = (): ArticleInput => ({
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
  });

  async function save(): Promise<string | null> {
    setError(null);
    setNotice(null);
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
    return saved.id;
  }

  async function run(kind: string, fn: (articleId: string) => Promise<{ error?: string; success?: boolean } | { error: string }>) {
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
    const res = await fn(articleId);
    setPending(null);
    if (res && "error" in res && res.error) {
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPreview((v) => !v)} aria-pressed={preview}>
            <Eye />
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => run("save", async () => ({ success: true }))}>
            {pending === "save" ? <Spinner className="size-4" /> : <Save />}
            Save draft
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
            <Button
              variant="accent"
              size="sm"
              disabled={pending !== null}
              onClick={() => run("publish", publishArticle)}
            >
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

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Article title…"
            className="w-full bg-transparent font-serif text-3xl font-bold outline-none placeholder:text-muted-foreground/50"
          />
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A one-or-two sentence excerpt shown in article cards and search results…"
            rows={2}
            maxLength={300}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          {preview ? (
            <div
              className="article-content min-h-[400px] rounded-xl border bg-card p-6"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content || "*Nothing to preview yet.*") }}
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"Write in Markdown…\n\n## Headings\n**bold**, *italic*, [links](https://example.com)\n- lists\n> quotes\n```js\ncode blocks\n```"}
              rows={22}
              className="w-full rounded-xl border border-input bg-transparent p-4 font-mono text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
        </div>

        {/* Meta sidebar */}
        <aside className="space-y-5">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Organization</h2>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputSmall}>
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
                <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ai, hardware, privacy" className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">URL slug</label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Cover image</h2>
            <div className="mt-3 space-y-2">
              <Input
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://…/cover.jpg"
                className="h-9"
              />
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImage} alt="Cover preview" className="aspect-[16/9] w-full rounded-lg border object-cover" />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Paste an image URL — uploads arrive with the media library.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">SEO</h2>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Meta title</label>
                <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title || "Defaults to the article title"} className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Meta description</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={3}
                  maxLength={160}
                  placeholder="Defaults to the excerpt"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Canonical URL</label>
                <Input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://… (optional)" className="h-9" />
              </div>
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
    </div>
  );
}
