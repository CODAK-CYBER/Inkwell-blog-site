import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { AdsManager } from "@/components/admin/ads-manager";

export const metadata: Metadata = {
  title: "Advertisements — admin",
  robots: { index: false },
};

export default async function AdminAdsPage() {
  const session = await getServerSession();
  if (!session || !hasPermission(session.user.role, { ads: ["manage"] })) redirect("/admin");

  const ads = await prisma.ad.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <AdsManager
      ads={ads.map((ad) => ({
        id: ad.id,
        name: ad.name,
        placement: ad.placement,
        imageUrl: ad.imageUrl ?? "",
        html: ad.html ?? "",
        targetUrl: ad.targetUrl ?? "",
        weight: ad.weight,
        active: ad.active,
        startsAt: ad.startsAt?.toISOString().slice(0, 16) ?? "",
        endsAt: ad.endsAt?.toISOString().slice(0, 16) ?? "",
        impressions: ad.impressions,
        clicks: ad.clicks,
      }))}
    />
  );
}
