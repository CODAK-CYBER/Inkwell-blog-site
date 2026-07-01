import type { Article, Author, Category } from "@/types";

/**
 * Placeholder content used to visualize the skeleton in Phase 1.
 * Replaced by real database content in Phase 4.
 */

export const mockAuthors: Author[] = [
  { id: "1", name: "Amara Okafor", slug: "amara-okafor", bio: "Senior technology correspondent." },
  { id: "2", name: "Daniel Reyes", slug: "daniel-reyes", bio: "Business and markets editor." },
  { id: "3", name: "Sofia Lindqvist", slug: "sofia-lindqvist", bio: "Culture writer and critic." },
  { id: "4", name: "Kwame Mensah", slug: "kwame-mensah", bio: "Science and health reporter." },
];

export const mockCategories: Category[] = [
  { id: "1", name: "Technology", slug: "technology", description: "Software, AI, gadgets and the future of computing." },
  { id: "2", name: "Business", slug: "business", description: "Startups, markets, strategy and the world of work." },
  { id: "3", name: "Culture", slug: "culture", description: "Film, music, books, art and the ideas shaping society." },
  { id: "4", name: "Science", slug: "science", description: "Discoveries, research and how the universe works." },
  { id: "5", name: "Health", slug: "health", description: "Wellness, medicine, fitness and living better." },
  { id: "6", name: "Travel", slug: "travel", description: "Destinations, guides and stories from the road." },
];

export const mockArticles: Article[] = [
  {
    id: "1",
    title: "The Quiet Revolution in Personal Computing",
    slug: "quiet-revolution-personal-computing",
    excerpt:
      "A new generation of on-device AI is changing what our laptops and phones can do — without ever touching the cloud.",
    category: mockCategories[0],
    author: mockAuthors[0],
    tags: ["ai", "hardware", "privacy"],
    publishedAt: "2026-06-28",
    readingTimeMinutes: 8,
    featured: true,
  },
  {
    id: "2",
    title: "Why the Four-Day Workweek Finally Stuck",
    slug: "four-day-workweek-finally-stuck",
    excerpt:
      "After a decade of pilots and false starts, shorter weeks are becoming the default at some of the world's biggest employers.",
    category: mockCategories[1],
    author: mockAuthors[1],
    tags: ["work", "productivity"],
    publishedAt: "2026-06-27",
    readingTimeMinutes: 6,
    featured: true,
  },
  {
    id: "3",
    title: "The Films Rewriting the Rules of Streaming",
    slug: "films-rewriting-rules-of-streaming",
    excerpt:
      "Independent cinema found an unlikely savior in the very platforms once accused of killing it.",
    category: mockCategories[2],
    author: mockAuthors[2],
    tags: ["film", "streaming"],
    publishedAt: "2026-06-26",
    readingTimeMinutes: 7,
  },
  {
    id: "4",
    title: "Inside the Lab Growing Coral Faster Than the Ocean Can",
    slug: "lab-growing-coral-faster-than-ocean",
    excerpt:
      "Marine biologists have cut coral maturation time from decades to years. The reefs may have a fighting chance.",
    category: mockCategories[3],
    author: mockAuthors[3],
    tags: ["climate", "oceans"],
    publishedAt: "2026-06-25",
    readingTimeMinutes: 10,
  },
  {
    id: "5",
    title: "What Sleep Scientists Wish You Knew About Rest",
    slug: "what-sleep-scientists-wish-you-knew",
    excerpt:
      "Forget the eight-hour rule. The latest research points to rhythm, consistency, and one surprisingly simple habit.",
    category: mockCategories[4],
    author: mockAuthors[3],
    tags: ["sleep", "wellness"],
    publishedAt: "2026-06-24",
    readingTimeMinutes: 5,
  },
  {
    id: "6",
    title: "Slow Trains Through the Alps: A Journey Worth Taking",
    slug: "slow-trains-through-the-alps",
    excerpt:
      "Flying is faster. But on the rails between Zurich and Milan, faster misses the point entirely.",
    category: mockCategories[5],
    author: mockAuthors[2],
    tags: ["europe", "rail"],
    publishedAt: "2026-06-23",
    readingTimeMinutes: 9,
  },
];
