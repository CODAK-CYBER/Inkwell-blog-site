import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const metadata: Metadata = {
  title: "Welcome — set up your experience",
  robots: { index: false },
};

export default async function OnboardingPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/onboarding");
  if (session.user.onboardingComplete) redirect("/");

  return <OnboardingWizard userName={session.user.name} />;
}
