import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { TwoFactorForm } from "@/components/auth/two-factor-form";

export const metadata: Metadata = {
  title: "Two-factor authentication",
  robots: { index: false },
};

export default function TwoFactorPage() {
  return (
    <AuthCard
      title="Two-factor authentication"
      subtitle="Enter the 6-digit code from your authenticator app"
    >
      <TwoFactorForm />
    </AuthCard>
  );
}
