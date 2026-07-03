import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Editorial calendar — admin",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ month?: string }>; // YYYY-MM
}

export default async function EditorialCalendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const [y, m] = (params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
    .split("-")
    .map(Number);
  const year = y || now.getFullYear();
  const month = (m || now.getMonth() + 1) - 1; // 0-based

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const articles = await prisma.article.findMany({
    where: {
      OR: [
        { publishedAt: { gte: monthStart, lt: monthEnd } },
        { scheduledFor: { gte: monthStart, lt: monthEnd } },
      ],
      status: { in: ["published", "scheduled", "approved"] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      publishedAt: true,
      scheduledFor: true,
      author: { select: { name: true } },
    },
  });

  // Bucket by day of month
  const byDay = new Map<number, typeof articles>();
  for (const a of articles) {
    const date = a.status === "scheduled" ? a.scheduledFor : a.publishedAt;
    if (!date) continue;
    const day = date.getDate();
    byDay.set(day, [...(byDay.get(day) ?? []), a]);
  }

  const firstWeekday = monthStart.getDay(); // 0 = Sunday
  const daysInMonth = monthEnd.getTime() === 0 ? 30 : new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const isToday = (day: number) =>
    now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <CalendarDays className="size-5 text-accent" />
          Editorial calendar
        </h1>
        <div className="flex items-center gap-2">
          <Link href={`/admin/calendar?month=${fmt(prev)}`} className="rounded-md border p-1.5 hover:bg-secondary" aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-36 text-center text-sm font-semibold">{monthLabel}</span>
          <Link href={`/admin/calendar?month=${fmt(next)}`} className="rounded-md border p-1.5 hover:bg-secondary" aria-label="Next month">
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Published and scheduled articles. Schedule from the editor's “Schedule publishing” panel.
      </p>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={cn(
              "min-h-24 rounded-lg border p-1.5",
              day === null && "border-transparent",
              day !== null && isToday(day) && "border-accent bg-accent-soft/40"
            )}
          >
            {day !== null && (
              <>
                <p className={cn("text-xs font-medium", isToday(day) ? "text-accent" : "text-muted-foreground")}>
                  {day}
                </p>
                <div className="mt-1 space-y-1">
                  {(byDay.get(day) ?? []).map((a) => (
                    <Link
                      key={a.id}
                      href={`/write/${a.id}`}
                      title={`${a.title} — ${a.author.name}`}
                      className="block truncate rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium hover:bg-accent-soft"
                    >
                      {a.status === "scheduled" && "🕑 "}
                      {a.title}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
        <Badge variant="secondary">🕑 scheduled</Badge>
        <Badge variant="outline">plain = published</Badge>
      </div>
    </div>
  );
}
