import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Activity logs — admin",
  robots: { index: false },
};

export default async function AdminActivityPage() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <h1 className="text-xl font-bold">Activity logs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The last 100 recorded actions across the platform.
      </p>

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
