import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { AffiliatesManager } from "@/components/admin/affiliates-manager";

export const metadata: Metadata = {
  title: "Affiliate links — admin",
  robots: { index: false },
};

export default async function AdminAffiliatesPage() {
  const session = await getServerSession();
  if (!session || !hasPermission(session.user.role, { ads: ["manage"] })) redirect("/admin");

  const links = await prisma.affiliateLink.findMany({ orderBy: { clicks: "desc" } });

  return (
    <AffiliatesManager
      links={links.map((l) => ({
        id: l.id,
        name: l.name,
        code: l.code,
        targetUrl: l.targetUrl,
        clicks: l.clicks,
      }))}
    />
  );
}
