import type { Metadata } from "next";
import Link from "next/link";
import { enabledSocialProviders } from "@/lib/social-providers";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { SocialButtons } from "@/components/auth/social-buttons";

export const metadata: Metadata = {
  title: "Create account",
  description: "Join and get a personalized reading experience.",
  robots: { index: false },
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Free forever. Personalized from day one."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SocialButtons providers={enabledSocialProviders()} callbackURL="/onboarding" />
      <RegisterForm />
    </AuthCard>
  );
}
