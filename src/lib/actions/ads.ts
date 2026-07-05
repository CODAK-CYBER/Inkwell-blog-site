"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/utils";

async function requireAdManager() {
  const session = await getServerSession();
  if (!session || !hasPermission(session.user.role, { ads: ["manage"] })) {
    throw new Error("Not permitted");
  }
  return session;
}

// ---------------- Ads ----------------

export interface AdInput {
  name: string;
  placement: string; // home_banner | article_bottom
  imageUrl?: string;
  html?: string;
  targetUrl?: string;
  weight?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export async function saveAd(input: AdInput, id?: string) {
  const session = await requireAdManager();
  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  if (!input.imageUrl?.trim() && !input.html?.trim()) {
    return { error: "Provide an image URL or embed HTML." };
  }

  const parse = (v?: string | null) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const data = {
    name,
    placement: ["home_banner", "article_bottom"].includes(input.placement)
      ? input.placement
      : "home_banner",
    imageUrl: input.imageUrl?.trim() || null,
    html: input.html?.trim() || null,
    targetUrl: input.targetUrl?.trim() || null,
    weight: Math.max(1, Math.min(10, input.weight ?? 1)),
    startsAt: parse(input.startsAt),
    endsAt: parse(input.endsAt),
  };

  if (id) await prisma.ad.update({ where: { id }, data });
  else await prisma.ad.create({ data });

  await logActivity({
    userId: session.user.id,
    action: id ? "ad.updated" : "ad.created",
    targetType: "ad",
    detail: name,
  });
  revalidatePath("/admin/ads");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function toggleAd(id: string) {
  await requireAdManager();
  const ad = await prisma.ad.findUnique({ where: { id } });
  if (!ad) return { error: "Not found." };
  await prisma.ad.update({ where: { id }, data: { active: !ad.active } });
  revalidatePath("/admin/ads");
  revalidatePath("/", "layout");
  return { active: !ad.active };
}

export async function deleteAd(id: string) {
  const session = await requireAdManager();
  const ad = await prisma.ad.delete({ where: { id } });
  await logActivity({ userId: session.user.id, action: "ad.deleted", targetType: "ad", detail: ad.name });
  revalidatePath("/admin/ads");
  revalidatePath("/", "layout");
  return { success: true };
}

// ---------------- Affiliate links ----------------

export async function saveAffiliateLink(input: { name: string; code?: string; targetUrl: string }, id?: string) {
  const session = await requireAdManager();
  const name = input.name.trim();
  const targetUrl = input.targetUrl.trim();
  if (!name || !targetUrl) return { error: "Name and target URL are required." };
  if (!/^https?:\/\//.test(targetUrl)) return { error: "Target must be a full http(s) URL." };

  const code = slugify(input.code || name);
  try {
    if (id) {
      await prisma.affiliateLink.update({ where: { id }, data: { name, code, targetUrl } });
    } else {
      await prisma.affiliateLink.create({ data: { name, code, targetUrl } });
    }
  } catch {
    return { error: "That code is already in use." };
  }
  await logActivity({
    userId: session.user.id,
    action: id ? "affiliate.updated" : "affiliate.created",
    detail: `${name} (/go/${code})`,
  });
  revalidatePath("/admin/affiliates");
  return { success: true, code };
}

export async function deleteAffiliateLink(id: string) {
  const session = await requireAdManager();
  const link = await prisma.affiliateLink.delete({ where: { id } });
  await logActivity({ userId: session.user.id, action: "affiliate.deleted", detail: link.name });
  revalidatePath("/admin/affiliates");
  return { success: true };
}
