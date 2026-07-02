import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { AccountForms } from "@/components/settings/account-forms";

export const metadata: Metadata = {
  title: "Account settings",
  robots: { index: false },
};

export default async function AccountSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/settings/account");

  return (
    <AccountForms
      email={session.user.email}
      language={session.user.language ?? "en"}
      timezone={session.user.timezone ?? "UTC"}
    />
  );
}
