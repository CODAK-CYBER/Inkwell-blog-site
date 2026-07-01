/**
 * Core domain types. In Phase 1 these are backed by mock data;
 * from Phase 4 onward they map to the database schema.
 */

export interface Author {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  bio?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string;
  category: Category;
  author: Author;
  tags: string[];
  publishedAt: string;
  readingTimeMinutes: number;
  featured?: boolean;
}
