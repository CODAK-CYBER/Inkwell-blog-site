"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Link2, Plus, Trash2 } from "lucide-react";
import { deleteAffiliateLink, saveAffiliateLink } from "@/lib/actions/ads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/auth/form-field";

interface LinkRow {
  id: string;
  name: string;
  code: string;
  targetUrl: string;
  clicks: number;
}

export function AffiliatesManager({ links }: { links: LinkRow[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [targetUrl, setTargetUrl] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Link2 className="size-5 text-accent" />
        Affiliate links
      </h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Cloaked, click-tracked links. Use <code className="rounded bg-muted px-1">/go/code</code> in
        articles — the affiliate disclosure is added automatically.
      </p>

      <form
        className="mt-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_2fr_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          const res = await saveAffiliateLink({ name, code, targetUrl });
          setPending(false);
          if (res?.error) {
            setError(res.error);
            return;
          }
          setName("");
          setCode("");
          setTargetUrl("");
          router.refresh();
        }}
      >
        <Input required placeholder="Name (e.g. Hosting Deal)" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
        <Input placeholder="Code (auto from name)" value={code} onChange={(e) => setCode(e.target.value)} className="h-9" />
        <Input required type="url" placeholder="https://partner.com/?ref=you" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="h-9" />
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? <Spinner className="size-4" /> : <Plus />}
          Add
        </Button>
      </form>

      <FormError message={error} />

      <ul className="mt-4 space-y-2">
        {links.length === 0 && (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No affiliate links yet.
          </p>
        )}
        {links.map((link) => (
          <li key={link.id} className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3">
            <span className="font-medium">{link.name}</span>
            <button
              className="rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-secondary"
              title="Copy link"
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/go/${link.code}`);
                setCopied(link.id);
                setTimeout(() => setCopied(null), 1500);
              }}
            >
              {copied === link.id ? "Copied!" : `/go/${link.code}`}
            </button>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">→ {link.targetUrl}</span>
            <Badge variant="secondary">{link.clicks} clicks</Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              aria-label={`Delete ${link.name}`}
              disabled={pending}
              onClick={async () => {
                if (!window.confirm(`Delete "${link.name}"? Existing /go/${link.code} links will stop working.`)) return;
                setPending(true);
                await deleteAffiliateLink(link.id);
                setPending(false);
                router.refresh();
              }}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
