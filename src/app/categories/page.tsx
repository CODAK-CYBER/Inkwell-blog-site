import type { Metadata } from "next";
import Link from "next/link";
import { mockCategories } from "@/lib/mock-data";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Categories",
  description: "Explore every topic we cover, from technology to travel.",
};

export default function CategoriesPage() {
  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Categories</h1>
      <p className="mt-2 text-muted-foreground">
        Follow the topics that matter to you. Personalized feeds arrive in Phase 3.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockCategories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group rounded-xl border bg-card p-6 transition-all hover:border-accent hover:shadow-sm"
          >
            <h2 className="font-serif text-xl font-semibold group-hover:text-accent">
              {category.name}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {category.description}
            </p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
