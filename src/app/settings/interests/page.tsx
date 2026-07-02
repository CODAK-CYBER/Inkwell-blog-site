import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { InterestsForm } from "@/components/settings/interests-form";

export const metadata: Metadata = {
  title: "Interests",
  robots: { index: false },
};

export default async function InterestsSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/settings/interests");

  const [interests, categories] = await Promise.all([
    prisma.userInterest.findMany({ where: { userId: session.user.id } }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, icon: true },
    }),
  ]);

  let contentTypes: string[] = ["articles"];
  try {
    if (session.user.preferredContentTypes) {
      contentTypes = JSON.parse(session.user.preferredContentTypes);
    }
  } catch {
    // keep default
  }

  return (
    <InterestsForm
      categories={categories}
      initialTopics={interests.map((i) => i.topic)}
      initialContentTypes={contentTypes}
    />
  );
}
