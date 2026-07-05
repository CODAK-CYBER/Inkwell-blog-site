import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = {
  title: "Platform settings — admin",
  robots: { index: false },
};

export default async function AdminSettingsPage() {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) redirect("/admin");

  const settings = await getSettings();
  return <SettingsForm initial={settings} />;
}
