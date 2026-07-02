import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { ProfileForm } from "@/components/settings/profile-form";
import { BecomeAuthor } from "@/components/settings/become-author";

export const metadata: Metadata = {
  title: "Profile settings",
  robots: { index: false },
};

export default async function ProfileSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/settings");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  let socialLinks: Record<string, string> = {};
  try {
    socialLinks = user.socialLinks ? JSON.parse(user.socialLinks) : {};
  } catch {
    // ignore corrupt json
  }

  const canBecomeAuthor = user.role === "user" || user.role === "premium";

  return (
    <div className="space-y-6">
      <ProfileForm
        initial={{
          name: user.name,
          username: user.displayUsername ?? user.username ?? "",
          bio: user.bio ?? "",
          website: user.website ?? "",
          location: user.location ?? "",
          image: user.image ?? "",
          coverImage: user.coverImage ?? "",
          socialLinks,
        }}
      />
      {canBecomeAuthor && <BecomeAuthor />}
    </div>
  );
}
