"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Database, Download, Plus, Trash2 } from "lucide-react";
import { createBackup, deleteBackup } from "@/lib/actions/system";
import { formatBytes } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FormSuccess } from "@/components/auth/form-field";

interface BackupEntry {
  name: string;
  size: number;
  createdAt: string;
}

export function BackupsManager({ backups }: { backups: BackupEntry[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Database className="size-5 text-accent" />
          Backups
        </h1>
        <Button
          variant="accent"
          size="sm"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const res = await createBackup();
            setPending(false);
            setNotice(`Backup created: ${res.name}`);
            router.refresh();
          }}
        >
          {pending ? <Spinner className="size-4" /> : <Plus />}
          Create backup now
        </Button>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Dev-mode snapshots of the SQLite database. In production, use your Postgres
        provider&apos;s automated backups (Neon/Supabase include point-in-time recovery)
        plus Cloudinary for media.
      </p>

      <FormSuccess message={notice} />

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Backup</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {backups.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  No backups yet — create your first one.
                </td>
              </tr>
            )}
            {backups.map((b) => (
              <tr key={b.name}>
                <td className="px-4 py-2.5 font-mono text-xs">{b.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatBytes(b.size)}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {new Date(b.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <a href={`/api/admin/backups/${b.name}`} download>
                      <Button variant="ghost" size="icon-sm" aria-label={`Download ${b.name}`}>
                        <Download />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      aria-label={`Delete ${b.name}`}
                      disabled={pending}
                      onClick={async () => {
                        if (!window.confirm(`Delete ${b.name}?`)) return;
                        setPending(true);
                        await deleteBackup(b.name);
                        setPending(false);
                        router.refresh();
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
