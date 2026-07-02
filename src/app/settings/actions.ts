"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { APIError } from "better-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

// User-table fields are updated via better-auth (not raw prisma) so the
// session cookie cache refreshes immediately instead of after its 5-min TTL.

async function requireUserId() {
  const session = await getServerSession();
  if (!session) throw new Error("Not signed in");
  return session.user.id;
}

export async function updateProfile(data: {
  name: string;
  username: string;
  bio: string;
  website: string;
  location: string;
  image: string;
  coverImage: string;
  socialLinks: Record<string, string>;
}) {
  await requireUserId();

  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(data.username)) {
    return { error: "Username must be 3–30 characters (letters, numbers, . _ -)." };
  }

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: data.name.trim() || undefined,
        username: data.username,
        bio: data.bio.trim() || undefined,
        website: data.website.trim() || undefined,
        location: data.location.trim() || undefined,
        image: data.image.trim() || undefined,
        coverImage: data.coverImage.trim() || undefined,
        socialLinks: JSON.stringify(data.socialLinks),
      },
    });
  } catch (err) {
    if (err instanceof APIError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function updateLocale(data: { language: string; timezone: string }) {
  await requireUserId();
  await auth.api.updateUser({
    headers: await headers(),
    body: { language: data.language, timezone: data.timezone },
  });
  revalidatePath("/settings/account");
  return { success: true };
}

export async function updateNotifications(data: {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  weeklyDigest: boolean;
  breakingNews: boolean;
  newFollower: boolean;
  newLoginAlert: boolean;
  emailFrequency: string;
}) {
  const userId = await requireUserId();
  const { emailFrequency, ...prefs } = data;
  await prisma.notificationPreferences.upsert({
    where: { userId },
    create: { userId, ...prefs },
    update: prefs,
  });
  await auth.api.updateUser({
    headers: await headers(),
    body: { emailFrequency },
  });
  revalidatePath("/settings/notifications");
  return { success: true };
}

/** Update interest topics and preferred content formats anytime. */
export async function updateInterests(data: { topics: string[]; contentTypes: string[] }) {
  const userId = await requireUserId();
  if (data.topics.length < 1) return { error: "Pick at least one topic." };

  await prisma.$transaction([
    prisma.userInterest.deleteMany({ where: { userId } }),
    prisma.userInterest.createMany({
      data: data.topics.map((topic) => ({ userId, topic })),
    }),
  ]);
  await auth.api.updateUser({
    headers: await headers(),
    body: { preferredContentTypes: JSON.stringify(data.contentTypes) },
  });

  revalidatePath("/settings/interests");
  revalidatePath("/");
  return { success: true };
}

/** Self-serve upgrade: regular readers can opt in to become authors. */
export async function becomeAuthor() {
  const session = await getServerSession();
  if (!session) throw new Error("Not signed in");
  const role = session.user.role;
  if (role !== "user" && role !== "premium") {
    return { error: "Your account already has a writing or staff role." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: role === "premium" ? "author" : "author" },
  });
  // Touch the user via better-auth so the session cookie cache picks up the new role.
  await auth.api.updateUser({
    headers: await headers(),
    body: { name: session.user.name },
  });

  const { logActivity } = await import("@/lib/activity");
  await logActivity({
    userId: session.user.id,
    action: "user.became_author",
    targetType: "user",
    targetId: session.user.id,
    detail: session.user.email,
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function updatePrivacy(data: {
  profileVisibility: string;
  showReadingActivity: boolean;
}) {
  await requireUserId();
  await auth.api.updateUser({
    headers: await headers(),
    body: {
      profileVisibility: data.profileVisibility === "private" ? "private" : "public",
      showReadingActivity: data.showReadingActivity,
    },
  });
  revalidatePath("/settings/privacy");
  return { success: true };
}
