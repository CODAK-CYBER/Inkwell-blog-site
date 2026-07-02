import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { enabledSocialProviders } from "@/lib/social-providers";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { SocialButtons } from "@/components/auth/social-buttons";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your account.",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue reading"
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <SocialButtons providers={enabledSocialProviders()} />
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
