/**
 * Dev seed: creates categories (from the topic list) and migrates the
 * Phase 1 mock articles into the database, authored by the first
 * admin/superadmin user. Idempotent — safe to run repeatedly.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Technology", slug: "technology", icon: "💻", description: "Software, AI, gadgets and the future of computing." },
  { name: "AI", slug: "ai", icon: "🤖", description: "Machine intelligence, models, and their impact." },
  { name: "Business", slug: "business", icon: "📈", description: "Startups, markets, strategy and the world of work." },
  { name: "Finance", slug: "finance", icon: "💰", description: "Money, investing, and economic trends." },
  { name: "Health", slug: "health", icon: "🩺", description: "Wellness, medicine, fitness and living better." },
  { name: "Science", slug: "science", icon: "🔬", description: "Discoveries, research and how the universe works." },
  { name: "Sports", slug: "sports", icon: "🏆", description: "Games, athletes, and the business of sport." },
  { name: "Entertainment", slug: "entertainment", icon: "🎬", description: "Film, TV, music and celebrity culture." },
  { name: "Politics", slug: "politics", icon: "🏛️", description: "Policy, power, and public life." },
  { name: "Travel", slug: "travel", icon: "✈️", description: "Destinations, guides and stories from the road." },
  { name: "Education", slug: "education", icon: "🎓", description: "Learning, schools, and skills for the future." },
  { name: "Culture", slug: "culture", icon: "🎨", description: "Books, art and the ideas shaping society." },
];

const placeholderBody = (title: string, teaser: string) => `${teaser}

## Why this matters

This is seeded placeholder content so the platform has real database-backed articles to work with. Replace it by editing the article in the admin panel or the editor at **/write**.

- Real articles support **markdown**: headings, lists, quotes, links and code.
- Cover images, tags, SEO fields and scheduling are all available in the editor.

> "Stories worth your time, written by people who care."

\`\`\`ts
// Even code blocks work
const platform = "Inkwell";
\`\`\`

## What comes next

The editorial workflow routes drafts from authors to editors for review, and on to publication — exactly like a professional newsroom.`;

const ARTICLES = [
  {
    title: "The Quiet Revolution in Personal Computing",
    slug: "quiet-revolution-personal-computing",
    excerpt: "A new generation of on-device AI is changing what our laptops and phones can do — without ever touching the cloud.",
    category: "technology",
    tags: ["ai", "hardware", "privacy"],
    featured: true,
    publishedAt: "2026-06-28",
  },
  {
    title: "Why the Four-Day Workweek Finally Stuck",
    slug: "four-day-workweek-finally-stuck",
    excerpt: "After a decade of pilots and false starts, shorter weeks are becoming the default at some of the world's biggest employers.",
    category: "business",
    tags: ["work", "productivity"],
    featured: true,
    publishedAt: "2026-06-27",
  },
  {
    title: "The Films Rewriting the Rules of Streaming",
    slug: "films-rewriting-rules-of-streaming",
    excerpt: "Independent cinema found an unlikely savior in the very platforms once accused of killing it.",
    category: "entertainment",
    tags: ["film", "streaming"],
    publishedAt: "2026-06-26",
  },
  {
    title: "Inside the Lab Growing Coral Faster Than the Ocean Can",
    slug: "lab-growing-coral-faster-than-ocean",
    excerpt: "Marine biologists have cut coral maturation time from decades to years. The reefs may have a fighting chance.",
    category: "science",
    tags: ["climate", "oceans"],
    publishedAt: "2026-06-25",
  },
  {
    title: "What Sleep Scientists Wish You Knew About Rest",
    slug: "what-sleep-scientists-wish-you-knew",
    excerpt: "Forget the eight-hour rule. The latest research points to rhythm, consistency, and one surprisingly simple habit.",
    category: "health",
    tags: ["sleep", "wellness"],
    publishedAt: "2026-06-24",
  },
  {
    title: "Slow Trains Through the Alps: A Journey Worth Taking",
    slug: "slow-trains-through-the-alps",
    excerpt: "Flying is faster. But on the rails between Zurich and Milan, faster misses the point entirely.",
    category: "travel",
    tags: ["europe", "rail"],
    publishedAt: "2026-06-23",
  },
];

async function main() {
  for (const [i, c] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { ...c, sortOrder: i },
      update: { icon: c.icon, description: c.description, sortOrder: i },
    });
  }
  console.log(`✓ ${CATEGORIES.length} categories`);

  const author = await prisma.user.findFirst({
    where: { role: { in: ["superadmin", "admin", "editor", "author"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!author) {
    console.log("! No admin/author user found — register an account first, then re-run the seed.");
    return;
  }

  for (const a of ARTICLES) {
    const category = await prisma.category.findUnique({ where: { slug: a.category } });
    const article = await prisma.article.upsert({
      where: { slug: a.slug },
      create: {
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        content: placeholderBody(a.title, a.excerpt),
        status: "published",
        featured: a.featured ?? false,
        readingTime: 4,
        publishedAt: new Date(a.publishedAt),
        authorId: author.id,
        categoryId: category?.id,
        views: Math.floor(Math.random() * 400) + 50,
      },
      update: {},
    });

    for (const tagName of a.tags) {
      const tag = await prisma.tag.upsert({
        where: { slug: tagName },
        create: { name: tagName, slug: tagName },
        update: {},
      });
      await prisma.articleTag.upsert({
        where: { articleId_tagId: { articleId: article.id, tagId: tag.id } },
        create: { articleId: article.id, tagId: tag.id },
        update: {},
      });
    }
  }
  console.log(`✓ ${ARTICLES.length} articles (author: ${author.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
