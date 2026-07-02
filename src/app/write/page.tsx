import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { canPublish, canWrite } from "@/lib/rbac";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { ArticleEditor } from "@/components/editor/article-editor";

export const metadata: Metadata = {
  title: "Write",
  robots: { index: false },
};

export default async function WritePage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/write");

  if (!canWrite(session.user.role)) {
    return (
      <Container className="flex flex-col items-center py-24 text-center">
        <h1 className="text-2xl font-bold">Become an author to start writing</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Your account is currently a reader account. Upgrade it in one click —
          your articles will go through editorial review before publishing.
        </p>
        <Link href="/settings" className={buttonVariants({ variant: "accent" }) + " mt-6"}>
          Go to Settings
        </Link>
      </Container>
    );
  }

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <ArticleEditor
      categories={categories}
      initial={null}
      canPublish={canPublish(session.user.role)}
    />
  );
}
