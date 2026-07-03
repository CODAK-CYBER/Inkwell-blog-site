import { prisma } from "@/lib/prisma";
import { articleInclude, liveWhere } from "@/lib/articles";
import { siteConfig } from "@/lib/site";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 feed of the latest published articles. */
export async function GET() {
  const articles = await prisma.article.findMany({
    where: liveWhere(),
    include: articleInclude,
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  const items = articles
    .map(
      (a) => `    <item>
      <title>${escape(a.title)}</title>
      <link>${siteConfig.url}/articles/${a.slug}</link>
      <guid isPermaLink="true">${siteConfig.url}/articles/${a.slug}</guid>
      <description>${escape(a.excerpt)}</description>
      <author>${escape(a.author.name)}</author>
      ${a.category ? `<category>${escape(a.category.name)}</category>` : ""}
      <pubDate>${(a.publishedAt ?? a.createdAt).toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(siteConfig.name)}</title>
    <link>${siteConfig.url}</link>
    <description>${escape(siteConfig.description)}</description>
    <language>en</language>
    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
