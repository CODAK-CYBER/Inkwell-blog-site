import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getServerSession } from "@/lib/session";
import { enabledSocialProviders } from "@/lib/social-providers";
import { PrivacyForm } from "@/components/settings/privacy-form";
import { ConnectedAccounts } from "@/components/settings/connected-accounts";
import { DangerZone } from "@/components/settings/danger-zone";

export const metadata: Metadata = {
  title: "Privacy & data",
  robots: { index: false },
};

export default async function PrivacySettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/settings/privacy");

  const accounts = await auth.api.listUserAccounts({ headers: await headers() });

  return (
    <div className="space-y-6">
      <PrivacyForm
        initial={{
          profileVisibility: session.user.profileVisibility ?? "public",
          showReadingActivity: session.user.showReadingActivity ?? true,
        }}
      />
      <ConnectedAccounts
        connected={accounts.map((a) => a.providerId)}
        available={enabledSocialProviders()}
      />
      <DangerZone />
    </div>
  );
}
