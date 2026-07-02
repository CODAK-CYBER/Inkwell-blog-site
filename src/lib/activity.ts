import { prisma } from "@/lib/prisma";

/** Best-effort audit trail — never throws into the calling flow. */
export async function logActivity(entry: {
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: string;
}) {
  try {
    await prisma.activityLog.create({ data: entry });
  } catch (err) {
    console.error("activity log failed:", err);
  }
}
