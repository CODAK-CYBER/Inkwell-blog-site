import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/articles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/articles",
    "/categories",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/cookies",
  ].map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const [articles, categories] = await Promise.all([
    prisma.article.findMany({
      where: liveWhere(),
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  return [
    ...staticPages,
    ...articles.map((a) => ({
      url: `${siteConfig.url}/articles/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: `${siteConfig.url}/categories/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
