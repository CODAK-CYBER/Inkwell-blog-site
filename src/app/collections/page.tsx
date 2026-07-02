import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated reading hubs on the topics that matter.",
};

export default async function CollectionsPage() {
  const collections = await prisma.collection.findMany({
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { items: true } } },
  });

  return (
    <Container className="py-14">
      <h1 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
        <Layers className="size-7 text-accent" />
        Collections
      </h1>
      <p className="mt-2 text-muted-foreground">
        Curated reading hubs put together by our editors.
      </p>

      {collections.length > 0 ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.slug}`}
              className="group overflow-hidden rounded-xl border bg-card transition-all hover:border-accent hover:shadow-sm"
            >
              <div
                className="h-28 bg-gradient-to-br from-accent/30 via-accent-soft to-secondary bg-cover bg-center"
                style={c.coverImage ? { backgroundImage: `url(${c.coverImage})` } : undefined}
              />
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg font-semibold group-hover:text-accent">
                    {c.name}
                  </h2>
                  {c.featured && <Badge variant="accent">Featured</Badge>}
                </div>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                )}
                <p className="mt-3 text-xs font-medium text-muted-foreground">
                  {c._count.items} article{c._count.items === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No collections yet — editors can create them in the admin panel.
        </p>
      )}
    </Container>
  );
}
