"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { TOPICS } from "@/lib/constants";

export interface OnboardingData {
  topics: string[];
  contentTypes: string[];
  notifications: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
    pushEnabled: boolean;
    weeklyDigest: boolean;
    breakingNews: boolean;
  };
  emailFrequency: string;
  profile: {
    bio?: string;
    website?: string;
    location?: string;
  };
}

export async function completeOnboarding(data: OnboardingData) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const validTopics = new Set(TOPICS.map((t) => t.slug));
  const topics = data.topics.filter((t) => validTopics.has(t as never));

  await prisma.$transaction([
    prisma.userInterest.deleteMany({ where: { userId } }),
    prisma.userInterest.createMany({
      data: topics.map((topic) => ({ userId, topic })),
    }),
    prisma.notificationPreferences.upsert({
      where: { userId },
      create: { userId, ...data.notifications },
      update: data.notifications,
    }),
  ]);

  // User fields go through better-auth so the session cookie cache refreshes
  // immediately (raw prisma updates would read stale for up to 5 minutes).
  await auth.api.updateUser({
    headers: await headers(),
    body: {
      preferredContentTypes: JSON.stringify(data.contentTypes),
      emailFrequency: data.emailFrequency,
      bio: data.profile.bio || undefined,
      website: data.profile.website || undefined,
      location: data.profile.location || undefined,
      onboardingComplete: true,
    },
  });

  redirect("/?welcome=1");
}
