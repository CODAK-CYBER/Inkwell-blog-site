import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Activity logs — admin",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminActivityPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const logs = await prisma.activityLog.findMany({
    where: query
      ? {
          OR: [
            { action: { contains: query } },
            { detail: { contains: query } },
            { user: { email: { contains: query } } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Activity logs</h1>
        <a
          href="/api/admin/export?dataset=activity"
          download
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
        >
          Export CSV
        </a>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        The most recent 100 recorded actions{query && ` matching “${query}”`}.
      </p>
      <form action="/admin/activity" method="GET" className="mt-3 max-w-sm">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search action, detail or user email…"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Who</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  No activity recorded yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                  {log.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-2.5">{log.user?.name ?? "System"}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="font-mono text-xs">
                    {log.action}
                  </Badge>
                </td>
                <td className="max-w-64 truncate px-4 py-2.5 text-muted-foreground">
                  {log.detail ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
