import { AlertTriangle, Info, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

/** Sitewide banner for the newest active announcement flagged showBanner. */
export async function AnnouncementBanner() {
  const announcement = await prisma.announcement.findFirst({
    where: {
      active: true,
      showBanner: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (!announcement) return null;

  const Icon =
    announcement.level === "critical"
      ? AlertTriangle
      : announcement.level === "warning"
        ? Info
        : Megaphone;

  return (
    <div
      className={cn(
        "border-b",
        announcement.level === "critical"
          ? "bg-destructive text-destructive-foreground"
          : announcement.level === "warning"
            ? "bg-accent-soft"
            : "bg-card"
      )}
    >
      <Container className="flex items-center gap-2 py-1.5 text-sm">
        <Icon className="size-4 shrink-0" />
        <span className="font-semibold">{announcement.title}</span>
        <span
          className={cn(
            "min-w-0 truncate",
            announcement.level === "critical" ? "opacity-90" : "text-muted-foreground"
          )}
        >
          {announcement.body}
        </span>
      </Container>
    </div>
  );
}
