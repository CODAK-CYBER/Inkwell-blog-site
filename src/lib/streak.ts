import { prisma } from "@/lib/prisma";

/**
 * Reading streak: consecutive calendar days (ending today or yesterday)
 * with at least one reading-history entry.
 */
export async function getReadingStreak(userId: string): Promise<number> {
  const history = await prisma.readingHistory.findMany({
    where: { userId },
    select: { readAt: true },
    orderBy: { readAt: "desc" },
    take: 400,
  });
  if (history.length === 0) return 0;

  const days = new Set(
    history.map((h) => {
      const d = h.readAt;
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const cursor = new Date();

  // Streak survives if the user hasn't read *yet* today.
  if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  if (!days.has(key(cursor))) return 0;

  let streak = 0;
  while (days.has(key(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
